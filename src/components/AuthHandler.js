import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import ProtectedRoute from "./ProtectedRoute";
import Header from "./Header"; // Importa el componente Header
import SideMenu from "./SideMenu"; // Importa el componente SideMenu

// Importa tus páginas
import Dashboard from "../pages/Dashboard"; // Asumiendo que tienes una página Dashboard
import AdminPanel from "../pages/AdminPanel";
import PendingApprovalPage from "../pages/PendingApprovalPage";
import BarcosPage from "../pages/BarcosPage";
import CargasPage from "../pages/CargasPage"; // Importa CargasPage
import ProductPage from "../pages/ProductPage";
import LoadPaletSelectionPage from "../pages/LoadPaletSelectionPage";
import CargaDetailPage from "../pages/CargaDetailPage";
import PackingListPage from "../pages/PackingListPage";

import UserEditPage from "../pages/UserEditPage";
import BoatEditPage from "../pages/BoatEditPage";
import CargasEditPage from "../pages/CargasEditPage";
import ProductEditPage from "../pages/ProductEditPage";

function AuthHandler() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log("--- AuthHandler - onAuthStateChanged Triggered ---");
      console.log("AuthHandler - firebaseUser object:", firebaseUser);
      setLoading(true); // Asegura que el estado de carga se active al inicio del cambio de estado de autenticación

      if (firebaseUser) {
        setUser(firebaseUser);
        console.log(
          "AuthHandler - Usuario de Auth detectado (UID):",
          firebaseUser.uid
        );

        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserProfile(userData);
            console.log(
              "AuthHandler - Perfil de usuario de Firestore cargado:",
              userData
            );
            console.log(
              "AuthHandler - Rol del usuario cargado:",
              userData.role
            );
          } else {
            console.warn(
              "AuthHandler - Perfil de usuario no encontrado en Firestore para UID:",
              firebaseUser.uid
            );
            setUserProfile(null);
            // Si no hay perfil de Firestore, forzar cierre de sesión
            await auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error(
            "AuthHandler - Error al cargar el perfil de usuario de Firestore:",
            error
          );
          setUserProfile(null);
          await auth.signOut();
          setUser(null);
        } finally {
          setLoading(false); // Establece loading a false solo después de intentar cargar el perfil
          console.log("--- AuthHandler - onAuthStateChanged Finished ---");
        }
      } else {
        setUser(null);
        setUserProfile(null);
        console.log("AuthHandler - No hay usuario logeado.");
        setLoading(false); // También establece a false si no hay usuario logeado
        console.log("--- AuthHandler - onAuthStateChanged Finished ---");
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  // Redirige a /login si no hay usuario autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario está autenticado pero su perfil aún no se ha cargado/determinado
  // Esto es una capa de seguridad extra si 'loading' se resuelve antes que 'userProfile'
  if (!userProfile) {
    console.log(
      "AuthHandler - Usuario autenticado pero perfil no cargado, mostrando 'Preparando sesión...'"
    );
    return <div>Preparando sesión...</div>;
  }

  // Si el usuario está autenticado pero su perfil no está aprobado y no es admin, redirige a pending-approval
  if (userProfile.status === "pending" && userProfile.role !== "admin") {
    // Si ya está en /pending-approval, no redirigir para evitar bucles
    if (window.location.pathname !== "/pending-approval") {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  return (
    <div className="app-container-logged-in">
      <Header user={user} userProfile={userProfile} />{" "}
      {/* Pasa user y userProfile al Header */}
      <div className="app-content-logged-in">
        <SideMenu userRole={userProfile?.role} />{" "}
        {/* Pasa el rol al SideMenu */}
        <main className="main-content-logged-in">
          <Routes>
            {/* Rutas accesibles para todos los usuarios autenticados y aprobados */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/barcos"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <BarcosPage userRole={userProfile?.role} />{" "}
                  {/* Pasa el rol a BarcosPage */}
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
                  {/* Pasa el objeto userProfile completo a CargasPage */}
                  <CargasPage userProfile={userProfile} />
                </ProtectedRoute>
              }
            />
            {/* Ruta para la página de detalles de una carga específica */}
            <Route
              path="/cargas/detail/:loadId"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <CargaDetailPage userRole={userProfile?.role} />{" "}
                  {/* <-- Ruta para CargaDetailPage */}
                </ProtectedRoute>
              }
            />
            {/* Nueva ruta para la selección de palets */}
            <Route
              path="/cargas/select-palets/:loadId"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <LoadPaletSelectionPage userRole={userProfile?.role} />{" "}
                  {/* <-- Nueva ruta */}
                </ProtectedRoute>
              }
            />
            {/* NUEVA RUTA PARA EL PACKING LIST */}
            <Route
              path="/cargas/packing-list/:loadId"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                >
                  <PackingListPage /> {/* <-- NUEVA RUTA */}
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
                  <ProductPage userRole={userProfile?.role} />{" "}
                  {/* Pasa el rol a ProductPage */}
                </ProtectedRoute>
              }
            />

            {/* Rutas protegidas para administradores */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                  requiredRole="admin"
                >
                  {/* Pasa userProfile a AdminPanel */}
                  <AdminPanel userProfile={userProfile} />
                </ProtectedRoute>
              }
            />

            {/* Rutas de edición (accesibles por admin o por el propio usuario en algunos casos, según las reglas de Firestore) */}
            <Route
              path="/admin/users/edit/:userId"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                  requiredRole="admin" // Solo admin puede editar usuarios
                >
                  <UserEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/barcos/edit/:boatId"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                  requiredRole="admin"
                >
                  <BoatEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cargas/edit/:loadId"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                  requiredRole="admin" // Solo admin puede editar cargas
                >
                  <CargasEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products/edit/:productId"
              element={
                <ProtectedRoute
                  isAuthenticated={!!user}
                  isApproved={userProfile?.status === "approved"}
                  isAdmin={userProfile?.role === "admin"}
                  userRole={userProfile?.role}
                  requiredRole="admin" // Solo admin puede editar productos
                >
                  <ProductEditPage />
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

            {/* Redirige a /dashboard si el usuario está logeado y aprobado y accede a la raíz */}
            {user && userProfile?.status === "approved" && (
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            )}
            {/* Redirige a /admin/users si el usuario es admin y accede a la raíz o a /admin */}
            {user && userProfile?.role === "admin" && (
              <Route
                path="/admin"
                element={<Navigate to="/admin/users" replace />}
              />
            )}
            {user && userProfile?.role === "admin" && (
              <Route
                path="/"
                element={<Navigate to="/admin/users" replace />}
              />
            )}

            {/* Cualquier otra ruta no definida */}
            <Route path="*" element={<div>404 - Página no encontrada</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default AuthHandler;
