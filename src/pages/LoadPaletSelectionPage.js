import React, { useState, useEffect, useCallback } from "react";
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
  updateDoc,
} from "firebase/firestore";

function LoadPaletSelectionPage() {
  const { loadId } = useParams();
  const navigate = useNavigate();

  const [loadData, setLoadData] = useState(null);
  const [availablePalets, setAvailablePalets] = useState([]);
  const [selectedPaletIds, setSelectedPaletIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [allUsersMap, setAllUsersMap] = useState({}); // Mapa para userId -> {nombre, email}
  const [productsMap, setProductsMap] = useState({}); // Mapa para productId -> productData
  const [boatsList, setBoatsList] = useState([]); // Lista de barcos para mostrar el nombre del barco asociado a la carga

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
      (docSnap) => {
        if (docSnap.exists()) {
          setLoadData({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Carga no encontrada.");
          setLoadData(null);
        }
      },
      (err) => {
        console.error("Error al escuchar cambios en la carga:", err);
        setError("Error al cargar los detalles de la carga.");
      }
    );

    // Listener para los palets asociados a esta carga (o en almacén si se van a añadir)
    const paletsCollectionRef = collection(db, "palets");
    // Modificado: Ahora solo busca palets asociados a esta carga O palets en estado 'en_almacen'
    // Esto es para permitir seleccionar nuevos palets y ver los ya asociados.
    // Sin embargo, la lógica de la query original era para *seleccionar* palets.
    // Si la intención es mostrar *todos* los palets y permitir seleccionar solo los "en_almacen",
    // la query debería ser sin filtro de cargaId, y la deshabilitación del checkbox manejaría el estado.
    // Si la intención es mostrar *solo los palets de esta carga* y los que *se pueden añadir*,
    // la lógica sería más compleja (ej. una query para palets de la carga, y otra para palets en almacén).

    // Para el caso de "solo los palets asociados a esa carga" (como se pidió en la última instrucción)
    // la query debe ser:
    const qAssociatedPalets = query(
      paletsCollectionRef,
      where("cargaId", "==", loadId)
    );

    const unsubscribeAvailablePalets = onSnapshot(
      qAssociatedPalets,
      (snapshot) => {
        const paletsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAvailablePalets(paletsList);
        setLoading(false);
      },
      (err) => {
        console.error("Error al escuchar cambios en palets disponibles:", err);
        setError("Error al cargar los palets disponibles.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeLoad();
      unsubscribeAvailablePalets();
    };
  }, [loadId]);

  const handleCheckboxChange = (paletId) => {
    setSelectedPaletIds((prevSelected) =>
      prevSelected.includes(paletId)
        ? prevSelected.filter((id) => id !== paletId)
        : [...prevSelected, paletId]
    );
  };

  const handleAssignPaletsToLoad = async () => {
    setMessage(null);
    setError(null);

    if (selectedPaletIds.length === 0) {
      setError("Por favor, selecciona al menos un palet para asignar.");
      return;
    }

    try {
      const updates = selectedPaletIds.map((paletId) => {
        const paletDocRef = doc(db, "palets", paletId);
        return updateDoc(paletDocRef, {
          cargaId: loadId,
          status: "en_transito", // Cambia el estado a 'en_transito'
          updatedAt: new Date(),
          updatedBy: auth.currentUser ? auth.currentUser.uid : "anonymous",
        });
      });

      await Promise.all(updates);

      // Actualizar el estado de la carga a 'in_transit' si no estaba ya completada
      if (loadData && loadData.status !== "completed") {
        const loadDocRef = doc(db, "cargas", loadId);
        await updateDoc(loadDocRef, {
          status: "in_transit",
          updatedAt: new Date(),
          updatedBy: auth.currentUser ? auth.currentUser.uid : "anonymous",
        });
      }

      setMessage(
        "Palets asignados a la carga exitosamente y estado actualizado."
      );
      setSelectedPaletIds([]); // Limpiar selección
      // La UI se actualizará automáticamente gracias a onSnapshot
      navigate(`/cargas/${loadId}/details`); // Volver a la página de detalles de la carga
    } catch (err) {
      console.error("Error al asignar palets a la carga:", err);
      setError(
        "Error al asignar los palets. Revisa los permisos o la conexión."
      );
    }
  };

  // Función para obtener el nombre de usuario por ID
  const getUserDisplayName = (userId) => {
    return allUsersMap[userId]?.name || userId || "N/A";
  };

  // Función para obtener el nombre del producto por ID (usando productsMap)
  const getProductName = (productId) => {
    return productsMap[productId]?.name || "Producto Desconocido";
  };

  // Función para obtener la unidad del producto por ID (usando productsMap)
  const getProductUnit = (productId) => {
    return productsMap[productId]?.unit?.toLowerCase() || "unidades";
  };

  // Función para obtener el nombre del barco por ID
  const getBoatName = (boatId) => {
    return boatsList.find((boat) => boat.id === boatId)?.name || "N/A";
  };

  // Lógica de ordenación de palets
  const sortedPalets = [...availablePalets].sort((a, b) => {
    // Orden personalizado: congelado, seco, refrigerado
    const typeOrder = ["congelado", "seco", "refrigerado"];

    const typeA = a.tipoPalet ? a.tipoPalet.toLowerCase() : "";
    const typeB = b.tipoPalet ? b.tipoPalet.toLowerCase() : "";

    const indexA = typeOrder.indexOf(typeA);
    const indexB = typeOrder.indexOf(typeB);

    // Si ambos tipos están en el orden personalizado
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // Si solo A está en el orden personalizado, A viene primero
    if (indexA !== -1) {
      return -1;
    }
    // Si solo B está en el orden personalizado, B viene primero
    if (indexB !== -1) {
      return 1;
    }
    // Si ninguno está en el orden personalizado, o si son el mismo tipo no listado,
    // se ordena alfabéticamente por tipo o por nombre como fallback.
    if (typeA && typeB) {
      return typeA.localeCompare(typeB);
    }
    return a.nombre.localeCompare(b.nombre); // Fallback al nombre si los tipos son nulos/iguales
  });

  if (loading) {
    return <p>Cargando palets disponibles...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!loadData) {
    return <p>No se pudo cargar la información de la carga.</p>;
  }

  return (
    <div className="load-palet-selection-container">
      <button
        onClick={() => navigate(`/cargas/${loadId}/details`)}
        className="back-button"
      >
        Volver a Detalles de Carga
      </button>
      <h3>Seleccionar Palets para Carga: {loadData.loadName}</h3>
      <p>Barco: {getBoatName(loadData.associatedBoatId)}</p>
      <p>Selecciona los palets que deseas asignar a esta carga.</p>{" "}
      {/* Mensaje actualizado */}
      {sortedPalets.length === 0 ? (
        <p>No hay palets disponibles actualmente para asignar.</p>
      ) : (
        <div className="palet-selection-list">
          {sortedPalets.map((palet) => (
            <div key={palet.id} className="palet-selection-item">
              <div className="palet-info">
                <h4>
                  {palet.nombre} ({palet.tipoPalet})
                </h4>
                <p>Creado por: {getUserDisplayName(palet.createdBy)}</p>
                {palet.productosContenidos &&
                  palet.productosContenidos.length > 0 && (
                    <>
                      <h5>Productos:</h5>
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
                    </>
                  )}
              </div>
              <div className="palet-checkbox">
                <input
                  type="checkbox"
                  id={`palet-${palet.id}`}
                  checked={selectedPaletIds.includes(palet.id)}
                  onChange={() => handleCheckboxChange(palet.id)}
                  disabled={palet.status !== "en_almacen"} // <-- Restaurado: Deshabilitar si no está 'en_almacen'
                />
                <label htmlFor={`palet-${palet.id}`}>
                  {palet.status === "en_almacen"
                    ? "Seleccionar"
                    : `No disponible (${palet.status})`}
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="selection-actions">
        <button
          onClick={handleAssignPaletsToLoad}
          disabled={selectedPaletIds.length === 0}
          className="auth-button"
        >
          Asignar {selectedPaletIds.length} Palet(s) a la Carga
        </button>
      </div>
      {message && <p className="auth-message success">{message}</p>}
      {error && <p className="auth-message error">{error}</p>}
    </div>
  );
}

export default LoadPaletSelectionPage;
