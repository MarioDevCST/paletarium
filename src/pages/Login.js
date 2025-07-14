import React, { useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

import "../styles/AuthForms.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError(null);
    setMessage(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        if (userData.status === "pending") {
          // Si la cuenta está pendiente de aprobación, cerramos la sesión y mostramos un mensaje.
          // AuthHandler se encargará de la redirección a /pending-approval.
          await auth.signOut(); // Cierra la sesión del usuario inmediatamente
          setMessage(
            "Tu cuenta está pendiente de aprobación por un administrador. Por favor, espera."
          );
          // NO redirigir aquí, dejar que AuthHandler lo haga
        } else if (userData.status === "approved") {
          setMessage("¡Inicio de sesión exitoso! Bienvenido.");
          console.log("Usuario logeado y aprobado:", userData);
          setEmail("");
          setPassword("");

          // LÓGICA DE REDIRECCIÓN AÑADIDA AQUÍ
          if (userData.role === "admin") {
            navigate("/admin"); // Redirige al administrador al panel de administración
          } else {
            navigate("/dashboard"); // Redirige al usuario normal aprobado al dashboard
          }
        } else {
          // Manejar otros estados posibles
          setMessage("Estado de cuenta desconocido. Contacta al soporte.");
          await auth.signOut();
          navigate("/login"); // Si el estado es desconocido, vuelve al login
        }
      } else {
        // Esto no debería ocurrir si el registro funciona correctamente
        setMessage("No se encontró el perfil de usuario. Contacta al soporte.");
        await auth.signOut();
        navigate("/login");
      }
    } catch (err) {
      // Manejo de errores de Firebase Auth
      let errorMessage = "Ha ocurrido un error al iniciar sesión.";
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        errorMessage = "Email o contraseña incorrectos.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "El formato del email no es válido.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "Tu cuenta ha sido deshabilitada.";
      }
      setError(errorMessage);
      console.error("Error de inicio de sesión:", err);
    }
  };

  return (
    <div className="auth-container">
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="login-email">Email:</label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Contraseña:</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="auth-button">
          Iniciar Sesión
        </button>
      </form>
      {error && <p className="auth-message error">{error}</p>}
      {message && <p className="auth-message success">{message}</p>}

      {/* Enlace para ir a Registrarse, debajo del formulario */}
      <div className="auth-toggle-text">
        <p>
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
