import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  addDoc,
  doc,
  getDoc,
  where,
} from "firebase/firestore"; // Importa getDoc y where

function AddPaletForm({ loadId, onClose, onPaletAdded }) {
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paletProducts, setPaletProducts] = useState([]); // Productos que se añadirán a este palet
  const [paletType, setPaletType] = useState(null); // 'seco', 'refrigerado', 'congelado'
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollectionRef = collection(db, "productos");
        const q = query(productsCollectionRef);
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProductsList(products);
      } catch (err) {
        console.error("Error al cargar la lista de productos:", err);
        setError("Error al cargar la lista de productos.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Función para obtener el tipo de un producto por su ID
  const getProductType = (productId) => {
    return productsList.find((p) => p.id === productId)?.type;
  };

  const handleAddProductToPalet = (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!selectedProduct || !quantity || quantity <= 0) {
      setError("Por favor, selecciona un producto y una cantidad válida.");
      return;
    }

    const productToAdd = productsList.find((p) => p.id === selectedProduct);
    if (!productToAdd) {
      setError("Producto seleccionado no válido.");
      return;
    }

    const newProductType = productToAdd.type;

    // Lógica de validación del tipo de palet
    if (paletProducts.length === 0) {
      // Si es el primer producto, define el tipo de palet
      if (newProductType === "técnico") {
        setError(
          "El primer producto no puede ser de tipo 'técnico'. Un palet debe tener un tipo principal (seco, refrigerado, congelado)."
        );
        return;
      }
      setPaletType(newProductType);
    } else {
      // Si ya hay productos, valida que el nuevo producto sea compatible
      if (newProductType === "técnico") {
        // Los productos técnicos son compatibles con cualquier tipo de palet
      } else if (newProductType !== paletType) {
        setError(
          `Este palet es de tipo "${paletType}". No puedes añadir productos de tipo "${newProductType}".`
        );
        return;
      }
    }

    // Comprobar si el producto ya está en el palet y actualizar la cantidad
    const existingProductIndex = paletProducts.findIndex(
      (item) => item.productId === selectedProduct
    );
    if (existingProductIndex > -1) {
      const updatedPaletProducts = [...paletProducts];
      updatedPaletProducts[existingProductIndex].quantity += parseInt(quantity);
      setPaletProducts(updatedPaletProducts);
    } else {
      setPaletProducts([
        ...paletProducts,
        {
          productId: selectedProduct,
          productName: productToAdd.name, // Añadir nombre para mostrar en la lista
          quantity: parseInt(quantity),
          productType: newProductType, // Añadir tipo para referencia
        },
      ]);
    }

    setSelectedProduct("");
    setQuantity("");
  };

  const handleRemoveProductFromPalet = (productIdToRemove) => {
    const updatedPaletProducts = paletProducts.filter(
      (item) => item.productId !== productIdToRemove
    );
    setPaletProducts(updatedPaletProducts);

    // Si no quedan productos, restablece el tipo de palet
    if (updatedPaletProducts.length === 0) {
      setPaletType(null);
    } else {
      // Si quedan productos, recalcula el tipo de palet si el eliminado era el que lo definía
      const remainingNonTechnicalProducts = updatedPaletProducts.filter(
        (p) => p.productType !== "técnico"
      );
      if (remainingNonTechnicalProducts.length > 0) {
        setPaletType(remainingNonTechnicalProducts[0].productType);
      } else {
        // Si solo quedan productos técnicos, el palet pierde su tipo principal
        setPaletType(null);
      }
    }
  };

  const handleCreatePalet = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (paletProducts.length === 0) {
      setError("El palet debe contener al menos un producto.");
      return;
    }
    if (!paletType) {
      setError(
        "El palet debe tener un tipo definido (seco, refrigerado o congelado) a partir de sus productos."
      );
      return;
    }

    try {
      // 1. Calcular el numero correlativo del palet
      const paletsCollectionRef = collection(db, "palets");
      const q = query(paletsCollectionRef, where("cargaId", "==", loadId));
      const querySnapshot = await getDocs(q);
      const existingPaletsCount = querySnapshot.docs.length;
      const numeroPalet = existingPaletsCount + 1;

      // 2. Generar el nombre del palet
      // Necesitamos el nombre del barco de la carga. Esto implicará una lectura adicional.
      const loadDocRef = doc(db, "cargas", loadId);
      const loadDocSnap = await getDoc(loadDocRef);
      let loadBoatName = "Desconocido";
      if (loadDocSnap.exists()) {
        const loadData = loadDocSnap.data();
        const boatId = loadData.associatedBoatId;
        const boatDocRef = doc(db, "barcos", boatId);
        const boatDocSnap = await getDoc(boatDocRef);
        if (boatDocSnap.exists()) {
          loadBoatName = boatDocSnap.data().name;
        }
      }
      const paletName = `${loadBoatName} - Palet ${numeroPalet}`;

      // 3. Crear el nuevo documento de palet
      const currentUserUid = auth.currentUser
        ? auth.currentUser.uid
        : "anonymous";
      await addDoc(paletsCollectionRef, {
        nombre: paletName,
        numeroPalet: numeroPalet,
        tipoPalet: paletType,
        cargaId: loadId,
        productosContenidos: paletProducts.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
        })), // Solo guardar ID y cantidad
        createdBy: currentUserUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setMessage(`Palet "${paletName}" creado exitosamente.`);
      setPaletProducts([]);
      setPaletType(null);
      setSelectedProduct("");
      setQuantity("");
      onPaletAdded(); // Notifica al componente padre que se añadió un palet
      onClose(); // Cierra el modal
    } catch (err) {
      console.error("Error al crear palet:", err);
      setError("Error al crear el palet. Revisa los permisos o la conexión.");
    }
  };

  if (loading) {
    return <p>Cargando productos...</p>;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Añadir Nuevo Palet a Carga: {loadId}</h3>
        <form onSubmit={handleAddProductToPalet}>
          {" "}
          {/* Cambiado a handleAddProductToPalet para el botón de añadir producto */}
          <div className="form-group">
            <label htmlFor="product-select">Producto:</label>
            <select
              id="product-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">Selecciona un producto</option>
              {productsList.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.type})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="quantity">Cantidad:</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || "")}
              min="1"
            />
          </div>
          <button type="submit" className="add-product-to-palet-button">
            Añadir Producto al Palet
          </button>{" "}
          {/* Cambiado a type="submit" */}
        </form>

        {paletProducts.length > 0 && (
          <div className="palet-products-preview">
            <h4>
              Productos en este Palet (
              {paletType ? `Tipo: ${paletType}` : "Tipo no definido"})
            </h4>
            <ul>
              {paletProducts.map((item, index) => (
                <li key={index}>
                  {item.productName} ({item.productType}): {item.quantity}{" "}
                  unidades
                  <button
                    type="button"
                    onClick={() => handleRemoveProductFromPalet(item.productId)}
                    className="remove-product-button"
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            onClick={handleCreatePalet}
            className="auth-button"
          >
            Crear Palet
          </button>{" "}
          {/* Cambiado a type="button" */}
          <button type="button" onClick={onClose} className="cancel-button">
            Cancelar
          </button>
        </div>
        {message && <p className="auth-message success">{message}</p>}
        {error && <p className="auth-message error">{error}</p>}
      </div>
    </div>
  );
}

export default AddPaletForm;
