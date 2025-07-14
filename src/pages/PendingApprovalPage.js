import React from "react";
import { useNavigate } from "react-router-dom";

function PendingApprovalPage() {
  const navigate = useNavigate();

  const handleGoToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="pending-approval-container">
      {" "}
      {/* Contenedor principal de la página */}
      <div className="pending-approval-content">
        <h2>Cuenta Pendiente de Aprobación</h2>
        <p>
          Tu cuenta ha sido creada exitosamente, pero está pendiente de
          aprobación por un administrador.
        </p>
        <p>
          Por favor, espera a que tu cuenta sea revisada y aprobada para acceder
          a la aplicación completa.
        </p>
        <p>
          Recibirás una notificación por correo electrónico una vez que tu
          estado cambie.
        </p>
        <button onClick={handleGoToLogin} className="auth-button">
          Volver a Iniciar Sesión
        </button>
      </div>
    </div>
  );
}

export default PendingApprovalPage;
