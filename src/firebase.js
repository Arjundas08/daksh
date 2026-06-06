import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "daksh-364c3.firebaseapp.com",
  projectId: "daksh-364c3",
  storageBucket: "daksh-364c3.firebasestorage.app",
  messagingSenderId: "308065233944",
  appId: "1:308065233944:web:0d72d544d6cb2be0fc676d",
  measurementId: "G-H8MH8HHQ2P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, googleProvider };
