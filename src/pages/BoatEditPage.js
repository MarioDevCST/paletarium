import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

function BoatEditPage() {
  const { boatId } = useParams(); // Obtiene el ID del barco de la URL
  const navigate = useNavigate(); // Para redirigir después de guardar o eliminar

  const [boatData, setBoatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Estados para los campos del formulario
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [status, setStatus] = useState(""); // Aunque no se usa en BarcosPage, lo mantengo por si se necesita en el futuro

  // Nuevo estado para almacenar los usuarios con rol 'oficina' para el desplegable de responsable
  const [responsibleUsers, setResponsibleUsers] = useState([]);

  // Opciones de tipos y estados
  const typeOptions = ["Mercante", "Ferry", "Crucero"]; // <-- Opciones de tipo de barco actualizadas
  const statusOptions = ["available", "on-route", "maintenance"]; // Mantengo por si se usa en el futuro

  // Función para obtener usuarios con rol 'oficina'
  const fetchResponsibleUsers = async () => {
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, where("role", "==", "oficina"));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setResponsibleUsers(usersList);
    } catch (err) {
      console.error("Error al cargar usuarios responsables:", err);
    }
  };

  useEffect(() => {
    const fetchBoatData = async () => {
      setLoading(true);
      setError(null);
      try {
        const boatDocRef = doc(db, "barcos", boatId);
        const docSnap = await getDoc(boatDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBoatData(data);
          // Rellenar los estados del formulario con los datos existentes
          setName(data.name || "");
          setType(data.type || "");
          setResponsibleId(data.responsibleId || "");
          setStatus(data.status || "available"); // Asigna un valor por defecto si no existe
        } else {
          setError("Barco no encontrado.");
        }
      } catch (err) {
        console.error("Error al cargar datos del barco:", err);
        setError("Error al cargar los datos del barco.");
      } finally {
        setLoading(false);
      }
    };

    fetchBoatData();
    fetchResponsibleUsers(); // Cargar usuarios responsables al montar el componente
  }, [boatId]); // Se ejecuta cada vez que cambia el boatId en la URL

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Validación básica para los campos requeridos
    if (!name || !type || !responsibleId) {
      setError("Nombre, Tipo y Responsable son campos obligatorios.");
      return;
    }

    try {
      const boatDocRef = doc(db, "barcos", boatId);
      await updateDoc(boatDocRef, {
        name: name,
        type: type,
        responsibleId: responsibleId,
        status: status, // Actualiza el estado (si se decide usarlo)
        updatedAt: new Date(), // Actualiza la fecha de modificación
      });
      setMessage("Barco actualizado exitosamente.");
      console.log(`Barco ${boatId} actualizado.`);
      // Redirigir de vuelta a la lista de barcos después de un breve retraso
      setTimeout(() => navigate("/admin/barcos"), 1500);
    } catch (err) {
      console.error("Error al actualizar barco:", err);
      setError("Error al actualizar el barco. Revisa los permisos.");
    }
  };

  const handleDeleteBoat = async () => {
    // Confirmación antes de eliminar
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el barco "${name}"?`
      )
    ) {
      try {
        const boatDocRef = doc(db, "barcos", boatId);
        await deleteDoc(boatDocRef); // Elimina el documento de Firestore

        setMessage("Barco eliminado exitosamente.");
        console.log(`Barco ${boatId} eliminado.`);

        // Redirigir a la lista de barcos
        setTimeout(() => navigate("/admin/barcos"), 1500);
      } catch (err) {
        console.error("Error al eliminar barco:", err);
        setError(
          `No se pudo eliminar el barco "${name}". Revisa las reglas de seguridad.`
        );
      }
    }
  };

  if (loading) {
    return <p>Cargando datos del barco...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!boatData) {
    return <p>No se pudo cargar la información del barco.</p>;
  }

  return (
    <div className="boat-edit-container">
      {" "}
      {/* Clase para estilos */}
      <h3>Editar Barco: {boatData.name}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="edit-boat-name">Nombre:</label>
          <input
            type="text"
            id="edit-boat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-boat-type">Tipo:</label>
          <select
            id="edit-boat-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          >
            <option value="">Selecciona un tipo</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="edit-boat-responsible">Responsable (Oficina):</label>
          <select
            id="edit-boat-responsible"
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
            required
          >
            <option value="">Selecciona un responsable</option>
            {responsibleUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nombre || user.email}{" "}
                {/* Muestra solo el nombre o email */}
              </option>
            ))}
          </select>
        </div>
        {/* Puedes añadir el campo de estado si decides usarlo en el futuro */}
        {/* <div className="form-group">
          <label htmlFor="edit-boat-status">Estado:</label>
          <select id="edit-boat-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div> */}

        <button
          type="submit"
          className="auth-button"
          style={{ marginTop: "20px", width: "100%" }}
        >
          Guardar Cambios
        </button>
        <button
          type="button"
          onClick={handleDeleteBoat}
          className="delete-button"
          style={{ marginTop: "10px", width: "100%" }}
        >
          Eliminar Barco
        </button>
      </form>
      {message && <p className="auth-message success">{message}</p>}
      {error && <p className="auth-message error">{error}</p>}
    </div>
  );
}

export default BoatEditPage;
