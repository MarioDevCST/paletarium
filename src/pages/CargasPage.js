import React, { useState, useEffect, useCallback } from "react";
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
// import AddPaletForm from './AddPaletForm'; // Ya no se importa aquí

function CargasPage({ userRole }) {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("loadDate"); // Ordenar por fecha de carga por defecto
  const navigate = useNavigate();

  // Estados para el formulario de añadir carga
  const [newLoadDate, setNewLoadDate] = useState("");
  const [newUnloadDate, setNewUnloadDate] = useState("");
  const [newAssociatedBoatId, setNewAssociatedBoatId] = useState("");
  const [newDriverId, setNewDriverId] = useState("");
  const [newStatus, setNewStatus] = useState("pending"); // Nuevo estado para el status, por defecto 'pending'
  const [addLoadMessage, setAddLoadMessage] = useState(null);
  const [addLoadError, setAddLoadError] = useState(null);
  const [showAddLoadForm, setShowAddLoadForm] = useState(false);

  // Estados para el modal de añadir palet (ELIMINADOS DE AQUÍ)
  // const [showAddPaletModal, setShowAddPaletModal] = useState(false);
  // const [selectedLoadForPalet, setSelectedLoadForPalet] = useState(null);

  // Estados para almacenar datos de desplegables
  const [boatsList, setBoatsList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [allUsersMap, setAllUsersMap] = useState({}); // Mapa para userId -> {nombre, email}

  // Opciones para el desplegable de estado
  const statusOptions = ["pending", "completed", "in_transit", "cancelled"]; // Puedes ajustar estos estados

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
          name: data.nombre || data.email, // Usar nombre o email
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

  // Envuelve fetchLoads en useCallback para evitar que cambie en cada render
  const fetchLoads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadsCollectionRef = collection(db, "cargas");
      let q = query(loadsCollectionRef);

      // Si el usuario es 'mozo_almacen', solo mostrar cargas con status 'pending'
      if (userRole === "mozo_almacen") {
        q = query(loadsCollectionRef, where("status", "==", "pending"));
      }

      const querySnapshot = await getDocs(q);

      const loadsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        loadDate: doc.data().loadDate?.toDate(),
        unloadDate: doc.data().unloadDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
      setLoads(loadsList);
    } catch (err) {
      console.error("Error al cargar cargas:", err);
      setError(
        "No se pudieron cargar las cargas. Revisa las reglas de seguridad o tu conexión."
      );
    } finally {
      setLoading(false);
    }
  }, [userRole]); // userRole es una dependencia de fetchLoads

  useEffect(() => {
    fetchLoads();
    fetchBoatsList();
    fetchUsersData();
  }, [fetchLoads]); // Añade fetchLoads como dependencia

  const handleAddLoad = async (e) => {
    e.preventDefault();
    setAddLoadMessage(null);
    setAddLoadError(null);

    // Validaciones
    if (!newLoadDate || !newAssociatedBoatId || !newDriverId || !newStatus) {
      setAddLoadError(
        "Fecha de carga, Barco Asociado, Chofer y Estado son campos obligatorios."
      );
      return;
    }
    if (newUnloadDate && new Date(newUnloadDate) < new Date(newLoadDate)) {
      setAddLoadError(
        "La fecha de descarga no puede ser anterior a la fecha de carga."
      );
      return;
    }

    try {
      const loadsCollectionRef = collection(db, "cargas");
      const currentUserUid = auth.currentUser
        ? auth.currentUser.uid
        : "anonymous";

      const selectedBoat = boatsList.find(
        (boat) => boat.id === newAssociatedBoatId
      );
      const loadName = selectedBoat
        ? `${selectedBoat.name} - ${new Date(newLoadDate).toLocaleDateString(
            "es-ES"
          )}`
        : `Carga - ${new Date(newLoadDate).toLocaleDateString("es-ES")}`;

      await addDoc(loadsCollectionRef, {
        loadName: loadName,
        loadDate: new Date(newLoadDate),
        unloadDate: newUnloadDate ? new Date(newUnloadDate) : null,
        associatedBoatId: newAssociatedBoatId,
        driverId: newDriverId,
        status: newStatus, // Guarda el nuevo campo status
        createdBy: currentUserUid,
        updatedBy: currentUserUid, // Al crear, es el mismo que createdBy
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setAddLoadMessage("Carga añadida exitosamente.");
      setNewLoadDate("");
      setNewUnloadDate("");
      setNewAssociatedBoatId("");
      setNewDriverId("");
      setNewStatus("pending"); // Restablece a 'pending'
      setShowAddLoadForm(false);
      fetchLoads();
    } catch (err) {
      console.error("Error al añadir carga:", err);
      setAddLoadError("Error al añadir el carga. Revisa los permisos.");
    }
  };

  const handleModifyLoad = (loadId) => {
    navigate(`/admin/cargas/edit/${loadId}`); // Redirige a la ruta de edición de la carga
  };

  const handleDeleteLoad = async (loadId, loadName) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar la carga "${loadName}"?`
      )
    ) {
      try {
        const loadDocRef = doc(db, "cargas", loadId);
        await deleteDoc(loadDocRef);
        setLoads((prevLoads) => prevLoads.filter((load) => load.id !== loadId));
        setAddLoadMessage(`Carga "${loadName}" eliminada exitosamente.`);
      } catch (err) {
        console.error("Error al eliminar carga:", err);
        setAddLoadError(
          `No se pudo eliminar la carga "${loadName}". Revisa las reglas de seguridad.`
        );
      }
    }
  };

  // Lógica de filtrado de cargas
  const filteredLoads = loads.filter(
    (load) =>
      load.loadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (boatsList.find((b) => b.id === load.associatedBoatId)?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (allUsersMap[load.driverId]?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (allUsersMap[load.createdBy]?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (load.status &&
        load.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Lógica de ordenación de cargas
  const sortedLoads = [...filteredLoads].sort((a, b) => {
    if (sortBy === "loadName") {
      return a.loadName.localeCompare(b.loadName);
    } else if (sortBy === "loadDate") {
      return (a.loadDate?.getTime() || 0) - (b.loadDate?.getTime() || 0);
    } else if (sortBy === "unloadDate") {
      return (a.unloadDate?.getTime() || 0) - (b.unloadDate?.getTime() || 0);
    } else if (sortBy === "associatedBoatId") {
      const boatNameA =
        boatsList.find((boat) => boat.id === a.associatedBoatId)?.name || "";
      const boatNameB =
        boatsList.find((boat) => boat.id === b.associatedBoatId)?.name || "";
      return boatNameA.localeCompare(boatNameB);
    } else if (sortBy === "driverId") {
      const driverNameA = allUsersMap[a.driverId]?.name || "";
      const driverNameB = allUsersMap[b.driverId]?.name || "";
      return driverNameA.localeCompare(driverNameB);
    } else if (sortBy === "createdBy") {
      const creatorNameA = allUsersMap[a.createdBy]?.name || "";
      const creatorNameB = allUsersMap[b.createdBy]?.name || "";
      return creatorNameA.localeCompare(creatorNameB);
    } else if (sortBy === "status") {
      return (a.status || "").localeCompare(b.status || "");
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

  // Función para obtener el nombre del barco por ID
  const getBoatName = (boatId) => {
    return boatsList.find((boat) => boat.id === boatId)?.name || "N/A";
  };

  // Función para generar un color HSL consistente basado en el ID de la carga
  const getLoadCardColor = (loadId) => {
    let hash = 0;
    for (let i = 0; i < loadId.length; i++) {
      hash = loadId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360); // Hue from 0 to 359

    // Ajusta la saturación y la luminosidad para una buena legibilidad
    const saturation = 70; // %
    const lightness = 60; // %

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Manejador para ir a la página de detalles de la carga
  const handleViewLoadDetails = (loadId) => {
    console.log(
      `CargasPage: Navegando a detalles de carga con ID: /cargas/${loadId}/details`
    ); // <-- Log de depuración
    navigate(`/cargas/${loadId}/details`);
  };

  if (loading) {
    return <p>Cargando lista de cargas...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div>
      <h3>Gestión de Cargas</h3>

      {/* Contenedor para el buscador, ordenar por y botón de crear */}
      <div className="search-sort-create-container">
        <input
          type="text"
          placeholder="Buscar carga por nombre, barco, chofer, estado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="user-search-input"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="user-sort-select"
        >
          <option value="loadDate">Ordenar por Fecha Carga</option>
          <option value="loadName">Ordenar por Nombre Carga</option>
          <option value="associatedBoatId">Ordenar por Barco</option>
          <option value="driverId">Ordenar por Chofer</option>
          <option value="status">Ordenar por Estado</option>
          <option value="createdBy">Ordenar por Creador</option>
          <option value="createdAt">Ordenar por Fecha Creación</option>
          <option value="updatedAt">Ordenar por Fecha Modificación</option>
        </select>
        {/* El botón de crear nueva carga solo para administradores */}
        {userRole === "admin" && (
          <button
            onClick={() => setShowAddLoadForm(!showAddLoadForm)}
            className="create-new-item-button"
          >
            {showAddLoadForm ? "Ocultar Formulario" : "Crear Nueva Carga"}
          </button>
        )}
      </div>

      {/* Formulario para añadir nueva carga (renderizado condicionalmente para admins) */}
      {showAddLoadForm && userRole === "admin" && (
        <div className="add-item-form-container">
          <h4>Añadir Nueva Carga</h4>
          <form onSubmit={handleAddLoad}>
            <div className="form-group">
              <label htmlFor="load-name">Nombre de la Carga:</label>
              <input
                type="text"
                id="load-name"
                value={
                  newLoadDate && newAssociatedBoatId
                    ? `${getBoatName(newAssociatedBoatId)} - ${new Date(
                        newLoadDate
                      ).toLocaleDateString("es-ES")}`
                    : ""
                }
                readOnly
                disabled
                placeholder="Se generará automáticamente"
              />
            </div>
            <div className="form-group">
              <label htmlFor="load-date">Fecha de Carga:</label>
              <input
                type="datetime-local"
                id="load-date"
                value={newLoadDate}
                onChange={(e) => setNewLoadDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="unload-date">Fecha de Descarga (opcional):</label>
              <input
                type="datetime-local"
                id="unload-date"
                value={newUnloadDate}
                onChange={(e) => setNewUnloadDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="associated-boat">Barco Asociado:</label>
              <select
                id="associated-boat"
                value={newAssociatedBoatId}
                onChange={(e) => setNewAssociatedBoatId(e.target.value)}
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
              <label htmlFor="driver">Chofer:</label>
              <select
                id="driver"
                value={newDriverId}
                onChange={(e) => setNewDriverId(e.target.value)}
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
              <label htmlFor="load-status">Estado de la Carga:</label>
              <select
                id="load-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="auth-button">
              Añadir Carga
            </button>
          </form>
          {addLoadMessage && (
            <p className="auth-message success">{addLoadMessage}</p>
          )}
          {addLoadError && <p className="auth-message error">{addLoadError}</p>}
        </div>
      )}

      {/* Renderizado condicional de la vista (Tabla para Admin, Cards para Mozo de Almacén) */}
      {userRole === "mozo_almacen" ? (
        // Vista de Cards para Mozo de Almacén
        <div className="loads-cards-container">
          {sortedLoads.length === 0 && searchTerm !== "" ? (
            <p>No se encontraron cargas que coincidan con la búsqueda.</p>
          ) : sortedLoads.length === 0 && searchTerm === "" ? (
            <p>No hay cargas pendientes de descarga.</p>
          ) : (
            sortedLoads.map((load) => (
              <div
                key={load.id}
                className="load-card"
                style={{ borderLeftColor: getLoadCardColor(load.id) }}
              >
                {" "}
                {/* Aplica el color al borde izquierdo */}
                <div
                  className="card-header"
                  style={{ backgroundColor: getLoadCardColor(load.id) }}
                >
                  {" "}
                  {/* Aplica el color al fondo del header */}
                  <h4>{load.loadName}</h4>
                  <span className={`load-status-${load.status}`}>
                    {load.status === "pending" && "Pendiente"}
                    {load.status === "completed" && "Completada"}
                    {load.status === "in_transit" && "En Tránsito"}
                    {load.status === "cancelled" && "Cancelada"}
                  </span>
                </div>
                <div className="card-body">
                  <p>
                    <strong>Fecha Carga:</strong> {formatDate(load.loadDate)}
                  </p>
                  <p>
                    <strong>Fecha Descarga:</strong>{" "}
                    {formatDate(load.unloadDate)}
                  </p>
                  <p>
                    <strong>Barco:</strong> {getBoatName(load.associatedBoatId)}
                  </p>
                  <p>
                    <strong>Chofer:</strong> {getUserDisplayName(load.driverId)}
                  </p>
                  <p className="card-meta">
                    Creado por: {getUserDisplayName(load.createdBy)}
                  </p>
                </div>
                <div className="card-actions">
                  {/* Botón "Ver Detalles" para mozo de almacén */}
                  {userRole === "mozo_almacen" && (
                    <button
                      onClick={() => handleViewLoadDetails(load.id)}
                      className="add-palet-button"
                    >
                      Ver Detalles
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : // Vista de Tabla para Administrador (y otros roles por defecto)
      sortedLoads.length === 0 && searchTerm !== "" ? (
        <p>No se encontraron cargas que coincidan con la búsqueda.</p>
      ) : sortedLoads.length === 0 && searchTerm === "" ? (
        <p>No hay cargas registradas.</p>
      ) : (
        <table className="admin-user-table">
          <thead>
            <tr>
              <th>Nombre de la Carga</th>
              <th>Fecha Carga</th>
              <th>Fecha Descarga</th>
              <th>Barco Asociado</th>
              <th>Chofer</th>
              <th>Estado</th>
              <th>Creado Por</th>
              <th>Fecha Creación</th>
              <th>Fecha Modificación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedLoads.map((load) => (
              <tr key={load.id}>
                <td>{load.loadName}</td>
                <td>{formatDate(load.loadDate)}</td>
                <td>{formatDate(load.unloadDate)}</td>
                <td>{getBoatName(load.associatedBoatId)}</td>
                <td>{getUserDisplayName(load.driverId)}</td>
                <td>{load.status}</td>
                <td>{getUserDisplayName(load.createdBy)}</td>
                <td>{formatDate(load.createdAt)}</td>
                <td>{formatDate(load.updatedAt)}</td>
                <td>
                  <button
                    onClick={() => handleModifyLoad(load.id)}
                    className="modify-button"
                  >
                    Modificar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal para añadir palet (ELIMINADO DE AQUÍ) */}
      {/* {showAddPaletModal && selectedLoadForPalet && (
        <AddPaletForm
          loadId={selectedLoadForPalet}
          onClose={handleCloseAddPaletModal}
          onPaletAdded={handlePaletAdded}
        />
      )} */}
    </div>
  );
}

export default CargasPage;
