import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({
  children,
  isAuthenticated,
  isApproved,
  isAdmin,
  userRole,
  requiredRole,
  allowPending,
}) {
  // Log para depuración: ver las props que recibe ProtectedRoute
  console.log("ProtectedRoute - Props recibidas:", {
    isAuthenticated,
    isApproved,
    isAdmin,
    userRole,
    requiredRole,
    allowPending,
  });

  // 1. Si no está autenticado, redirige al login
  if (!isAuthenticated) {
    console.log("ProtectedRoute - No autenticado, redirigiendo a /login");
    return <Navigate to="/login" replace />;
  }

  // 2. Si la ruta requiere un rol específico (ej. "admin")
  if (requiredRole) {
    if (userRole !== requiredRole) {
      console.log(
        `ProtectedRoute - Rol requerido: ${requiredRole}, Rol del usuario: ${userRole}. Redirigiendo.`
      );
      // Si el usuario no tiene el rol requerido, redirige según su rol actual
      if (isAdmin) {
        // Si es admin pero no es la ruta /admin (ej. /dashboard)
        return <Navigate to="/admin" replace />;
      } else if (isApproved && userRole === "user") {
        // Si es usuario aprobado pero no admin
        return <Navigate to="/dashboard" replace />;
      } else if (!isApproved && userRole === "user") {
        // Si es usuario pendiente
        return <Navigate to="/pending-approval" replace />;
      }
      return <Navigate to="/login" replace />; // Caso por defecto si algo falla
    }
  } else {
    // 3. Si la ruta NO requiere un rol específico (ej. /dashboard o /pending-approval)
    // Si la ruta NO es /pending-approval y el usuario está pendiente (y no es admin)
    if (!allowPending && !isApproved && !isAdmin) {
      console.log(
        "ProtectedRoute - Usuario pendiente y ruta no permite pendientes, redirigiendo a /pending-approval"
      );
      return <Navigate to="/pending-approval" replace />;
    }
    // Si el usuario es admin y está en una ruta que no es /admin (ej. /dashboard), redirige a /admin
    if (isAdmin && !window.location.pathname.startsWith("/admin")) {
      console.log(
        "ProtectedRoute - Usuario es admin y no está en /admin, redirigiendo a /admin"
      );
      return <Navigate to="/admin" replace />;
    }
    // Si el usuario está aprobado y no es admin, y la ruta es /pending-approval, redirige a /dashboard
    if (
      isApproved &&
      userRole === "user" &&
      window.location.pathname === "/pending-approval"
    ) {
      console.log(
        "ProtectedRoute - Usuario aprobado en /pending-approval, redirigiendo a /dashboard"
      );
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Si todas las condiciones se cumplen, renderiza los componentes hijos
  console.log("ProtectedRoute - Acceso permitido. Renderizando hijos.");
  return children;
}

export default ProtectedRoute;
