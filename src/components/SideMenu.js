import React from "react";
import { Link } from "react-router-dom"; // Para la navegación

function SideMenu({ userRole }) {
  return (
    <nav className="side-menu">
      {" "}
      {/* Clase CSS para el menú lateral */}
      <ul>
        {/* Enlace para el panel de administración (solo si es admin) */}
        {userRole === "admin" && (
          <li>
            <Link to="/admin">Panel de Administración</Link>
          </li>
        )}
        {/* Enlaces para las secciones de gestión (todos los usuarios logeados podrían verlas,
            pero el acceso real a los datos estará protegido por reglas de Firestore) */}
        <li>
          <Link to="/dashboard">Dashboard Principal</Link>
        </li>
        {/* Estos enlaces podrían ser para usuarios normales o también para admins si acceden a vistas de usuario */}
        <li>
          <Link to="/barcos">Ver Barcos</Link>
        </li>
        <li>
          <Link to="/cargas">Ver Cargas</Link>
        </li>
        <li>
          <Link to="/products">Ver Productos</Link>
        </li>
        {/* Puedes añadir más enlaces aquí según las necesidades de tu aplicación */}
      </ul>
    </nav>
  );
}

export default SideMenu;
