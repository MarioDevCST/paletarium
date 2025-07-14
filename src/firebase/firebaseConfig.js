// Importa las funciones individuales de Firebase
import { initializeApp } from "firebase/app"; // Importa initializeApp para la inicialización
import { getAuth } from "firebase/auth"; // Importa getAuth para Authentication
import { getFirestore } from "firebase/firestore"; // Importa getFirestore para Firestore

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  databaseURL:
    "https://paletarium-41a98-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID,
};
// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta los servicios que vas a usar
const auth = getAuth(app); // Ahora se inicializa pasando la app
const db = getFirestore(app); // Ahora se inicializa pasando la app

export { auth, db };
