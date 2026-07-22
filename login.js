import {
  auth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "./firebase.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    message.style.color = "green";
    message.textContent = "Login successful!";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);

  } catch (err) {
    message.style.color = "red";
    message.textContent = err.message;
  }
});

document.getElementById("forgotPassword").onclick = async (e) => {
  e.preventDefault();

  const email = form.email.value.trim();

  if (!email) {
    alert("Please enter your email first.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent.");
  } catch (err) {
    alert(err.message);
  }
};
