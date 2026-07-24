import {
  auth,
  onAuthStateChanged,
  signOut
} from "./firebase.js";

const loginLink = document.getElementById("loginLink");
const accountLink = document.getElementById("accountLink");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginLink.classList.add("hidden");
    accountLink.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    loginLink.classList.remove("hidden");
    accountLink.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    alert("Could not log out. Please try again.");
  }
});
