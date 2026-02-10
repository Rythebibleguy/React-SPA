import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, runTransaction, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, GoogleAuthProvider, signInWithPopup, linkWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7nwzw6917n2ro0mP-E5wNI8GqeZb0FVk",
    authDomain: "rythebibleguy-app.firebaseapp.com",
    databaseURL: "https://rythebibleguy-app-default-rtdb.firebaseio.com",
    projectId: "rythebibleguy-app",
    storageBucket: "rythebibleguy-app.firebasestorage.app",
    messagingSenderId: "1093957559131",
    appId: "1:1093957559131:web:5fa9bc7847738f4219f07e",
    measurementId: "G-46ZN87VGZR"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { 
    db, ref, runTransaction, get, 
    auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, GoogleAuthProvider, signInWithPopup, linkWithPopup,
    firestore, doc, setDoc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs
};