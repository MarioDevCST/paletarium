import React, { useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom"; // <-- Importa useNavigate

import "../styles/AuthForms.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate(); // <-- Inicializa useNavigate

  const handleRegister = async (e) => {
    e.preventDefault();

    setError(null);
    setMessage(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const usersCollectionRef = collection(db, "users");
      const userDocRef = doc(usersCollectionRef, user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        role: "user", // Rol por defecto
        status: "pending", // Estado por defecto
        createdAt: new Date(),
      });

      setMessage(
        "¡Registro exitoso! Tu cuenta está pendiente de aprobación por un administrador."
      );
      setEmail("");
      setPassword("");

      // Redirigir al usuario a la página de pendiente de aprobación
      setTimeout(() => {
        navigate("/pending-approval");
      }, 1500); // Pequeño retraso para que el usuario vea el mensaje de éxito
    } catch (err) {
      let errorMessage = "Ha ocurrido un error al registrar el usuario.";
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este correo electrónico ya está en uso.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "El formato del correo electrónico no es válido.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      }
      setError(errorMessage);
      console.error("Error de registro:", err);
    }
  };

  return (
    <div className="auth-container">
      <h2>Registrarse</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="auth-button">
          Registrarme
        </button>
      </form>
      {error && <p className="auth-message error">{error}</p>}
      {message && <p className="auth-message success">{message}</p>}

      {/* Enlace para ir a Iniciar Sesión, debajo del formulario */}
      <div className="auth-toggle-text">
        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
