import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";

import AdminUserList from "./AdminUserList";
import BarcosPage from "./BarcosPage";
import CargasPage from "./CargasPage";
import ProductPage from "./ProductPage";
import UserEditPage from "./UserEditPage";
import BoatEditPage from "./BoatEditPage";
import CargasEditPage from "./CargasEditPage"; // <-- Asegúrate de que esta importación esté aquí
import ProductEditPage from "./ProductEditPage";

function AdminPanel({ userRole }) {
  // <-- Recibe userRole como prop
  const location = useLocation(); // Hook para obtener la URL actual

  return (
    <div className="admin-panel-container">
      <h2>Panel de Administración</h2>
      <p>
        Bienvenido al área de administración. Desde aquí puedes gestionar
        usuarios, barcos, cargas, etc.
      </p>

      {/* Menú de Navegación del Admin usando Link con rutas absolutas */}
      <nav className="admin-nav">
        <Link
          to="/admin/users"
          className={`admin-nav-button ${
            location.pathname.includes("/admin/users") ? "active" : ""
          }`}
        >
          Gestionar Usuarios
        </Link>
        <Link
          to="/admin/barcos"
          className={`admin-nav-button ${
            location.pathname.includes("/admin/barcos") ? "active" : ""
          }`}
        >
          Gestionar Barcos
        </Link>
        <Link
          to="/admin/cargas"
          className={`admin-nav-button ${
            location.pathname.includes("/admin/cargas") ? "active" : ""
          }`}
        >
          Gestionar Cargas
        </Link>
        <Link
          to="/admin/products"
          className={`admin-nav-button ${
            location.pathname.includes("/admin/products") ? "active" : ""
          }`}
        >
          Gestionar Productos
        </Link>
      </nav>

      {/* Contenido de la página de administración activa */}
      <div className="admin-content-area">
        <Routes>
          {/* Rutas anidadas dentro de /admin. */}
          <Route path="users" element={<AdminUserList />} />
          <Route path="barcos" element={<BarcosPage />} />
          <Route
            path="cargas"
            element={<CargasPage userRole={userRole} />}
          />{" "}
          {/* <-- userRole pasado a CargasPage */}
          <Route path="products" element={<ProductPage />} />
          {/* Ruta para editar un usuario específico */}
          <Route path="users/edit/:userId" element={<UserEditPage />} />
          {/* Ruta para editar un barco específico */}
          <Route path="barcos/edit/:boatId" element={<BoatEditPage />} />
          {/* Ruta para editar una carga específica */}
          <Route path="cargas/edit/:loadId" element={<CargasEditPage />} />
          {/* Ruta para editar un producto específico */}
          <Route
            path="products/edit/:productId"
            element={<ProductEditPage />}
          />
          {/* Ruta por defecto para /admin (redirige a /admin/users) */}
          <Route path="/" element={<AdminUserList />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminPanel;
