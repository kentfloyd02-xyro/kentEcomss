(function () {
    "use strict";

    const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
    const API_BASE_URL = (window.ECOMS_CONFIG && window.ECOMS_CONFIG.AUTH_URL) ||
        ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? `http://${API_HOST}:3000/api/auth` : "https://ecoms-api-ajz5.onrender.com/api/auth");

    const requestOtpForm = document.getElementById("requestOtpForm");
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    const resetIdentifierInput = document.getElementById("resetIdentifier");
    const resetEmailDisplay = document.getElementById("resetEmailDisplay");
    const resetOtpInput = document.getElementById("resetOtp");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
    const messageElement = document.getElementById("forgotMessage");
    const stepSubtitle = document.getElementById("stepSubtitle");
    const pwdMatchError = document.getElementById("pwdMatchError");
    const btnBackToStep1 = document.getElementById("btnBackToStep1");

    let activeResetEmail = "";

    function showMessage(msg, type = "error") {
        if (!messageElement) return;
        if (!msg) {
            messageElement.style.display = "none";
            messageElement.innerHTML = "";
            return;
        }

        messageElement.style.display = "block";
        messageElement.innerHTML = msg;
        if (type === "error") {
            messageElement.style.backgroundColor = "#f8d7da";
            messageElement.style.color = "#721c24";
            messageElement.style.border = "1px solid #f5c6cb";
        } else {
            messageElement.style.backgroundColor = "#d4edda";
            messageElement.style.color = "#155724";
            messageElement.style.border = "1px solid #c3e6cb";
        }
    }

    // STEP 1: REQUEST OTP
    if (requestOtpForm) {
        requestOtpForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const identifier = resetIdentifierInput ? resetIdentifierInput.value.trim() : "";
            if (!identifier) {
                showMessage("Please enter your email or username.", "error");
                return;
            }

            const btn = document.getElementById("btnSendCode");
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Sending code...";
            }
            showMessage("", "");

            try {
                const res = await fetch(`${API_BASE_URL}/forgot-password/request`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ identifier }),
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    activeResetEmail = data.email || identifier;
                    if (resetEmailDisplay) resetEmailDisplay.value = activeResetEmail;

                    // Switch to Step 2
                    requestOtpForm.style.display = "none";
                    resetPasswordForm.style.display = "block";
                    if (stepSubtitle) {
                        stepSubtitle.textContent = `Enter the verification code sent to ${activeResetEmail} and set your new password.`;
                    }
                    showMessage("A 6-digit reset code has been sent to your email. Please check your inbox.", "success");
                    if (resetOtpInput) resetOtpInput.focus();
                } else {
                    showMessage(data.message || "Failed to find account or send code.", "error");
                }
            } catch (err) {
                console.error("Forgot password request error:", err);
                showMessage("Unable to connect to the authentication server.", "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "Send Reset Code";
                }
            }
        });
    }

    // Real-time password match validation
    function checkPasswordsMatch() {
        if (!pwdMatchError) return true;
        const p1 = newPasswordInput ? newPasswordInput.value : "";
        const p2 = confirmNewPasswordInput ? confirmNewPasswordInput.value : "";

        if (!p1 && !p2) {
            pwdMatchError.style.display = "none";
            return true;
        }

        if (p1.length > 0 && p1.length < 8) {
            pwdMatchError.style.display = "block";
            pwdMatchError.style.color = "#dc3545";
            pwdMatchError.textContent = "Password must be at least 8 characters long.";
            return false;
        }

        if (p2.length > 0 && p1 !== p2) {
            pwdMatchError.style.display = "block";
            pwdMatchError.style.color = "#dc3545";
            pwdMatchError.textContent = "Passwords do not match.";
            return false;
        }

        if (p1.length >= 8 && p1 === p2) {
            pwdMatchError.style.display = "block";
            pwdMatchError.style.color = "#198754";
            pwdMatchError.textContent = "Passwords match!";
            return true;
        }

        pwdMatchError.style.display = "none";
        return true;
    }

    if (newPasswordInput) newPasswordInput.addEventListener("input", checkPasswordsMatch);
    if (confirmNewPasswordInput) confirmNewPasswordInput.addEventListener("input", checkPasswordsMatch);

    // STEP 2: VERIFY CODE & RESET PASSWORD
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const otp = resetOtpInput ? resetOtpInput.value.trim() : "";
            const newPassword = newPasswordInput ? newPasswordInput.value : "";
            const confirmNewPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : "";

            if (!otp) {
                showMessage("Please enter the 6-digit verification code from your email.", "error");
                return;
            }

            if (newPassword.length < 8) {
                showMessage("Your new password must be at least 8 characters long.", "error");
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showMessage("Passwords do not match. Please ensure both passwords match.", "error");
                return;
            }

            const btn = document.getElementById("btnSubmitReset");
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Updating password...";
            }
            showMessage("", "");

            try {
                const res = await fetch(`${API_BASE_URL}/forgot-password/reset`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        email: activeResetEmail,
                        otp: otp,
                        newPassword: newPassword,
                    }),
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    showMessage("Password reset successfully! Redirecting to login...", "success");
                    setTimeout(() => {
                        window.location.replace("login.html");
                    }, 1200);
                } else {
                    showMessage(data.message || "Failed to reset password. Please check your verification code.", "error");
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = "Update Password";
                    }
                }
            } catch (err) {
                console.error("Forgot password reset error:", err);
                showMessage("Unable to connect to the authentication server.", "error");
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "Update Password";
                }
            }
        });
    }

    // BACK TO STEP 1
    if (btnBackToStep1) {
        btnBackToStep1.addEventListener("click", function () {
            resetPasswordForm.style.display = "none";
            requestOtpForm.style.display = "block";
            if (stepSubtitle) {
                stepSubtitle.textContent = "Enter your registered email or username to receive a reset code.";
            }
            showMessage("", "");
        });
    }
})();
