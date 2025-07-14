import React from "react";
import { auth } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

import logo from "../img/Logo.png";

function Header({ user, userProfile }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    console.log("Sesión cerrada.");
    navigate("/login");
  };

  return (
    <header className="app-header-logged-in">
      <div className="header-content-logged-in">
        <img src={logo} alt="Paletarium Logo" className="app-logo" />
        <h1>Paletarium App</h1>
      </div>
      <div className="user-info-and-logout">
        {user && userProfile && (
          <div className="user-avatar-info">
            {" "}
            {/* Nuevo contenedor para avatar y texto */}
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt="Avatar de usuario"
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {" "}
                {/* Placeholder si no hay avatar */}
                {/* Puedes usar un icono o las iniciales aquí */}
                <span>
                  {userProfile.nombre
                    ? userProfile.nombre.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="user-text-info">
              <span className="user-display-name">
                {userProfile.nombre || user.email}{" "}
                {/* Muestra el nombre o el email */}
              </span>
              <span className="user-display-role">
                ({userProfile.role}) {/* Muestra el rol en pequeño */}
              </span>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="logout-button">
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}

export default Header;
