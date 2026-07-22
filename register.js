import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  createUserWithEmailAndPassword,
  updateProfile
} from "./firebase.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;

  message.style.color = "#444";
  message.textContent = "Creating your account...";

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(result.user, {
      displayName: name
    });

    await setDoc(doc(db, "customers", result.user.uid), {
      uid: result.user.uid,
      name,
      email,
      phone,
      createdAt: serverTimestamp()
    });

    message.style.color = "green";
    message.textContent = "Account created successfully!";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (error) {
    console.error(error);

    message.style.color = "red";

    if (error.code === "auth/email-already-in-use") {
      message.textContent = "This email is already registered.";
    } else if (error.code === "auth/weak-password") {
      message.textContent = "Password must contain at least 6 characters.";
    } else if (error.code === "auth/invalid-email") {
      message.textContent = "Please enter a valid email address.";
    } else {
      message.textContent = "Could not create account. Please try again.";
    }
  }
});
