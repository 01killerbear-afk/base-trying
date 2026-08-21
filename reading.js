let currentPage = []; 
let currentIndex = 0;

async function loadMaterial() {
    try {
        const response = await fetch('material.json');
        if (!response.ok) throw new Error("Could not find material.json");
        
        currentPage = await response.json();
        console.log("Data loaded:", currentPage); 
        
        renderMaterial();
    } catch (error) {
        console.error("Fetch error:", error);
        document.getElementById("content-container").innerHTML = "Error loading materials. Check console.";
    }
}


function renderMaterial() {
    const container = document.getElementById("content-container");
    const q = currentPage[currentIndex]; 
    
    if (!q) return;

    container.innerHTML = `
        <h3>${q.title}</h3>
        <p>${q.content}</p>
    `;
}

function nextPage() {
    if (currentIndex < currentPage.length - 1) {
        currentIndex++;
        renderMaterial();
    }
}

function prevPage() {
    if (currentIndex > 0) {
        currentIndex--;
        renderMaterial();
    }
}

document.addEventListener("DOMContentLoaded", loadMaterial);


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