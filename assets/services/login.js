const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
const API_BASE_URL = (window.ECOMS_CONFIG && window.ECOMS_CONFIG.AUTH_URL) ||
    ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? `http://${API_HOST}:3000/api/auth` : "https://ecoms-api-ajz5.onrender.com/api/auth");

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const messageElement = document.getElementById("loginMessage");

function showMessage(message, type = "error") {
    if (!message) {
        if (messageElement) {
            messageElement.style.display = "none";
            messageElement.textContent = "";
        }
        return;
    }

    if (messageElement) {
        messageElement.style.display = "block";
        messageElement.innerHTML = message;
        if (type === "error") {
            messageElement.style.backgroundColor = "#f8d7da";
            messageElement.style.color = "#721c24";
            messageElement.style.border = "1px solid #f5c6cb";
        } else {
            messageElement.style.backgroundColor = "#d4edda";
            messageElement.style.color = "#155724";
            messageElement.style.border = "1px solid #c3e6cb";
        }
    } else {
        alert(message);
    }
}

async function checkExistingSession() {
    try {
        const token = localStorage.getItem("ecoms_session_token");
        const headers = {
            Accept: "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/session`, {
            method: "GET",

            credentials: "include",

            headers: headers,
        });

        const result = await response.json();

        if (
            response.ok &&
            result.success === true &&
            result.authenticated === true
        ) {
            console.log("Existing session found.");

            window.location.href = "../layouts/main.html?page=Dashboard";
        }
    } catch (error) {
        console.error("Session check failed:", error);
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const username = usernameInput ? usernameInput.value.trim() : "";

    const password = passwordInput ? passwordInput.value : "";

    if (!username || !password) {
        showMessage("Email and password are required.", "error");

        return;
    }

    const submitButton = loginForm ?
        loginForm.querySelector('button[type="submit"]') :
        null;

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Signing in...";
    }

    showMessage("", "");

    const rememberMeCheckbox = document.getElementById("rememberMe");
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",

            credentials: "include",

            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },

            body: JSON.stringify({
                username,
                password,
                rememberMe: rememberMe,
            }),
        });

        const result = await response.json();

        if (!response.ok || result.success !== true) {
            let errorMsg = result.message || "Login failed.";
            if (result.locked) {
                errorMsg += `<div style="margin-top: 8px;"><a href="forgot-password.html" style="color: #721c24; font-weight: 700; text-decoration: underline;">Reset Password with OTP &rarr;</a></div>`;
            }
            showMessage(errorMsg, "error");

            return;
        }

        // If user already enabled "remembered device", bypass OTP completely
        if (result.remembered === true) {
            if (result.user) {
                localStorage.setItem("ecoms_user_role", result.user.role || "user");
                localStorage.setItem("ecoms_username", result.user.username || "");
            }
            if (result.sessionToken || result.token) {
                localStorage.setItem("ecoms_session_token", result.sessionToken || result.token);
            }
            showMessage("Device recognized! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "../layouts/main.html?page=Dashboard";
            }, 600);
            return;
        }

        sessionStorage.setItem("otp_email", result.email);

        sessionStorage.setItem("otp_user_id", result.userId);

        sessionStorage.setItem("otp_username", result.username);

        sessionStorage.setItem("otp_role", result.role || "user");

        sessionStorage.setItem("otp_remember", rememberMe ? "true" : "false");

        if (typeof window.ecomsAllowNextNavigation === "function") {
            window.ecomsAllowNextNavigation("otp.html");
        }

        window.location.href = "otp.html";
    } catch (error) {
        console.error("Login request error:", error);

        showMessage("Unable to connect to the server.", "error");
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Login";
        }
    }
}

document.addEventListener("DOMContentLoaded", async() => {
    await checkExistingSession();

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});