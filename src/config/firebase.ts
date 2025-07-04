import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase konfigürasyonu - Environment variables kullanımı
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBWY8NeDCbxQ6Je33Ur-cJxzPAHjuPZ-bc",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "paramiyonet.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "paramiyonet",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "paramiyonet.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "653203490259",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:653203490259:web:64162395c713f7807d5b26",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-3DSF0SQX1L"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Firebase Auth'u başlat (React Native otomatik persistence kullanır)
const auth = getAuth(app);

// Firestore'u başlat
const db = getFirestore(app);

export { auth, db }; 