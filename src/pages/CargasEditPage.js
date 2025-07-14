import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";

function CargasEditPage() {
  const { loadId } = useParams();
  const navigate = useNavigate();

  const [loadData, setLoadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Estados para los campos del formulario
  const [loadName, setLoadName] = useState("");
  const [loadDate, setLoadDate] = useState("");
  const [unloadDate, setUnloadDate] = useState("");
  const [associatedBoatId, setAssociatedBoatId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [status, setStatus] = useState(""); // <-- Nuevo estado para el status

  // Estados para almacenar datos de desplegables
  const [boatsList, setBoatsList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [allUsersMap, setAllUsersMap] = useState({}); // Mapa para userId -> {nombre, email}

  // Opciones para el desplegable de estado
  const statusOptions = ["pending", "completed", "in_transit", "cancelled"];

  // Función para obtener todos los barcos
  const fetchBoatsList = async () => {
    try {
      const boatsCollectionRef = collection(db, "barcos");
      const q = query(boatsCollectionRef);
      const querySnapshot = await getDocs(q);
      const boats = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        type: doc.data().type,
      }));
      setBoatsList(boats);
    } catch (err) {
      console.error("Error al cargar la lista de barcos:", err);
    }
  };

  // Función para obtener usuarios con rol 'chofer' y todos los usuarios
  const fetchUsersData = async () => {
    try {
      const usersCollectionRef = collection(db, "users");
      const allUsersQuerySnapshot = await getDocs(query(usersCollectionRef));

      const usersMap = {};
      allUsersQuerySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        usersMap[doc.id] = {
          name: data.nombre || data.email,
          email: data.email,
        };
      });
      setAllUsersMap(usersMap);

      const choferUsers = allUsersQuerySnapshot.docs
        .filter((doc) => doc.data().role === "chofer")
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      setDriversList(choferUsers);
    } catch (err) {
      console.error("Error al cargar datos de usuarios:", err);
    }
  };

  useEffect(() => {
    const fetchLoadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const loadDocRef = doc(db, "cargas", loadId);
        const docSnap = await getDoc(loadDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setLoadData(data);
          // Rellenar los estados del formulario con los datos existentes
          setLoadName(data.loadName || "");
          setLoadDate(data.loadDate?.toDate().toISOString().slice(0, 16) || "");
          setUnloadDate(
            data.unloadDate?.toDate().toISOString().slice(0, 16) || ""
          );
          setAssociatedBoatId(data.associatedBoatId || "");
          setDriverId(data.driverId || "");
          setStatus(data.status || "pending"); // <-- Carga el status existente
        } else {
          setError("Carga no encontrada.");
        }
      } catch (err) {
        console.error("Error al cargar datos de la carga:", err);
        setError("Error al cargar los datos de la carga.");
      } finally {
        setLoading(false);
      }
    };

    fetchLoadData();
    fetchBoatsList();
    fetchUsersData();
  }, [loadId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Validaciones
    if (!loadDate || !associatedBoatId || !driverId || !status) {
      // <-- status es obligatorio
      setError(
        "Fecha de carga, Barco Asociado, Chofer y Estado son campos obligatorios."
      );
      return;
    }
    if (unloadDate && new Date(unloadDate) < new Date(loadDate)) {
      setError(
        "La fecha de descarga no puede ser anterior a la fecha de carga."
      );
      return;
    }

    try {
      const loadDocRef = doc(db, "cargas", loadId);
      const currentUserUid = auth.currentUser
        ? auth.currentUser.uid
        : "anonymous";

      // Recalcular loadName si es necesario (ej. si cambia el barco o la fecha de carga)
      const selectedBoat = boatsList.find(
        (boat) => boat.id === associatedBoatId
      );
      const updatedLoadName = selectedBoat
        ? `${selectedBoat.name} - ${new Date(loadDate).toLocaleDateString(
            "es-ES"
          )}`
        : loadName;

      await updateDoc(loadDocRef, {
        loadName: updatedLoadName,
        loadDate: new Date(loadDate),
        unloadDate: unloadDate ? new Date(unloadDate) : null,
        associatedBoatId: associatedBoatId,
        driverId: driverId,
        status: status, // <-- Guarda el status actualizado
        updatedBy: currentUserUid,
        updatedAt: new Date(),
      });
      setMessage("Carga actualizada exitosamente.");
      console.log(`Carga ${loadId} actualizada.`);
      setTimeout(() => navigate("/admin/cargas"), 1500);
    } catch (err) {
      console.error("Error al actualizar carga:", err);
      setError("Error al actualizar la carga. Revisa los permisos.");
    }
  };

  const handleDeleteLoad = async () => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar la carga "${loadData.loadName}"?`
      )
    ) {
      try {
        const loadDocRef = doc(db, "cargas", loadId);
        await deleteDoc(loadDocRef);
        setMessage("Carga eliminada exitosamente.");
        console.log(`Carga ${loadId} eliminada.`);
        setTimeout(() => navigate("/admin/cargas"), 1500);
      } catch (err) {
        console.error("Error al eliminar carga:", err);
        setError(
          `No se pudo eliminar la carga "${loadData.loadName}". Revisa las reglas de seguridad.`
        );
      }
    }
  };

  // Función para obtener el nombre de usuario por ID
  const getUserDisplayName = (userId) => {
    return allUsersMap[userId]?.name || userId || "N/A";
  };

  // Función para obtener el nombre del barco por ID
  const getBoatName = (boatId) => {
    return boatsList.find((boat) => boat.id === boatId)?.name || "N/A";
  };

  if (loading) {
    return <p>Cargando datos de la carga...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!loadData) {
    return <p>No se pudo cargar la información de la carga.</p>;
  }

  return (
    <div className="boat-edit-container">
      {" "}
      {/* Reutilizamos la clase del contenedor de edición */}
      <h3>Editar Carga: {loadData.loadName}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="edit-load-name">Nombre de la Carga:</label>
          <input
            type="text"
            id="edit-load-name"
            value={loadName}
            readOnly
            disabled
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-load-date">Fecha de Carga:</label>
          <input
            type="datetime-local"
            id="edit-load-date"
            value={loadDate}
            onChange={(e) => setLoadDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-unload-date">
            Fecha de Descarga (opcional):
          </label>
          <input
            type="datetime-local"
            id="edit-unload-date"
            value={unloadDate}
            onChange={(e) => setUnloadDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-associated-boat">Barco Asociado:</label>
          <select
            id="edit-associated-boat"
            value={associatedBoatId}
            onChange={(e) => setAssociatedBoatId(e.target.value)}
            required
          >
            <option value="">Selecciona un barco</option>
            {boatsList.map((boat) => (
              <option key={boat.id} value={boat.id}>
                {boat.name} ({boat.type})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="edit-driver">Chofer:</label>
          <select
            id="edit-driver"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            required
          >
            <option value="">Selecciona un chofer</option>
            {driversList.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nombre || user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="edit-load-status">Estado de la Carga:</label>
          <select
            id="edit-load-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Campos de auditoría */}
        <div className="form-group">
          <label>Creado Por:</label>
          <input
            type="text"
            value={getUserDisplayName(loadData.createdBy)}
            disabled
          />
        </div>
        <div className="form-group">
          <label>Fecha Creación:</label>
          <input
            type="text"
            value={
              loadData.createdAt?.toDate().toLocaleString("es-ES") || "N/A"
            }
            disabled
          />
        </div>
        <div className="form-group">
          <label>Modificado Por:</label>
          <input
            type="text"
            value={getUserDisplayName(loadData.updatedBy)}
            disabled
          />
        </div>
        <div className="form-group">
          <label>Fecha Modificación:</label>
          <input
            type="text"
            value={
              loadData.updatedAt?.toDate().toLocaleString("es-ES") || "N/A"
            }
            disabled
          />
        </div>

        <button
          type="submit"
          className="auth-button"
          style={{ marginTop: "20px", width: "100%" }}
        >
          Guardar Cambios
        </button>
        <button
          type="button"
          onClick={handleDeleteLoad}
          className="delete-button"
          style={{ marginTop: "10px", width: "100%" }}
        >
          Eliminar Carga
        </button>
      </form>
      {message && <p className="auth-message success">{message}</p>}
      {error && <p className="auth-message error">{error}</p>}
    </div>
  );
}

export default CargasEditPage;
