// Firebase configuration for Sree Veerabhadra Pickles
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9MTiS5SG_8NKlsGtcvUqIwmxeLxjIE0e",
  authDomain: "sree-veerabhadra-pickles.firebaseapp.com",
  projectId: "sree-veerabhadra-pickles",
  storageBucket: "sree-veerabhadra-pickles.firebasestorage.app",
  messagingSenderId: "921641893693",
  appId: "1:921641893693:web:17d923809dd9fc1587cf54",
  measurementId: "G-L0VC0DCT43"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {
  db, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};
