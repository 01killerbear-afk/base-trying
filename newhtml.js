import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firebase configuration for this page
const firebaseConfig = {
  apiKey: "AIzaSyCrGB_L_18KW1ANjj70-CTlnuXMmoNbIN4",
  authDomain: "training-app-8e422.firebaseapp.com",
  projectId: "training-app-8e422",
  storageBucket: "training-app-8e422.firebasestorage.app",
  messagingSenderId: "639003722761",
  appId: "1:639003722761:web:7a8689e114e31698eea4d8",
  measurementId: "G-ZB0422TCGK"
};

const app = initializeApp(firebaseConfig);
window.db = getFirestore(app);

// --- Global Caches for Editing ---
let loadedCourses = [];
let loadedReadings = [];
let loadedQuizzes = [];

// --- State Management ---
let quizQuestionsBuffer = [];
let currentQuizIndex = 0;
let currentQuizEditingId = null;
let quizImageBase64 = "";

let readingPagesBuffer = [];
let currentReadingIndex = 0;
let currentReadingEditingId = null;
let readingImageBase64 = "";

let currentHtmlEditingId = null;

// --- Image Handlers ---
function compressImageAndGetBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.7 quality to keep screenshots small for Firestore
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressedDataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Image Handlers (with automatic compression) ---
document.getElementById("quiz-image-upload").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) {
        quizImageBase64 = "";
        return;
    }
    compressImageAndGetBase64(file, (compressedBase64) => {
        quizImageBase64 = compressedBase64;
        const preview = document.getElementById("quiz-image-preview");
        preview.src = quizImageBase64;
        preview.style.display = "block";
    });
});

document.getElementById("reading-image-upload").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) {
        readingImageBase64 = "";
        return;
    }
    compressImageAndGetBase64(file, (compressedBase64) => {
        readingImageBase64 = compressedBase64;
        const preview = document.getElementById("reading-image-preview");
        preview.src = readingImageBase64;
        preview.style.display = "block";
    });
});

// --- QUIZ BUILDER LOGIC ---
function loadCurrentQuizQuestionToDOM() {
    if (quizQuestionsBuffer.length === 0) {
        quizQuestionsBuffer.push({ question: "", options: ["", "", "", ""], answer: 0, explanation: "", image: "", page: "" });
    }
    
    if (currentQuizIndex < 0) currentQuizIndex = 0;
    if (currentQuizIndex >= quizQuestionsBuffer.length) currentQuizIndex = quizQuestionsBuffer.length - 1;

    const q = quizQuestionsBuffer[currentQuizIndex];
    document.getElementById("quiz-question").value = q.question || "";
    document.getElementById("quiz-option-0").value = q.options[0] || "";
    document.getElementById("quiz-option-1").value = q.options[1] || "";
    document.getElementById("quiz-option-2").value = q.options[2] || "";
    document.getElementById("quiz-option-3").value = q.options[3] || "";
    document.getElementById("quiz-answer-select").value = q.answer !== undefined ? q.answer : 0;
    document.getElementById("quiz-explanation").value = q.explanation || "";
    
    const pageInput = document.getElementById("question-page-ref");
    if (q.page !== undefined && q.page !== "" && !isNaN(q.page)) {
        pageInput.value = Number(q.page) + 1;
    } else {
        pageInput.value = "";
    }

    quizImageBase64 = q.image || "";
    const preview = document.getElementById("quiz-image-preview");
    if (quizImageBase64) {
        preview.src = quizImageBase64;
        preview.style.display = "block";
    } else {
        preview.src = "";
        preview.style.display = "none";
        document.getElementById("quiz-image-upload").value = "";
    }

    document.getElementById("quiz-counter").innerText = `Question ${currentQuizIndex + 1} of ${quizQuestionsBuffer.length}`;
}

function saveCurrentQuizFormState() {
    const pageVal = document.getElementById("question-page-ref").value.trim();
    
    quizQuestionsBuffer[currentQuizIndex] = {
        question: document.getElementById("quiz-question").value.trim(),
        options: [
            document.getElementById("quiz-option-0").value.trim(),
            document.getElementById("quiz-option-1").value.trim(),
            document.getElementById("quiz-option-2").value.trim(),
            document.getElementById("quiz-option-3").value.trim()
        ],
        answer: parseInt(document.getElementById("quiz-answer-select").value, 10),
        explanation: document.getElementById("quiz-explanation").value.trim(),
        image: quizImageBase64,
        page: pageVal !== "" ? parseInt(pageVal, 10) - 1 : ""
    };
}

document.getElementById("next-question-btn").addEventListener("click", () => {
    saveCurrentQuizFormState();
    currentQuizIndex++;
    if (currentQuizIndex >= quizQuestionsBuffer.length) {
        quizQuestionsBuffer.push({ question: "", options: ["", "", "", ""], answer: 0, explanation: "", image: "", page: "" });
    }
    loadCurrentQuizQuestionToDOM();
});

document.getElementById("prev-question-btn").addEventListener("click", () => {
    if (currentQuizIndex > 0) {
        saveCurrentQuizFormState();
        currentQuizIndex--;
        loadCurrentQuizQuestionToDOM();
    }
});

document.getElementById("save-quiz-btn").addEventListener("click", async () => {
    saveCurrentQuizFormState();
    const title = document.getElementById("quiz-title").value.trim();
    if (!title) { alert("Please enter a quiz name."); return; }

    if (quizQuestionsBuffer.length === 0) {
        alert("Please add at least one question before saving.");
        return;
    }

    try {
        if (currentQuizEditingId) {
            const quizRef = doc(window.db, "quizzes", currentQuizEditingId);
            await updateDoc(quizRef, {
                title: title,
                questions: quizQuestionsBuffer
            });
            alert("Quiz successfully updated!");
        } else {
            await addDoc(collection(window.db, "quizzes"), {
                title,
                questions: quizQuestionsBuffer,
                createdAt: new Date().toISOString()
            });
            alert("Quiz successfully saved with " + quizQuestionsBuffer.length + " questions!");
        }
        currentQuizEditingId = null;
        loadTable();
    } catch (error) {
        console.error("Error saving quiz to Firestore:", error);
        alert("Failed to save quiz.");
    }
});

// --- READING BUILDER LOGIC ---
function loadCurrentReadingPageToDOM() {
    if (readingPagesBuffer.length === 0) {
        readingPagesBuffer.push({ content: "", image: "" });
    }
    
    if (currentReadingIndex < 0) currentReadingIndex = 0;
    if (currentReadingIndex >= readingPagesBuffer.length) currentReadingIndex = readingPagesBuffer.length - 1;

    const pageData = readingPagesBuffer[currentReadingIndex];
    document.getElementById("reading-data").value = pageData.content || "";
    
    readingImageBase64 = pageData.image || "";
    const preview = document.getElementById("reading-image-preview");
    if (readingImageBase64) {
        preview.src = readingImageBase64;
        preview.style.display = "block";
    } else {
        preview.src = "";
        preview.style.display = "none";
        document.getElementById("reading-image-upload").value = "";
    }

    document.getElementById("reading-counter").innerText = `Page ${currentReadingIndex + 1} of ${readingPagesBuffer.length}`;
}

function saveCurrentReadingFormState() {
    readingPagesBuffer[currentReadingIndex] = {
        content: document.getElementById("reading-data").value.trim(),
        image: readingImageBase64
    };
}

document.getElementById("next-page-btn").addEventListener("click", () => {
    saveCurrentReadingFormState();
    currentReadingIndex++;
    if (currentReadingIndex >= readingPagesBuffer.length) {
        readingPagesBuffer.push({ content: "", image: "" });
    }
    loadCurrentReadingPageToDOM();
});

document.getElementById("prev-page-btn").addEventListener("click", () => {
    if (currentReadingIndex > 0) {
        saveCurrentReadingFormState();
        currentReadingIndex--;
        loadCurrentReadingPageToDOM();
    }
});

document.getElementById("save-reading-btn").addEventListener("click", async () => {
    saveCurrentReadingFormState();
    const title = document.getElementById("reading-title").value.trim();
    if (!title) { alert("Please enter a reading title."); return; }

    try {
        if (currentReadingEditingId) {
            const readingRef = doc(window.db, "readings", currentReadingEditingId);
            await updateDoc(readingRef, {
                title: title,
                pages: readingPagesBuffer
            });
            alert("Reading material successfully updated!");
        } else {
            await addDoc(collection(window.db, "readings"), {
                title,
                pages: readingPagesBuffer,
                createdAt: new Date().toISOString()
            });
            alert("Reading material successfully saved!");
        }
        currentReadingEditingId = null;
        loadTable();
    } catch (error) {
        console.error("Error saving reading to Firestore:", error);
        alert("Failed to save reading.");
    }
});

// --- HTML COURSE BUILDER LOGIC ---
document.getElementById("save-html-btn").addEventListener("click", async () => {
    const title = document.getElementById("html-title").value.trim();
    const html = document.getElementById("html-data").value.trim();

    if (!title) { alert("Please enter a course name."); return; }

    try {
        if (currentHtmlEditingId) {
            const courseRef = doc(window.db, "courses", currentHtmlEditingId);
            await updateDoc(courseRef, {
                title: title,
                html: html
            });
            alert("Course updated successfully.");
        } else {
            await addDoc(collection(window.db, "courses"), {
                title,
                html,
                quizzes: [],
                readings: []
            });
            alert("Course saved successfully.");
        }
        currentHtmlEditingId = null;
        loadTable();
    } catch (error) {
        console.error("Error saving course to Firestore:", error);
        alert("Failed to save course.");
    }
});

// --- TABLE MANAGEMENT & EDITING HOOKS ---
async function loadTable() {
    const table = document.getElementById("courseTable");
    table.innerHTML = "<tr><td colspan='4'>Loading data from cloud...</td></tr>";

    try {
        const courseSnapshot = await getDocs(collection(window.db, "courses"));
        const readingSnapshot = await getDocs(collection(window.db, "readings"));
        const quizSnapshot = await getDocs(collection(window.db, "quizzes"));

        loadedCourses = [];
        loadedReadings = [];
        loadedQuizzes = [];

        table.innerHTML = "";

        // Helper to append rows safely with event listeners
        courseSnapshot.forEach(docSnap => {
            const course = { id: docSnap.id, ...docSnap.data() };
            loadedCourses.push(course);
            if (!course.html && !course.title) return;
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><a href="dynamic-course.html?course=${encodeURIComponent(course.title)}" target="_blank">[Course] ${course.title}</a></td>
                <td>${course.readings ? course.readings.length : 0}</td>
                <td>${course.quizzes ? course.quizzes.length : 0}</td>
                <td class="action-cell"></td>
            `;
            const actionCell = row.querySelector(".action-cell");
            
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () => editHtmlCourse(course.id);
            
            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.onclick = () => deleteItem('courses', course.id);
            
            actionCell.appendChild(editBtn);
            actionCell.appendChild(delBtn);
            table.appendChild(row);
        });

        readingSnapshot.forEach(docSnap => {
            const read = { id: docSnap.id, ...docSnap.data() };
            loadedReadings.push(read);
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>[Reading] ${read.title}</td>
                <td>${read.pages ? read.pages.length : 1} Pages</td>
                <td>0</td>
                <td class="action-cell"></td>
            `;
            const actionCell = row.querySelector(".action-cell");
            
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () => editReading(read.id);
            
            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.onclick = () => deleteItem('readings', read.id);
            
            actionCell.appendChild(editBtn);
            actionCell.appendChild(delBtn);
            table.appendChild(row);
        });

        quizSnapshot.forEach(docSnap => {
            const quiz = { id: docSnap.id, ...docSnap.data() };
            loadedQuizzes.push(quiz);
            if (!quiz.questions) return;
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>[Quiz] ${quiz.title}</td>
                <td>0</td>
                <td>${quiz.questions.length} Questions</td>
                <td class="action-cell"></td>
            `;
            const actionCell = row.querySelector(".action-cell");
            
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () => editQuiz(quiz.id);
            
            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.onclick = () => deleteItem('quizzes', quiz.id);
            
            actionCell.appendChild(editBtn);
            actionCell.appendChild(delBtn);
            table.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading table items:", error);
        table.innerHTML = "<tr><td colspan='4'>Error connecting to cloud database.</td></tr>";
    }
}

async function deleteItem(collectionName, id) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
        await deleteDoc(doc(window.db, collectionName, id));
        loadTable();
    } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to delete item.");
    }
}

function editHtmlCourse(id) {
    const course = loadedCourses.find(c => c.id === id);
    if (!course) return;

    document.getElementById("html-title").value = course.title || "";
    document.getElementById("html-data").value = course.html || "";
    currentHtmlEditingId = course.id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function editReading(id) {
    const reading = loadedReadings.find(r => r.id === id);
    if (!reading) return;

    document.getElementById("reading-title").value = reading.title;
    readingPagesBuffer = reading.pages || [{ content: reading.data || "", image: "" }];
    currentReadingIndex = 0;
    currentReadingEditingId = reading.id;
    loadCurrentReadingPageToDOM();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function editQuiz(id) {
    const quiz = loadedQuizzes.find(q => q.id === id);
    if (!quiz) return;

    document.getElementById("quiz-title").value = quiz.title;
    quizQuestionsBuffer = quiz.questions || [];
    currentQuizIndex = 0;
    currentQuizEditingId = quiz.id;
    loadCurrentQuizQuestionToDOM();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initial Load on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    loadCurrentQuizQuestionToDOM();
    loadCurrentReadingPageToDOM();
    loadTable();
});

// --- Expose Functions Globally for Table Buttons ---
window.editHtmlCourse = editHtmlCourse;
window.editReading = editReading;
window.editQuiz = editQuiz;
window.deleteItem = deleteItem;
