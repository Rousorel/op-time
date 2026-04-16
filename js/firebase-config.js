// ============================================================
//  🔥 FIREBASE CONFIG — reemplaza con tus credenciales
//  Firebase Console → Project Settings → Your apps → SDK setup
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBTbrsVAaBNw04XNU46tJCarEXTlOjHbQo",
  authDomain: "optime-9ca71.firebaseapp.com",
  projectId: "optime-9ca71",
  storageBucket: "optime-9ca71.firebasestorage.app",
  messagingSenderId: "290971848812",
  appId: "1:290971848812:web:affa8f22d9bb9fe28d8849"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Instancia global de Firestore
const db = firebase.firestore();
