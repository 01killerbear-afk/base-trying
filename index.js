import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const analytics = getAnalytics(app);
const db = getFirestore(app);

window.db = db;



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

document.addEventListener("DOMContentLoaded", displayStats);


import { collection, getDocs } from "firebase/firestore";

async function updateCourseMenu() {
    const courseList = document.getElementById("course-list");
    courseList.innerHTML = `<li><a href="index.html">Mobile Crane</a></li>`;

    try {
        // Fetch custom courses from Firestore 'courses' collection
        const querySnapshot = await getDocs(collection(window.db, "courses"));
        
        querySnapshot.forEach((doc) => {
            const course = doc.data();
            const li = document.createElement("li");
            const a = document.createElement("a");

            a.href = `dynamic-course.html?course=${encodeURIComponent(course.title)}`;
            a.textContent = course.title;

            li.appendChild(a);
            courseList.appendChild(li);
        });
    } catch (error) {
        console.error("Error loading courses from Firestore:", error);
    }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('Service Worker registered!', reg))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}

let deferredPrompt;
const installButton = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.classList.remove('hidden');
});

installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    installButton.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA was successfully installed');
    installButton.classList.add('hidden');
    deferredPrompt = null;
});

window.onload = updateCourseMenu;
