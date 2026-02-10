import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

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

export { db };
