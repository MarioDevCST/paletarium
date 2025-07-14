import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthHandler from "./components/AuthHandler"; // Importa el nuevo AuthHandler

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Rutas públicas accesibles sin autenticación */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Todas las demás rutas serán manejadas por AuthHandler */}
          {/* AuthHandler contendrá la lógica de autenticación, carga de perfil,
              redirección inicial y las rutas protegidas (dashboard, admin, barcos, etc.) */}
          <Route path="*" element={<AuthHandler />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
