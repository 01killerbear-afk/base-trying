let currentQuestions = [];
let currentIndex = 0;
let selectedAnswer = null;
let locked = false; 

async function loadQuiz() {
    const response = await fetch('questions.json');
    currentQuestions = await response.json();
    
    console.log("Total questions loaded:", currentQuestions.length); 
    
    renderQuestion();
}



function renderQuestion() {
    locked = false;
    const container = document.getElementById("quiz-container");
    const q = currentQuestions[currentIndex];
    
    selectedAnswer = null;
    document.getElementById("explanation-box").style.display = "none";
    document.getElementById("submit-btn").style.display = "inline-block";
    document.getElementById("next-btn").style.display = "none";

    container.innerHTML = `
        <h3>${q.question}</h3>
        
        ${q.image ? `<img src="${q.image}" alt="Signal Illustration" style="max-width: 100%; margin: 10px 0;">` : ""}
        
        <div id="options-list">
            ${q.options.map((opt, i) => `
                <button class="option-btn" onclick="selectOption(${i}, this)">${opt}</button>
            `).join('')}
        </div>
    `;
}

function selectOption(index, btn) {
    if (locked) return; 
    
    selectedAnswer = index;
    document.querySelectorAll('.option-btn').forEach(b => b.style.backgroundColor = "");
    btn.style.backgroundColor = "#e0e0e0"; 
}

function checkAnswer() {
    if (selectedAnswer === null) return alert("Please select an answer!");
    if (locked) return; // Prevent double submission
    
    locked = true; 
    
    const q = currentQuestions[currentIndex];
    const btns = document.querySelectorAll('.option-btn');
    const isCorrect = (selectedAnswer === q.answer);
    updateScore(isCorrect);
    btns.forEach(b => b.disabled = true);
    
    if (selectedAnswer === q.answer) {
        btns[selectedAnswer].style.backgroundColor = "lightgreen";
    } else {
        btns[selectedAnswer].style.backgroundColor = "salmon";
        btns[q.answer].style.backgroundColor = "lightgreen"; 
    }

    document.getElementById("explanation-text").textContent = q.explanation;
    document.getElementById("explanation-box").style.display = "block";
    document.getElementById("submit-btn").style.display = "none";
    document.getElementById("next-btn").style.display = "inline-block";
}

function updateScore(isCorrect) {
    let score = JSON.parse(localStorage.getItem("quizScore")) || { answered: 0, correct: 0 };
    
    score.answered += 1;
    if (isCorrect) {
        score.correct += 1;
    }
    
    localStorage.setItem("quizScore", JSON.stringify(score));
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
        renderQuestion();
    } else {
        alert("Quiz Finished!");
    }
}


document.addEventListener("DOMContentLoaded", loadQuiz);


function updateCourseMenu() {

    const courseList =
        document.getElementById("course-list");

    courseList.innerHTML =
        `<li><a href="index.html">Mobile Crane</a></li>`;

    const courses =
        JSON.parse(localStorage.getItem("quizLibrary")) || [];

    courses.forEach(course => {

        const li = document.createElement("li");

        const a = document.createElement("a");

        a.href =
            `dynamic-course.html?course=${encodeURIComponent(course.title)}`;

        a.textContent = course.title;

        li.appendChild(a);

        courseList.appendChild(li);

    });

}

window.onload = updateCourseMenu;