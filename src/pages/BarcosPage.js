import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function BarcosPage() {
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name"); // Ordenar por nombre por defecto
  const navigate = useNavigate();

  // Estados para el formulario de añadir barco
  const [newBoatName, setNewBoatName] = useState("");
  const [newBoatType, setNewBoatType] = useState("");
  const [newBoatResponsibleId, setNewBoatResponsibleId] = useState("");
  const [addBoatMessage, setAddBoatMessage] = useState(null);
  const [addBoatError, setAddBoatError] = useState(null);
  const [showAddBoatForm, setShowAddBoatForm] = useState(false);

  // Estados para almacenar usuarios con rol 'oficina' y un mapa de todos los usuarios
  const [responsibleUsers, setResponsibleUsers] = useState([]);
  const [allUsersMap, setAllUsersMap] = useState({}); // Mapa para userId -> {nombre, email}

  // Opciones de tipos de barco
  const typeOptions = ["Mercante", "Ferry", "Crucero"];

  // Función para obtener usuarios con rol 'oficina' y todos los usuarios
  const fetchUsersData = async () => {
    try {
      const usersCollectionRef = collection(db, "users");
      const allUsersQuerySnapshot = await getDocs(query(usersCollectionRef));

      const usersMap = {};
      allUsersQuerySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        usersMap[doc.id] = {
          name: data.nombre || data.email, // Usar nombre o email
          email: data.email,
        };
      });
      setAllUsersMap(usersMap);
      console.log("Mapa de todos los usuarios cargado:", usersMap);

      // Filtrar para usuarios con rol 'oficina'
      const officeUsers = allUsersQuerySnapshot.docs
        .filter((doc) => doc.data().role === "oficina")
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      setResponsibleUsers(officeUsers);
      console.log("Usuarios responsables (Oficina) cargados:", officeUsers);
    } catch (err) {
      console.error("Error al cargar datos de usuarios:", err);
    }
  };

  const fetchBoats = async () => {
    setLoading(true);
    setError(null);
    try {
      const boatsCollectionRef = collection(db, "barcos");
      const q = query(boatsCollectionRef);
      const querySnapshot = await getDocs(q);

      const boatsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
      setBoats(boatsList);
      console.log("Barcos cargados:", boatsList);
    } catch (err) {
      console.error("Error al cargar barcos:", err);
      setError(
        "No se pudieron cargar los barcos. Revisa las reglas de seguridad o tu conexión."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoats();
    fetchUsersData(); // Cargar todos los usuarios y los responsables al montar el componente
  }, []);

  const handleAddBoat = async (e) => {
    e.preventDefault();
    setAddBoatMessage(null);
    setAddBoatError(null);

    if (!newBoatName || !newBoatType || !newBoatResponsibleId) {
      setAddBoatError("Nombre, Tipo y Responsable son campos obligatorios.");
      return;
    }

    try {
      const boatsCollectionRef = collection(db, "barcos");
      const currentUserUid = auth.currentUser
        ? auth.currentUser.uid
        : "anonymous";

      await addDoc(boatsCollectionRef, {
        name: newBoatName,
        type: newBoatType,
        responsibleId: newBoatResponsibleId,
        createdBy: currentUserUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setAddBoatMessage("Barco añadido exitosamente.");
      setNewBoatName("");
      setNewBoatType("");
      setNewBoatResponsibleId("");
      setShowAddBoatForm(false);
      fetchBoats();
    } catch (err) {
      console.error("Error al añadir barco:", err);
      setAddBoatError("Error al añadir el barco. Revisa los permisos.");
    }
  };

  const handleModifyBoat = (boatId) => {
    navigate(`/admin/barcos/edit/${boatId}`);
  };

  // Lógica de filtrado de barcos
  const filteredBoats = boats.filter(
    (boat) =>
      boat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (boat.type &&
        boat.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (boat.responsibleId &&
        (allUsersMap[boat.responsibleId]?.name || boat.responsibleId)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) || // Busca por nombre de responsable
      (boat.createdBy &&
        (allUsersMap[boat.createdBy]?.name || boat.createdBy)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) // Busca por nombre de creador
  );

  // Lógica de ordenación de barcos
  const sortedBoats = [...filteredBoats].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "type") {
      return (a.type || "").localeCompare(b.type || "");
    } else if (sortBy === "responsibleId") {
      const nameA = allUsersMap[a.responsibleId]?.name || "";
      const nameB = allUsersMap[b.responsibleId]?.name || "";
      return nameA.localeCompare(nameB);
    } else if (sortBy === "createdBy") {
      const nameA = allUsersMap[a.createdBy]?.name || "";
      const nameB = allUsersMap[b.createdBy]?.name || "";
      return nameA.localeCompare(nameB);
    } else if (sortBy === "createdAt") {
      return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
    } else if (sortBy === "updatedAt") {
      return (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0);
    }
    return 0;
  });

  // Función para formatear fechas
  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Función para obtener el nombre de usuario por ID
  const getUserDisplayName = (userId) => {
    return allUsersMap[userId]?.name || userId || "N/A";
  };

  if (loading) {
    return <p>Cargando lista de barcos...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div>
      <h3>Gestión de Barcos</h3>

      <div className="search-sort-create-container">
        <input
          type="text"
          placeholder="Buscar barco por nombre, tipo, responsable..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="user-search-input"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="user-sort-select"
        >
          <option value="name">Ordenar por Nombre</option>
          <option value="type">Ordenar por Tipo</option>
          <option value="responsibleId">Ordenar por Responsable</option>
          <option value="createdBy">Ordenar por Creador</option>
          <option value="createdAt">Ordenar por Fecha Creación</option>
          <option value="updatedAt">Ordenar por Fecha Modificación</option>
        </select>
        <button
          onClick={() => setShowAddBoatForm(!showAddBoatForm)}
          className="create-new-item-button"
        >
          {showAddBoatForm ? "Ocultar Formulario" : "Crear Nuevo Barco"}
        </button>
      </div>

      {showAddBoatForm && (
        <div className="add-item-form-container">
          <h4>Añadir Nuevo Barco</h4>
          <form onSubmit={handleAddBoat}>
            <div className="form-group">
              <label htmlFor="boat-name">Nombre:</label>
              <input
                type="text"
                id="boat-name"
                value={newBoatName}
                onChange={(e) => setNewBoatName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="boat-type">Tipo:</label>
              <select
                id="boat-type"
                value={newBoatType}
                onChange={(e) => setNewBoatType(e.target.value)}
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
              <label htmlFor="boat-responsible">Responsable (Oficina):</label>
              <select
                id="boat-responsible"
                value={newBoatResponsibleId}
                onChange={(e) => setNewBoatResponsibleId(e.target.value)}
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
            <button type="submit" className="auth-button">
              Añadir Barco
            </button>
          </form>
          {addBoatMessage && (
            <p className="auth-message success">{addBoatMessage}</p>
          )}
          {addBoatError && <p className="auth-message error">{addBoatError}</p>}
        </div>
      )}

      {sortedBoats.length === 0 && searchTerm !== "" ? (
        <p>No se encontraron barcos que coincidan con la búsqueda.</p>
      ) : sortedBoats.length === 0 && searchTerm === "" ? (
        <p>No hay barcos registrados.</p>
      ) : (
        <table className="admin-user-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Responsable</th>
              <th>Creado Por</th>
              <th>Fecha Creación</th>
              <th>Fecha Modificación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedBoats.map((boat) => (
              <tr key={boat.id}>
                <td>{boat.name}</td>
                <td>{boat.type || "N/A"}</td>
                <td>{getUserDisplayName(boat.responsibleId)}</td>{" "}
                {/* Muestra el nombre del responsable */}
                <td>{getUserDisplayName(boat.createdBy)}</td>{" "}
                {/* Muestra el nombre del creador */}
                <td>{formatDate(boat.createdAt)}</td>
                <td>{formatDate(boat.updatedAt)}</td>
                <td>
                  <button
                    onClick={() => handleModifyBoat(boat.id)}
                    className="modify-button"
                  >
                    Modificar
                  </button>
                  {/* Botón Eliminar ha sido eliminado */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default BarcosPage;
