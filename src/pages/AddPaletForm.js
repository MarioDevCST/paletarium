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
  const [lote, setLote] = useState(""); // Nuevo estado para el Lote
  const [fechaCaducidad, setFechaCaducidad] = useState(""); // Nuevo estado para la Fecha de caducidad
  const [paletProducts, setPaletProducts] = useState([]); // Productos que se añadirán a este palet
  const [paletType, setPaletType] = useState(null); // 'seco', 'refrigerado', 'congelado', 'técnico'
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

    if (
      !selectedProduct ||
      !quantity ||
      quantity <= 0 ||
      !lote ||
      !fechaCaducidad
    ) {
      // Añadida validación para lote y fechaCaducidad
      setError(
        "Por favor, selecciona un producto, una cantidad válida, el lote y la fecha de caducidad."
      );
      return;
    }

    const productToAdd = productsList.find((p) => p.id === selectedProduct);
    if (!productToAdd) {
      setError("Producto seleccionado no válido.");
      return;
    }

    const newProductType = productToAdd.type.toLowerCase(); // Convertir a minúsculas

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
        // Los productos técnicos son compatibles con cualquier tipo de palet.
        // Si el palet aún no tiene un tipo definido (solo productos técnicos hasta ahora),
        // o si el tipo actual es 'técnico', se mantiene o se establece a 'técnico'.
        if (paletType === null || paletType === "técnico") {
          setPaletType("técnico");
        }
      } else if (paletType === "técnico") {
        // Si el palet era 'técnico' y se añade un producto no técnico, el tipo cambia.
        setPaletType(newProductType);
      } else if (newProductType !== paletType) {
        // Si el tipo del nuevo producto no coincide con el tipo actual del palet (y el palet no es técnico)
        setError(
          `Este palet es de tipo "${paletType}". No puedes añadir productos de tipo "${newProductType}".`
        );
        return;
      }
    }

    // Comprobar si el producto con el mismo lote ya está en el palet y actualizar la cantidad
    const existingProductIndex = paletProducts.findIndex(
      (item) => item.productId === selectedProduct && item.lote === lote
    );
    if (existingProductIndex > -1) {
      const updatedPaletProducts = [...paletProducts];
      // Si el lote es el mismo, solo actualiza la cantidad
      updatedPaletProducts[existingProductIndex].quantity += parseInt(quantity);
      setPaletProducts(updatedPaletProducts);
    } else {
      // Si no existe o el lote es diferente, añade un nuevo elemento
      setPaletProducts([
        ...paletProducts,
        {
          productId: selectedProduct,
          productName: productToAdd.name, // Añadir nombre para mostrar en la lista
          quantity: parseInt(quantity),
          productType: newProductType, // Añadir tipo para referencia (ya en minúsculas)
          lote: lote, // Guardar el lote
          fechaCaducidad: fechaCaducidad, // Guardar la fecha de caducidad
        },
      ]);
    }

    // Limpiar campos después de añadir el producto al palet
    setSelectedProduct("");
    setQuantity("");
    setLote("");
    setFechaCaducidad("");
  };

  const handleRemoveProductFromPalet = (productIdToRemove, loteToRemove) => {
    const updatedPaletProducts = paletProducts.filter(
      (item) =>
        !(item.productId === productIdToRemove && item.lote === loteToRemove)
    );
    setPaletProducts(updatedPaletProducts);

    // Si no quedan productos, restablece el tipo de palet a null
    if (updatedPaletProducts.length === 0) {
      setPaletType(null);
    } else {
      // Si quedan productos, recalcula el tipo de palet
      const remainingNonTechnicalProducts = updatedPaletProducts.filter(
        (p) => p.productType !== "técnico"
      );
      if (remainingNonTechnicalProducts.length > 0) {
        // Si hay productos no técnicos, el tipo de palet es el del primer producto no técnico
        setPaletType(remainingNonTechnicalProducts[0].productType);
      } else {
        // Si solo quedan productos técnicos, el palet es de tipo 'técnico'
        setPaletType("técnico");
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
        "El palet debe tener un tipo definido (seco, refrigerado, congelado o técnico) a partir de sus productos."
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
        tipoPalet: paletType, // Ya está en minúsculas
        cargaId: loadId,
        productosContenidos: paletProducts.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
          lote: p.lote, // Guardar el lote
          fechaCaducidad: p.fechaCaducidad, // Guardar la fecha de caducidad
        })), // Guardar todos los datos necesarios
        createdBy: currentUserUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setMessage(`Palet "${paletName}" creado exitosamente.`);
      setPaletProducts([]);
      setPaletType(null);
      setSelectedProduct("");
      setQuantity("");
      setLote("");
      setFechaCaducidad("");
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
          <div className="form-group">
            {" "}
            {/* Nuevo campo para Lote */}
            <label htmlFor="lote">Lote:</label>
            <input
              type="text"
              id="lote"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            {" "}
            {/* Nuevo campo para Fecha de Caducidad */}
            <label htmlFor="fecha-caducidad">Fecha de Caducidad:</label>
            <input
              type="date" // Usamos type="date" para un selector de fecha
              id="fecha-caducidad"
              value={fechaCaducidad}
              onChange={(e) => setFechaCaducidad(e.target.value)}
              required
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
                  unidades, Lote: {item.lote}, Caducidad: {item.fechaCaducidad}
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveProductFromPalet(item.productId, item.lote)
                    }
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
