import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBsPvOulAOyvKkU9sezUvajt2qzhOfGP20",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "database-8e5c1.firebaseapp.com",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://database-8e5c1-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "database-8e5c1",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "database-8e5c1.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "805358674079",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:805358674079:web:9c90c65cccb6ca413c82aa",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-PCK0TCRWCZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;