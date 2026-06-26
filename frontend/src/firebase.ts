import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBi-33g2KtgcmjtieZGs9cAl0TadT4nL_I",
  authDomain: "leon-greek-coach.firebaseapp.com",
  projectId: "leon-greek-coach",
  storageBucket: "leon-greek-coach.firebasestorage.app",
  messagingSenderId: "639077208485",
  appId: "1:639077208485:web:59743689be2d6690e2984c",
  measurementId: "G-WMTQTL32LQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
