function validatePassword() {
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm_password").value;
    const errorMsg = document.getElementById("password-error");

    if (password === "" && confirmPassword === "") {
        errorMsg.style.display = "none";
        return false;
    }

    // IF NOT MATCH PASSWORD
    if (password !== confirmPassword) {
        errorMsg.textContent = "Passwords do not match.";
        errorMsg.style.color = "#e74c3c";
        errorMsg.style.display = "block";
        return false;
    }

    if (password.length < 8) {
        errorMsg.textContent = "Password must be at least 8 characters long.";
        errorMsg.style.color = "#e74c3c";
        errorMsg.style.display = "block";
        return false;
    }

    // IF MATCH PASSWORD
    errorMsg.textContent = "Passwords match!";
    errorMsg.style.color = "#2ecc71";
    errorMsg.style.display = "block";

    return true;
}

function togglePassword(fieldId) {
    const input = document.getElementById(fieldId);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}



function validateUsername() {
    const username = document.getElementById("name").value;
    const errorMsg = document.getElementById("username-error");

    if (username.length < 5) {
        errorMsg.textContent = "Username must be at least 5 characters long.";
        errorMsg.style.color = "#e74c3c";
        errorMsg.style.display = "block";
        return false;
    } else {
        errorMsg.textContent = "Username is valid.";
        errorMsg.style.color = "#2ecc71";
        errorMsg.style.display = "block";
        return true;
    }

}

function toggleUsername(fieldId) {
    const input = document.getElementById(fieldId);
    if (input.type === "username") {
        input.type = "username";
    } else {
        input.type = "username";
    }
}