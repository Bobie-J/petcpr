import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDUlCG0Nh_Yw0zquCJ5QT43DNWIPNr_DiQ",
  authDomain: "pet-cpr.firebaseapp.com",
  projectId: "pet-cpr",
  storageBucket: "pet-cpr.firebasestorage.app",
  messagingSenderId: "180722138949",
  appId: "1:180722138949:web:bf264412d0c3e11f30482c",
  measurementId: "G-M9ZPYK2VGB"
};

// Firebase の初期化
const app = initializeApp(firebaseConfig);

// サービス インスタンスの取得＆export
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);