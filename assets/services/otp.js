const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
const API_BASE_URL = (window.ECOMS_CONFIG && window.ECOMS_CONFIG.AUTH_URL) ||
    ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? `http://${API_HOST}:3000/api/auth` : "https://ecoms-api-ajz5.onrender.com/api/auth");

const OTP_COUNTDOWN_SECONDS = 60;

let countdownTimer = null;
let remainingSeconds = OTP_COUNTDOWN_SECONDS;

const otpForm = document.getElementById("otpForm");

const otpInput = document.getElementById("otp");

const messageElement = document.getElementById("otpMessage");

const sendCodeBtn = document.getElementById("sendCodeBtn");

const countdownElement = document.getElementById("countdown");

function showMessage(message, type = "error") {
  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;

  messageElement.className = `otp-message ${type}`;
}

function updateCountdownDisplay() {
  if (!countdownElement) {
    return;
  }

  if (remainingSeconds > 0) {
    countdownElement.textContent = `You can request a new code in ${remainingSeconds} seconds.`;
  } else {
    countdownElement.textContent = "You can request a new code now.";
  }
}

function stopCountdown() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);

    countdownTimer = null;
  }
}

function startCountdown(seconds = OTP_COUNTDOWN_SECONDS) {
  stopCountdown();

  remainingSeconds = seconds;

  if (sendCodeBtn) {
    sendCodeBtn.disabled = true;

    sendCodeBtn.style.cursor = "not-allowed";

    sendCodeBtn.style.opacity = "0.5";
  }

  updateCountdownDisplay();

  countdownTimer = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;

      updateCountdownDisplay();

      stopCountdown();

      if (sendCodeBtn) {
        sendCodeBtn.disabled = false;

        sendCodeBtn.style.cursor = "pointer";

        sendCodeBtn.style.opacity = "1";
      }

      return;
    }

    updateCountdownDisplay();
  }, 1000);
}

async function handleOTPVerification(event) {
  event.preventDefault();

  const email = sessionStorage.getItem("otp_email");

  const otp = otpInput ? otpInput.value.trim() : "";

  if (!email) {
    showMessage("OTP session is missing. Please login again.", "error");

    return;
  }

  if (!otp) {
    showMessage("Please enter the OTP code.", "error");

    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    showMessage("OTP must be 6 digits.", "error");

    return;
  }

  const verifyButton = document.getElementById("verifyBtn");

  if (verifyButton) {
    verifyButton.disabled = true;

    verifyButton.textContent = "Verifying...";
  }

  try {
    const rememberDeviceCheckbox = document.getElementById("rememberDevice");
    const sessionRemember = sessionStorage.getItem("otp_remember") === "true";
    const rememberDevice = (rememberDeviceCheckbox && rememberDeviceCheckbox.checked) || sessionRemember;

    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: "POST",

      credentials: "include",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        email: email,
        otp: otp,
        rememberDevice: rememberDevice,
      }),
    });

    let result;

    try {
      result = await response.json();
    } catch (error) {
      result = {
        success: false,
        message: "Invalid server response.",
      };
    }

    if (!response.ok || result.success !== true) {
      showMessage(result.message || "Invalid OTP.", "error");

      if (verifyButton) {
        verifyButton.disabled = false;

        verifyButton.textContent = "Continue";
      }

      return;
    }

    showMessage("Verification successful. Redirecting...", "success");

    stopCountdown();

    if (result.sessionToken || result.token) {
      localStorage.setItem("ecoms_session_token", result.sessionToken || result.token);
    }

    if (result.user) {
      localStorage.setItem("ecoms_user_role", result.user.role || "user");
      localStorage.setItem("ecoms_username", result.user.username || "");
    }

    sessionStorage.removeItem("otp_email");

    sessionStorage.removeItem("otp_user_id");

    sessionStorage.removeItem("otp_username");

    sessionStorage.removeItem("otp_role");

    setTimeout(() => {
      window.location.href = "../layouts/main.html?page=Dashboard";
    }, 700);
  } catch (error) {
    console.error("OTP verification error:", error);

    showMessage("Unable to connect to the server.", "error");

    if (verifyButton) {
      verifyButton.disabled = false;

      verifyButton.textContent = "Continue";
    }
  }
}

async function handleSendCode() {
  if (remainingSeconds > 0) {
    return;
  }

  const email = sessionStorage.getItem("otp_email");

  if (!email) {
    showMessage("OTP session expired. Please login again.", "error");

    return;
  }

  if (sendCodeBtn) {
    sendCodeBtn.disabled = true;

    sendCodeBtn.style.cursor = "not-allowed";

    sendCodeBtn.style.opacity = "0.5";

    sendCodeBtn.textContent = "Sending...";
  }

  showMessage("", "");

  try {
    const response = await fetch(`${API_BASE_URL}/resend-otp`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        email: email,
      }),
    });

    let result;

    try {
      result = await response.json();
    } catch (error) {
      result = {
        success: false,
        message: "Invalid server response.",
      };
    }

    if (!response.ok || result.success !== true) {
      showMessage(result.message || "Failed to resend OTP.", "error");

      if (sendCodeBtn) {
        sendCodeBtn.disabled = false;

        sendCodeBtn.style.cursor = "pointer";

        sendCodeBtn.style.opacity = "1";

        sendCodeBtn.textContent = "Send Code";
      }

      return;
    }

    showMessage("A new OTP has been sent to your email.", "success");

    if (sendCodeBtn) {
      sendCodeBtn.textContent = "Send Code";
    }

    startCountdown(OTP_COUNTDOWN_SECONDS);
  } catch (error) {
    console.error("Resend OTP error:", error);

    showMessage("Unable to connect to the server.", "error");

    if (sendCodeBtn) {
      sendCodeBtn.disabled = false;

      sendCodeBtn.style.cursor = "pointer";

      sendCodeBtn.style.opacity = "1";

      sendCodeBtn.textContent = "Send Code";
    }
  }
}

function setupOTPInput() {
  if (!otpInput) {
    return;
  }

  otpInput.addEventListener("input", () => {
    // Numbers only
    otpInput.value = otpInput.value.replace(/\D/g, "");

    // Maximum 6 digits
    if (otpInput.value.length > 6) {
      otpInput.value = otpInput.value.substring(0, 6);
    }
  });
}

function initializeOTPPage() {
  console.log("OTP page initialized.");

  const email = sessionStorage.getItem("otp_email");

  console.log("OTP email:", email);

  const otpDescription = document.getElementById("otpDescription");

  if (otpDescription && email) {
    otpDescription.textContent = `We've sent a 6-digit code to ${email}.`;
  }

  const rememberDeviceCheckbox = document.getElementById("rememberDevice");
  if (rememberDeviceCheckbox && sessionStorage.getItem("otp_remember") === "true") {
    rememberDeviceCheckbox.checked = true;
  }

  if (otpForm) {
    otpForm.addEventListener("submit", handleOTPVerification);
  }

  setupOTPInput();

  if (sendCodeBtn) {
    sendCodeBtn.addEventListener("click", handleSendCode);
  }

  startCountdown(OTP_COUNTDOWN_SECONDS);

  if (!email) {
    showMessage("OTP session is missing. Please login again.", "error");
  }
}

initializeOTPPage();

window.addEventListener("beforeunload", () => {
  stopCountdown();
});
