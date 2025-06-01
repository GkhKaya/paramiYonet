import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase konfigürasyonu
const firebaseConfig = {
  apiKey: "AIzaSyBWY8NeDCbxQ6Je33Ur-cJxzPAHjuPZ-bc",
  authDomain: "paramiyonet.firebaseapp.com",
  projectId: "paramiyonet",
  storageBucket: "paramiyonet.firebasestorage.app",
  messagingSenderId: "653203490259",
  appId: "1:653203490259:web:64162395c713f7807d5b26",
  measurementId: "G-3DSF0SQX1L"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Firebase Auth'u AsyncStorage persistence ile başlat
const auth = initializeAuth(app);

// Firestore'u başlat
const db = getFirestore(app);

export { auth, db }; 