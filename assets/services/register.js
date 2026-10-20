const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
const API_BASE_URL = `http://${API_HOST}:3000/api/auth`;

const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!validatePassword()) {
        return;
    }

    const username = document.getElementById("name").value.trim();

    const email = document.getElementById("gmail").value.trim().toLowerCase();

    const password = document.getElementById("password").value;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (username.length < 5) {
        alert("Username must be at least 5 characters long.");
        return;
    }

    if (!email) {
        alert("Please enter your Gmail.");
        return;
    }

    if (!password) {
        alert("Please enter your password.");
        return;
    }

    // ==========================================
    // TURNSTILE
    // ==========================================

    const turnstileInput = document.querySelector(
        'input[name="cf-turnstile-response"]',
    );

    const turnstileToken = turnstileInput ? turnstileInput.value : "";

    if (!turnstileToken) {
        alert("Please complete the security verification before registering.");

        return;
    }

    // ==========================================
    // BUTTON
    // ==========================================

    const button = document.getElementById("submitReg");

    button.disabled = true;

    button.textContent = "Creating account...";

    // ==========================================
    // REGISTER
    // ==========================================

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },

            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                turnstileToken: turnstileToken,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to create account.");
        }

        // ==========================================
        // SUCCESS
        // ==========================================

        alert("Account created successfully. Please log in.");

        if (typeof window.ecomsAllowNextNavigation === "function") {
            window.ecomsAllowNextNavigation("login.html");
        }

        window.location.replace("login.html");
    } catch (error) {
        console.error("Registration error:", error);

        alert(error.message || "Registration failed.");

        // Reset Turnstile

        if (typeof turnstile !== "undefined") {
            try {
                turnstile.reset();
            } catch (resetError) {
                console.error("Turnstile reset error:", resetError);
            }
        }

        button.disabled = false;

        button.textContent = "Register";
    }
});