import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom"; // Importa Navigate
import AdminUserList from "./AdminUserList";
import BarcosPage from "../pages/BarcosPage";
import CargasPage from "../pages/CargasPage";
import ProductPage from "../pages/ProductPage";

function AdminPanel({ userProfile }) {
  // <-- Acepta userProfile como prop
  // --- DEBUGGING LOG ---
  console.log("AdminPanel - Current path:", window.location.pathname);
  // --- FIN DEBUGGING LOG ---
  return (
    <div className="admin-panel-container">
      <h2>Panel de Administración</h2>
      <nav className="admin-nav">
        {/* Rutas absolutas para asegurar la navegación correcta */}
        <Link to="/admin/users" className="admin-nav-button">
          Gestión de Usuarios
        </Link>
        <Link to="/admin/barcos" className="admin-nav-button">
          Gestión de Barcos
        </Link>
        <Link to="/admin/cargas" className="admin-nav-button">
          Gestión de Cargas
        </Link>
        <Link to="/admin/products" className="admin-nav-button">
          Gestión de Productos
        </Link>
      </nav>
      <div className="admin-content-area">
        <Routes>
          <Route path="users" element={<AdminUserList />} />
          {/* Pasa userProfile a los componentes de página */}
          <Route
            path="barcos"
            element={<BarcosPage userProfile={userProfile} />}
          />
          <Route
            path="cargas"
            element={<CargasPage userProfile={userProfile} />}
          />
          <Route
            path="products"
            element={<ProductPage userProfile={userProfile} />}
          />
          {/* Redirige a /admin/users por defecto dentro del panel de administración */}
          <Route path="/" element={<Navigate to="users" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminPanel;
