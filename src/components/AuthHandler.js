import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom"; // Importa useLocation
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

import Header from "./Header";
import SideMenu from "./SideMenu";
import ProtectedRoute from "./ProtectedRoute";

// Importa tus páginas
import AdminPanel from "../pages/AdminPanel";
import BarcosPage from "../pages/BarcosPage";
import CargasPage from "../pages/CargasPage";
import ProductPage from "../pages/ProductPage";
import PendingApprovalPage from "../pages/PendingApprovalPage";
import CargaDetailPage from "../pages/CargaDetailPage"; // <-- Importa la nueva página de detalles de carga
import LoadPaletSelectionPage from "../pages/LoadPaletSelectionPage"; // <-- Importa LoadPaletSelectionPage

// Componente para el dashboard de usuario normal
const UserDashboardPage = () => (
  <div className="main-content-logged-in">
    <p style={{ color: "green", textAlign: "center", marginTop: "50px" }}>
      ¡Bienvenido! Tu cuenta ha sido aprobada.
    </p>
    <p style={{ textAlign: "center" }}>
      Contenido principal de la aplicación para usuarios.
    </p>
  </div>
);

function AuthHandler() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // Indica si la comprobación de auth ha terminado
  const location = useLocation(); // Hook para obtener la ubicación actual

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log("--- onAuthStateChanged Triggered in AuthHandler ---");
      console.log("firebaseUser object:", firebaseUser);

      if (firebaseUser) {
        setUser(firebaseUser);
        console.log(
          "AuthHandler: Usuario de Auth detectado (UID):",
          firebaseUser.uid
        );

        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserProfile(userData);
            console.log(
              "AuthHandler: Perfil de usuario de Firestore cargado:",
              userData
            );
            console.log("AuthHandler: Rol del usuario cargado:", userData.role);
          } else {
            console.warn(
              "AuthHandler: Perfil de usuario no encontrado en Firestore para UID:",
              firebaseUser.uid
            );
            // Si el usuario existe en Auth pero no en Firestore, cerrar su sesión.
            await auth.signOut();
            setUser(null);
            setUserProfile(null);
          }
        } catch (error) {
          console.error(
            "AuthHandler: Error al cargar el perfil de usuario de Firestore:",
            error
          );
          await auth.signOut();
          setUser(null);
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        console.log("AuthHandler: No hay usuario logeado.");
      }
      setAuthChecked(true); // La comprobación de autenticación ha finalizado
      console.log("--- onAuthStateChanged Finished in AuthHandler ---");
    });

    return () => unsubscribe();
  }, []);

  // Mostrar un estado de carga hasta que la comprobación de autenticación inicial se complete
  if (!authChecked) {
    console.log("AuthHandler: Comprobación de autenticación en curso...");
    return <div>Cargando aplicación...</div>;
  }

  // Si no hay usuario autenticado después de la comprobación, redirigir al login
  if (!user) {
    console.log("AuthHandler: No autenticado, redirigiendo a /login");
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario pero no userProfile (esto no debería pasar si la lógica de arriba funciona, pero es un fallback)
  if (!userProfile) {
    console.log("AuthHandler: Usuario autenticado pero perfil no cargado.");
    return <div>Cargando perfil de usuario...</div>;
  }

  // Lógica de redirección basada en el rol y estado del usuario logeado
  let targetPath = "/dashboard";
  if (userProfile.status === "pending") {
    targetPath = "/pending-approval";
  } else if (userProfile.role === "admin") {
    targetPath = "/admin";
  }

  // Si el usuario está pendiente de aprobación, solo renderizamos la PendingApprovalPage
  // y redirigimos a ella si no está ya en esa ruta.
  if (userProfile.status === "pending") {
    console.log(
      "AuthHandler: Usuario pendiente de aprobación. Path actual:",
      location.pathname,
      "Target path:",
      targetPath
    );
    return location.pathname === "/pending-approval" ? (
      <PendingApprovalPage />
    ) : (
      <Navigate to="/pending-approval" replace />
    );
  }

  console.log(
    "AuthHandler: Usuario aprobado/admin. Renderizando layout principal. Path actual:",
    location.pathname
  );
  console.log("AuthHandler: Rutas a renderizar. User role:", userProfile?.role);
  console.log(
    "AuthHandler: Location pathname antes de Routes:",
    location.pathname
  ); // <-- Nuevo log
  console.log("AuthHandler: UserProfile antes de Routes:", userProfile); // <-- Nuevo log

  // Si el usuario está aprobado o es admin, renderizamos el layout completo
  return (
    <>
      <Header user={user} userProfile={userProfile} />
      <div className="app-content-logged-in">
        <SideMenu userRole={userProfile?.role} />
        <main className="main-content-logged-in">
          <Routes>
            {/* Redirección inicial desde la raíz si el usuario no está en su ruta correcta */}
            <Route path="/" element={<Navigate to={targetPath} replace />} />

            {/* Rutas protegidas para usuarios autenticados y aprobados */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Rutas protegidas para administradores */}
            <Route
              path="/admin/*" // Esta ruta maneja todas las sub-rutas de /admin
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                  requiredRole="admin"
                >
                  <AdminPanel userRole={userProfile?.role} />{" "}
                  {/* <-- userRole pasado a AdminPanel */}
                </ProtectedRoute>
              }
            />

            {/* Otras rutas protegidas (no bajo /admin) */}
            <Route
              path="/barcos"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <BarcosPage userRole={userProfile?.role} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cargas"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <CargasPage userRole={userProfile?.role} />
                </ProtectedRoute>
              }
            />
            {/* Nueva ruta para el detalle de la carga */}
            <Route
              path="/cargas/:loadId/details"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <CargaDetailPage userRole={userProfile?.role} />
                </ProtectedRoute>
              }
            />
            {/* Ruta para la selección de palets */}
            <Route
              path="/cargas/select-palets/:loadId" // <-- Asegúrate de que esta ruta esté aquí
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <LoadPaletSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <ProductPage userRole={userProfile?.role} />
                </ProtectedRoute>
              }
            />

            {/* Ruta para cuentas pendientes de aprobación */}
            <Route
              path="/pending-approval"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                  allowPending={true}
                >
                  <PendingApprovalPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback para cualquier ruta no coincidente cuando está logeado y aprobado/admin */}
            <Route path="*" element={<div>404 - Página no encontrada</div>} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default AuthHandler;
