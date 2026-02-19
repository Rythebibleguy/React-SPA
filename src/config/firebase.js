import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { getPerformance } from 'firebase/performance';

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
const perf = getPerformance(app);
const firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'online'
});

export {
    app,
    db,
    auth,
    firestore,
    perf, 
    googleProvider,
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    fetchSignInMethodsForEmail,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    collection,
    query,
    where,
    getDocs
};
