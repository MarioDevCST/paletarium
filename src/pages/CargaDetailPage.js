import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  deleteDoc,
} from "firebase/firestore"; // Importa deleteDoc

import ManagePaletProductsModal from "../components/ManagePaletProductsModal";
import PaletViewModal from "../components/PaletViewModal"; // Importa el PaletViewModal

function CargaDetailPage({ userRole }) {
  const { loadId } = useParams();
  const navigate = useNavigate();

  console.log("CargaDetailPage: Componente montado. loadId:", loadId); // <-- Log de depuración

  const [loadData, setLoadData] = useState(null);
  const [palets, setPalets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showManagePaletModal, setShowManagePaletModal] = useState(false);
  const [editingPaletId, setEditingPaletId] = useState(null);
  const [initialPaletProducts, setInitialPaletProducts] = useState([]);

  const [showPaletViewModal, setShowPaletViewModal] = useState(false);
  const [viewingPaletData, setViewingPaletData] = useState(null);

  const [allUsersMap, setAllUsersMap] = useState({}); // Mapa para userId -> {nombre, email}
  const [boatsList, setBoatsList] = useState([]); // Lista de barcos para mostrar el nombre
  const [currentBoatName, setCurrentBoatName] = useState("Cargando Barco..."); // Nuevo estado para el nombre del barco
  const [productsMap, setProductsMap] = useState({}); // Mapa para productId -> productData

  // Función para obtener todos los usuarios, barcos y productos
  useEffect(() => {
    const fetchAuxiliaryData = async () => {
      try {
        // Fetch Users
        const usersCollectionRef = collection(db, "users");
        const usersQuerySnapshot = await getDocs(query(usersCollectionRef));
        const usersMap = {};
        usersQuerySnapshot.docs.forEach((doc) => {
          const data = doc.data();
          usersMap[doc.id] = {
            name: data.nombre || data.email,
            email: data.email,
          };
        });
        setAllUsersMap(usersMap);

        // Fetch Products for productsMap
        const productsCollectionRef = collection(db, "productos");
        const productsQuerySnapshot = await getDocs(
          query(productsCollectionRef)
        );
        const pMap = {};
        productsQuerySnapshot.docs.forEach((doc) => {
          pMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        setProductsMap(pMap);

        // Fetch Boats
        const boatsCollectionRef = collection(db, "barcos");
        const boatsQuerySnapshot = await getDocs(query(boatsCollectionRef));
        const boats = boatsQuerySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          type: doc.data().type,
        }));
        setBoatsList(boats);
        console.log("CargaDetailPage - boatsList fetched:", boats);
      } catch (err) {
        console.error("Error al cargar datos auxiliares:", err);
      }
    };
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const loadDocRef = doc(db, "cargas", loadId);

    // Listener para la carga principal
    const unsubscribeLoad = onSnapshot(
      loadDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLoadData({ id: docSnap.id, ...data });
          console.log("CargaDetailPage - loadData fetched:", {
            id: docSnap.id,
            ...data,
          });
        } else {
          setError("Carga no encontrada.");
          setLoadData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error al escuchar cambios en la carga:", err);
        setError("Error al cargar los detalles de la carga.");
        setLoading(false);
      }
    );

    // Listener para los palets asociados a esta carga
    const paletsCollectionRef = collection(db, "palets");
    const qPalets = query(paletsCollectionRef, where("cargaId", "==", loadId));

    const unsubscribePalets = onSnapshot(
      qPalets,
      (snapshot) => {
        const paletsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPalets(paletsList);
      },
      (err) => {
        console.error("Error al escuchar cambios en palets:", err);
        setError("Error al cargar los palets asociados.");
      }
    );

    return () => {
      unsubscribeLoad();
      unsubscribePalets();
    };
  }, [loadId]);

  // Nuevo useEffect para establecer currentBoatName una vez que loadData y boatsList estén disponibles
  useEffect(() => {
    if (loadData && boatsList.length > 0) {
      const name = getBoatName(loadData.associatedBoatId);
      setCurrentBoatName(name);
      console.log("CargaDetailPage - currentBoatName updated:", name);
    } else if (loadData && boatsList.length === 0 && !loading) {
      // Si boatsList está vacío después de cargar
      setCurrentBoatName("Barco Desconocido (no encontrado)");
    }
  }, [loadData, boatsList, loading]); // Depende de loadData, boatsList y el estado de carga

  const handleOpenManagePaletModal = (palet = null) => {
    if (palet) {
      setEditingPaletId(palet.id);
      setInitialPaletProducts(palet.productosContenidos || []);
    } else {
      setEditingPaletId(null);
      setInitialPaletProducts([]);
    }
    setShowManagePaletModal(true);
  };

  const handleCloseManagePaletModal = () => {
    setShowManagePaletModal(false);
    setEditingPaletId(null);
    setInitialPaletProducts([]);
  };

  const handlePaletUpdated = () => {
    // Esto disparará la re-lectura de palets debido al onSnapshot
    // y la UI se actualizará automáticamente.
    console.log("Palet actualizado, la UI se refrescará automáticamente.");
  };

  const handleOpenPaletViewModal = (palet) => {
    setViewingPaletData(palet);
    setShowPaletViewModal(true);
  };

  const handleClosePaletViewModal = () => {
    setShowPaletViewModal(false);
    setViewingPaletData(null);
  };

  const handleGoToRealizarCarga = () => {
    navigate(`/cargas/select-palets/${loadId}`);
  };

  // Función para obtener el nombre de usuario por ID
  const getUserDisplayName = (userId) => {
    return allUsersMap[userId]?.name || userId || "N/A";
  };

  // Función para obtener el nombre del barco por ID
  const getBoatName = (boatId) => {
    const foundBoat = boatsList.find((boat) => boat.id === boatId);
    console.log(
      `CargaDetailPage - getBoatName called for ID: ${boatId}, found: ${
        foundBoat ? foundBoat.name : "N/A"
      }`
    );
    return foundBoat?.name || "N/A";
  };

  // Función para formatear fechas
  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toDate().toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Función para obtener el nombre del producto por ID (usando productsMap)
  const getProductName = (productId) => {
    return productsMap[productId]?.name || "Producto Desconocido";
  };

  // Función para obtener la unidad del producto por ID (usando productsMap)
  const getProductUnit = (productId) => {
    return productsMap[productId]?.unit?.toLowerCase() || "unidades";
  };

  // Función para eliminar un palet
  const handleDeletePalet = async (e, paletIdToDelete, paletName) => {
    e.stopPropagation(); // Evita que se abra el modal de vista del palet al hacer clic en el botón de eliminar
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el palet "${paletName}"?`
      )
    ) {
      try {
        const paletDocRef = doc(db, "palets", paletIdToDelete);
        await deleteDoc(paletDocRef);
        console.log(`Palet ${paletIdToDelete} eliminado exitosamente.`);
        // onSnapshot se encargará de actualizar la lista de palets automáticamente
      } catch (err) {
        console.error("Error al eliminar palet:", err);
        setError(
          `No se pudo eliminar el palet "${paletName}". Revisa las reglas de seguridad.`
        );
      }
    }
  };

  if (loading) {
    return <p>Cargando detalles de la carga...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!loadData) {
    return <p>No se pudo cargar la información de la carga.</p>;
  }

  return (
    <div className="load-detail-container">
      <button onClick={() => navigate("/cargas")} className="back-button">
        Volver a Cargas
      </button>
      <h3>Detalles de Carga: {loadData.loadName}</h3>

      <div
        className="load-info-card"
        style={{
          borderLeftColor:
            loadData.status === "completed"
              ? "#28a745"
              : loadData.status === "in_transit"
              ? "#ffc107"
              : "#007bff",
        }}
      >
        <div
          className="card-header"
          style={{
            backgroundColor:
              loadData.status === "completed"
                ? "#28a745"
                : loadData.status === "in_transit"
                ? "#ffc107"
                : "#007bff",
          }}
        >
          <h4>Información de la Carga</h4>
          <span className={`load-status-${loadData.status}`}>
            {loadData.status === "pending" && "Pendiente"}
            {loadData.status === "completed" && "Completada"}
            {loadData.status === "in_transit" && "En Tránsito"}
            {loadData.status === "cancelled" && "Cancelada"}
          </span>
        </div>
        <div className="card-body">
          <p>
            <strong>Fecha de Carga:</strong> {formatDate(loadData.loadDate)}
          </p>
          <p>
            <strong>Fecha de Descarga:</strong>{" "}
            {loadData.unloadDate
              ? formatDate(loadData.unloadDate)
              : "Pendiente"}
          </p>
          <p>
            <strong>Barco Asociado:</strong> {currentBoatName}
          </p>{" "}
          {/* Muestra el nombre del barco */}
          <p>
            <strong>Chofer:</strong> {getUserDisplayName(loadData.driverId)}
          </p>
          <div className="card-meta">
            <p>
              Creado Por: {getUserDisplayName(loadData.createdBy)} el{" "}
              {formatDate(loadData.createdAt)}
            </p>
            <p>
              Última Modificación Por: {getUserDisplayName(loadData.updatedBy)}{" "}
              el {formatDate(loadData.updatedAt)}
            </p>
          </div>
        </div>
        <div className="card-actions">
          {userRole === "admin" && (
            <button
              onClick={() => navigate(`/admin/cargas/edit/${loadId}`)}
              className="modify-button"
            >
              Editar Carga
            </button>
          )}
          {userRole === "mozo_almacen" && loadData.status !== "completed" && (
            <button
              onClick={handleGoToRealizarCarga}
              className="complete-load-button"
            >
              Realizar Carga
            </button>
          )}
        </div>
      </div>

      <h4>Palets en esta Carga:</h4>
      <button
        onClick={() => handleOpenManagePaletModal()}
        className="add-palet-button"
        style={{ marginBottom: "20px" }}
      >
        Añadir Nuevo Palet
      </button>

      {palets.length === 0 ? (
        <p>Esta carga no tiene palets asociados.</p>
      ) : (
        <div className="palets-list-container">
          {palets.map((palet) => (
            <div
              key={palet.id}
              className={`palet-card palet-card-type-${palet.tipoPalet}`}
              onClick={() => handleOpenPaletViewModal(palet)}
            >
              <div
                className={`palet-card-header palet-header-type-${palet.tipoPalet}`}
              >
                <h5>{palet.nombre}</h5>
                <span className={`palet-type-${palet.tipoPalet}`}>
                  {palet.tipoPalet}
                </span>
              </div>
              <div className="palet-card-body">
                <p>
                  <strong>Número de Palet:</strong> {palet.numeroPalet}
                </p>
                <p>
                  <strong>Estado:</strong> {palet.status || "N/A"}
                </p>
                {/* Listado de productos asociados al palet */}
                {palet.productosContenidos &&
                palet.productosContenidos.length > 0 ? (
                  <div className="palet-products-list">
                    <h6>Productos:</h6>
                    <ul>
                      {palet.productosContenidos.map((item, idx) => (
                        <li key={idx}>
                          {getProductName(item.productId)}: {item.quantity}{" "}
                          {getProductUnit(item.productId) === "peso"
                            ? "Kg"
                            : "unidades"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>Este palet no contiene productos.</p>
                )}
              </div>
              <div className="card-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenManagePaletModal(palet);
                  }}
                  className="modify-button"
                >
                  Editar Palet
                </button>
                {/* Botón de Borrar Palet */}
                <button
                  onClick={(e) => handleDeletePalet(e, palet.id, palet.nombre)}
                  className="delete-button"
                  style={{ marginLeft: "10px" }}
                >
                  Borrar Palet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showManagePaletModal && (
        <ManagePaletProductsModal
          loadId={loadId}
          paletId={editingPaletId}
          initialPaletProducts={initialPaletProducts}
          onClose={handleCloseManagePaletModal}
          onPaletUpdated={handlePaletUpdated}
          associatedLoadName={loadData.loadName}
          associatedBoatName={currentBoatName}
        />
      )}

      {showPaletViewModal && (
        <PaletViewModal
          paletData={viewingPaletData}
          onClose={handleClosePaletViewModal}
          allUsersMap={allUsersMap}
        />
      )}
    </div>
  );
}

export default CargaDetailPage;
