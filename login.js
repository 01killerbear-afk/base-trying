const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "yourSecretPassword123"; // Change this to whatever password you prefer

function login() {
    let userInput = document.getElementById("blocknumber").value.trim();
    let passInput = document.getElementById("password").value.trim();
    let err = document.getElementById("error-message");

    if (userInput === ADMIN_USERNAME && passInput === ADMIN_PASSWORD) {
        localStorage.setItem("isAuthorizedAdmin", "true");
        
        window.location.href = "newhtml.html";
    } else {
        err.style.display = "block";
        err.textContent = "Invalid Username or Password.";
    }
}

function triggerAdminLogin() {
    let pass = prompt("Enter Admin Password:");
    if (pass === ADMIN_PASSWORD) {
        localStorage.setItem("isAuthorizedAdmin", "true");
        alert("Admin mode unlocked!");
        window.location.href = "newhtml.html";
    } else {
        alert("Incorrect password.");
    }
}