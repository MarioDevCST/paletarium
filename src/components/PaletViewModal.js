import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, query, getDocs } from "firebase/firestore";

function PaletViewModal({ paletData, onClose, allUsersMap }) {
  // <-- Recibe allUsersMap
  const [productsMap, setProductsMap] = useState({}); // Mapa para productId -> productData
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorLoadingProducts, setErrorLoadingProducts] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      setErrorLoadingProducts(null);
      try {
        const productsCollectionRef = collection(db, "productos");
        const qProducts = query(productsCollectionRef);
        const querySnapshot = await getDocs(qProducts);
        const pMap = {};
        querySnapshot.docs.forEach((doc) => {
          pMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        setProductsMap(pMap);
      } catch (err) {
        console.error(
          "Error al cargar la lista de productos para el modal:",
          err
        );
        setErrorLoadingProducts(
          "Error al cargar la información de los productos."
        );
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Función para obtener el nombre del producto por ID
  const getProductName = (productId) => {
    return productsMap[productId]?.name || "Producto Desconocido";
  };

  // Función para obtener la unidad del producto por ID
  const getProductUnit = (productId) => {
    return productsMap[productId]?.unit?.toLowerCase() || "unidades";
  };

  // Función para obtener el nombre de usuario por ID (usando allUsersMap)
  const getUserDisplayName = (userId) => {
    return allUsersMap[userId]?.name || userId || "N/A";
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

  if (!paletData) {
    return null; // No renderiza si no hay datos de palet
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Detalles del Palet: {paletData.nombre}</h3>

        <div className="palet-detail-info">
          <p>
            <strong>Número de Palet:</strong> {paletData.numeroPalet}
          </p>
          <p>
            <strong>Tipo de Palet:</strong> {paletData.tipoPalet || "N/A"}
          </p>
          <p>
            <strong>Estado:</strong> {paletData.status || "N/A"}
          </p>
          <p>
            <strong>Carga Asociada ID:</strong> {paletData.cargaId || "N/A"}
          </p>{" "}
          {/* Puedes mostrar el nombre de la carga si la pasas como prop */}
          <p>
            <strong>Creado Por:</strong>{" "}
            {getUserDisplayName(paletData.createdBy)}
          </p>
          <p>
            <strong>Fecha Creación:</strong> {formatDate(paletData.createdAt)}
          </p>
          <p>
            <strong>Última Modificación Por:</strong>{" "}
            {getUserDisplayName(paletData.updatedBy)}
          </p>
          <p>
            <strong>Fecha Modificación:</strong>{" "}
            {formatDate(paletData.updatedAt)}
          </p>
        </div>

        <h4>Productos Contenidos:</h4>
        {loadingProducts ? (
          <p>Cargando productos del palet...</p>
        ) : errorLoadingProducts ? (
          <p style={{ color: "red" }}>Error: {errorLoadingProducts}</p>
        ) : paletData.productosContenidos &&
          paletData.productosContenidos.length > 0 ? (
          <ul>
            {paletData.productosContenidos.map((item, index) => (
              <li key={index}>
                {getProductName(item.productId)}: {item.quantity}{" "}
                {getProductUnit(item.productId) === "peso" ? "Kg" : "unidades"}
              </li>
            ))}
          </ul>
        ) : (
          <p>Este palet no contiene productos.</p>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaletViewModal;
