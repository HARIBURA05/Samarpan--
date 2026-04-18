import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAuBDFKFX_cO5flBRs8lULS65mdbW49yYg",
  authDomain: "samarpan-98386.firebaseapp.com",
  projectId: "samarpan-98386",
  storageBucket: "samarpan-98386.firebasestorage.app",
  messagingSenderId: "991467382486",
  appId: "1:991467382486:web:e725d45c0908e630078b77",
  measurementId: "G-KLXKG619QH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics conditionally (only in browser)
export const analytics = typeof window !== 'undefined' ? 
  isSupported().then(yes => yes ? getAnalytics(app) : null) : 
  null;

export default app;
