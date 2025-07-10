// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your config
const firebaseConfig = {
  apiKey: "AIzaSyA5cZqYTroQJM0pSYsN5PLkULYfZdHx_is",
  authDomain: "jits-6e2b7.firebaseapp.com",
  projectId: "jits-6e2b7",
  storageBucket: "jits-6e2b7.appspot.com", // ✅ Fix: was missing ".com"
  messagingSenderId: "348073204450",
  appId: "1:348073204450:web:9063ba80c29a94cc721cbb",
  measurementId: "G-KLZWR18SNX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ Export Firestore so you can use it in your components
export const db = getFirestore(app);
