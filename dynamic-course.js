import { collection, getDocs, query, where } from "firebase/firestore";

const params = new URLSearchParams(window.location.search);
const courseName = params.get("course");

document.getElementById("course-title").textContent = courseName ? courseName : "Course Hub";

// Global variables to hold our cloud data
let activeReadingPages = [];
let currentReadingIndex = 0;
let activeQuizQuestions = [];
let currentQuizIndex = 0;

// Initialize and load everything from Firestore when the page loads
async function initializeCourseHub() {
    if (!window.db) {
        console.error("Firestore database not initialized yet.");
        return;
    }

    try {
        // 1. Fetch Course HTML/Layout from Firestore
        const coursesQuery = query(collection(window.db, "courses"), where("title", "==", courseName));
        const courseSnapshot = await getDocs(coursesQuery);
        const customHtmlDiv = document.getElementById("course-custom-html");
        
        let courseFound = false;
        courseSnapshot.forEach((doc) => {
            const cData = doc.data();
            if (cData.html) {
                customHtmlDiv.innerHTML = cData.html;
                courseFound = true;
            }
        });
        if (!courseFound) {
            customHtmlDiv.innerHTML = "<p>No custom course layout provided.</p>";
        }

        // 2. Fetch Quizzes for this course from Firestore
        const quizQuery = query(collection(window.db, "quizzes"), where("title", "==", courseName));
        const quizSnapshot = await getDocs(quizQuery);
        quizSnapshot.forEach((doc) => {
            const qData = doc.data();
            if (qData.questions) {
                activeQuizQuestions = activeQuizQuestions.concat(qData.questions);
            }
        });

        // 3. Fetch Readings for this course from Firestore
        const readingQuery = query(collection(window.db, "readings"), where("title", "==", courseName));
        const readingSnapshot = await getDocs(readingQuery);
        readingSnapshot.forEach((doc) => {
            const rData = doc.data();
            if (rData.pages) {
                activeReadingPages = rData.pages;
            }
        });

        // Now that data is loaded, render the initial views
        renderQuizQuestion();
        renderReadingPage();
        displayStats();
        updateCourseMenu();

    } catch (error) {
        console.error("Error loading course hub data from Firestore:", error);
    }
}

// Run initialization on page load
window.addEventListener("DOMContentLoaded", initializeCourseHub);

document.getElementById("course-title").textContent = courseName ? courseName : "Course Hub";

// Load Custom Course HTML
const customHtmlDiv = document.getElementById("course-custom-html");
if (course && course.html) {
    customHtmlDiv.innerHTML = course.html;
} else {
    customHtmlDiv.innerHTML = "<p>No custom course layout provided.</p>";
}

// Toggle Hub Sections
function openSection(type) {
    document.getElementById("quiz-view").classList.add("hidden");
    document.getElementById("reading-view").classList.add("hidden");

    if (type === 'quiz') {
        document.getElementById("quiz-view").classList.remove("hidden");
        
        const score = JSON.parse(localStorage.getItem("quizScore"));
        const isCompleted = score && activeQuizQuestions.length > 0 && score.answered >= activeQuizQuestions.length;

        if (isCompleted || currentQuizIndex >= activeQuizQuestions.length) {
            currentQuizIndex = 0;
        }

        renderQuizQuestion();
    } else if (type === 'reading') {
        document.getElementById("reading-view").classList.remove("hidden");
        renderReadingPage();
    }
}

// --- Reading Logic ---
let activeReadingPages = (courseReadings.length > 0 && courseReadings[0].pages) ? courseReadings[0].pages : [];
let currentReadingIndex = 0;

function renderReadingPage() {
    const pageBox = document.getElementById("reading-page-box");
    if (activeReadingPages.length === 0) {
        pageBox.innerHTML = "<p>No reading pages available for this course.</p>";
        return;
    }
    
    const pageData = activeReadingPages[currentReadingIndex];
    let imageHtml = "";
    
    // Check if the current reading page has an image stored and render it
    if (pageData.image) {
        imageHtml = `<div style="margin: 15px 0;"><img src="${pageData.image}" style="max-width: 100%; height: auto; border-radius: 4px;"></div>`;
    }

    pageBox.innerHTML = `<h3>Page ${currentReadingIndex + 1}</h3>${imageHtml}<p>${pageData.content}</p>`;
    document.getElementById("reading-page-indicator").textContent = `Page ${currentReadingIndex + 1} of ${activeReadingPages.length}`;
    
    document.getElementById("prev-page-btn").style.display = currentReadingIndex === 0 ? "none" : "inline-block";
    document.getElementById("next-page-btn").style.display = currentReadingIndex === activeReadingPages.length - 1 ? "none" : "inline-block";
}

function changeReadingPage(direction) {
    currentReadingIndex += direction;
    if (currentReadingIndex < 0) currentReadingIndex = 0;
    if (currentReadingIndex >= activeReadingPages.length) currentReadingIndex = activeReadingPages.length - 1;
    renderReadingPage();
}

// --- Quiz Logic ---
let activeQuizQuestions = [];
courseQuizzes.forEach(qb => {
    if (qb.questions) activeQuizQuestions = activeQuizQuestions.concat(qb.questions);
});
let currentQuizIndex = 0;

function renderQuizQuestion() {
    const qBox = document.getElementById("quiz-question-box");
    const optBox = document.getElementById("quiz-options-box");
    
    if (activeQuizQuestions.length === 0) {
        qBox.innerHTML = "<p>No practice questions available for this course.</p>";
        optBox.innerHTML = "";
        return;
    }

    const q = activeQuizQuestions[currentQuizIndex];
    let imageHtml = "";
    
    // Check if the current quiz question has an image stored and render it
    if (q.image) {
        imageHtml = `<div style="margin: 15px 0;"><img src="${q.image}" style="max-width: 100%; height: auto; border-radius: 4px;"></div>`;
    }

    qBox.innerHTML = `<p><strong>Question ${currentQuizIndex + 1} of ${activeQuizQuestions.length}:</strong></p>${imageHtml}<p>${q.question}</p>`;
    optBox.innerHTML = "";
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("next-quiz-btn").classList.add("hidden");

    if (q.options) {
        q.options.forEach((optText, optIndex) => {
            const btn = document.createElement("div");
            btn.className = "hub-btn";
            btn.style.display = "block";
            btn.style.margin = "8px 0";
            btn.style.background = "#333";
            btn.textContent = optText;
            btn.onclick = () => checkAnswer(optIndex, q.answer, btn);
            optBox.appendChild(btn);
        });
    }
}

function checkAnswer(selectedIndex, correctIndex, selectedElement) {
    const options = document.querySelectorAll("#quiz-options-box .hub-btn");
    options.forEach(o => o.onclick = null);

    let score = JSON.parse(localStorage.getItem("quizScore")) || { answered: 0, correct: 0 };
    score.answered++;

    const feedback = document.getElementById("quiz-feedback");
    const currentQ = activeQuizQuestions[currentQuizIndex];
    
    const correctAnsText = currentQ.options[correctIndex];

    if (selectedIndex === correctIndex) {
        selectedElement.style.background = "#1e4620";
        feedback.style.color = "#28a745";
        feedback.textContent = "Correct! " + (currentQ.explanation || "");
        score.correct++;
    } else {
        selectedElement.style.background = "#5c1d24";
        if (options[correctIndex]) options[correctIndex].style.background = "#1e4620";
        feedback.style.color = "#dc3545";
        
        let errorMsg = `Incorrect. The correct answer is: "${correctAnsText}". ${currentQ.explanation || ""}`;
        
        if (currentQ.page !== undefined && currentQ.page !== "") {
            errorMsg += ` <a href="#" onclick="jumpToReading(${currentQ.page}); return false;" style="color: #8ab4f8; text-decoration: underline;">Jump to Page ${Number(currentQ.page) + 1} in Reading</a>`;
        }
        
        feedback.innerHTML = errorMsg;
    }

    localStorage.setItem("quizScore", JSON.stringify(score));
    displayStats();

    if (currentQuizIndex < activeQuizQuestions.length - 1) {
        document.getElementById("next-quiz-btn").classList.remove("hidden");
    } else {
        feedback.textContent += " You've completed the practice retry.";
    }
}

function nextQuizQuestion() {
    currentQuizIndex++;
    renderQuizQuestion();
}

function jumpToReading(pageIndex) {
    openSection('reading');
    
    currentReadingIndex = pageIndex;
    
    if (currentReadingIndex < 0) currentReadingIndex = 0;
    if (currentReadingIndex >= activeReadingPages.length) currentReadingIndex = activeReadingPages.length - 1;
    
    renderReadingPage();
}

document.addEventListener("DOMContentLoaded", displayStats);

document.querySelector('.dropbtn').addEventListener('click', function(e) {
    e.preventDefault(); 
    let content = this.nextElementSibling;
    content.style.display = (content.style.display === "block") ? "none" : "block";
});

function displayStats() {
    const score = JSON.parse(localStorage.getItem("quizScore"));
    const gradeSection = document.getElementById("grade");
    
    if (!score || score.answered === 0) {
        gradeSection.innerHTML = "<p>No practice tests completed yet.</p>";
        return;
    }

    const percentage = Math.round((score.correct / score.answered) * 100);
    
    gradeSection.innerHTML = `
        <div class="stats-box">
            <h3>Your Progress</h3>
            <p>Questions Answered: ${score.answered}</p>
            <p>Correct Percentage: ${percentage}%</p>
            <button onclick="resetStats()">Reset Stats</button>
        </div>
    `;
}

function resetStats() {
    localStorage.removeItem("quizScore");
    displayStats();
}

function updateCourseMenu() {
    const courseList = document.getElementById("course-list");
    if (!courseList) return;

    courseList.innerHTML = `<li><a href="index.html">Mobile Crane</a></li>`;

    const courses = JSON.parse(localStorage.getItem("quizLibrary")) || [];

    courses.forEach(course => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `dynamic-course.html?course=${encodeURIComponent(course.title)}`;
        a.textContent = course.title;
        li.appendChild(a);
        courseList.appendChild(li);
    });
}

window.onload = function() {
    updateCourseMenu();
    displayStats();
};