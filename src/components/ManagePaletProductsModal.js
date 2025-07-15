import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import { savePalet } from "../services/paletService"; // Importa la función del servicio
import { determinePaletType } from "../utils/paletUtils"; // Importa la función de utilidad

function ManagePaletProductsModal({
  loadId,
  paletId,
  initialPaletProducts,
  onClose,
  onPaletUpdated,
  associatedLoadName,
  associatedBoatName,
}) {
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lote, setLote] = useState(""); // Nuevo estado para el Lote
  const [fechaCaducidad, setFechaCaducidad] = useState(""); // Nuevo estado para la Fecha de caducidad
  const [formatoPalet, setFormatoPalet] = useState(""); // Nuevo estado para el Tipo de Palet (Europeo, Americano, Otros)
  const [paletProducts, setPaletProducts] = useState(
    initialPaletProducts || []
  );
  const [paletType, setPaletType] = useState(null); // Esto es el tipo de contenido (seco, refrigerado, etc.)
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estado para un mapa de productos para buscar sus nombres y tipos fácilmente
  const [productsMap, setProductsMap] = useState({});

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

        // Crear un mapa de productos para fácil acceso
        const pMap = {};
        products.forEach((p) => {
          pMap[p.id] = p;
        });
        setProductsMap(pMap);
      } catch (err) {
        console.error("Error al cargar la lista de productos:", err);
        setError("Error al cargar la lista de productos.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Si estamos editando un palet existente, cargar su formatoPalet
  useEffect(() => {
    const fetchPaletFormat = async () => {
      if (paletId) {
        try {
          const paletDocRef = doc(db, "palets", paletId);
          const docSnap = await getDoc(paletDocRef);
          if (docSnap.exists()) {
            setFormatoPalet(docSnap.data().formatoPalet || "");
          }
        } catch (err) {
          console.error("Error al cargar formatoPalet del palet:", err);
        }
      }
    };
    fetchPaletFormat();
  }, [paletId]);

  // Recalcular el tipo de palet cada vez que cambia paletProducts o productsList
  useEffect(() => {
    if (productsList.length > 0) {
      const currentPaletType = determinePaletType(paletProducts, productsList);
      setPaletType(currentPaletType);
    }
  }, [paletProducts, productsList]);

  const handleAddProductToPalet = (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (
      !selectedProduct ||
      !quantity ||
      parseInt(quantity) <= 0 ||
      !lote ||
      !fechaCaducidad
    ) {
      setError(
        "Por favor, selecciona un producto, una cantidad válida, el lote y la fecha de caducidad."
      );
      return;
    }

    const productToAdd = productsMap[selectedProduct];
    if (!productToAdd) {
      setError("Producto seleccionado no válido.");
      return;
    }

    const newProductType = productToAdd.type.toLowerCase();

    // Validar el tipo de producto con el tipo actual del palet
    if (paletProducts.length > 0) {
      const currentPaletMainType = determinePaletType(
        paletProducts,
        productsList
      );

      if (
        newProductType !== "técnico" &&
        currentPaletMainType !== "técnico" &&
        newProductType !== currentPaletMainType
      ) {
        setError(
          `Este palet es de tipo "${currentPaletMainType}". No puedes añadir productos de tipo "${newProductType}".`
        );
        return;
      }
      // Si el palet es técnico y se añade un producto no técnico, el tipo del palet cambiará.
      // Esto se maneja automáticamente por el `determinePaletType` en el useEffect.
      if (currentPaletMainType === "técnico" && newProductType !== "técnico") {
        // Si el palet es técnico y se añade un producto no técnico,
        // el tipo del palet se recalculará para ser el tipo del nuevo producto no técnico.
        // No necesitamos un error aquí, solo una nota si es necesario.
      }
    } else {
      // Si es el primer producto en el palet
      if (newProductType === "técnico") {
        setError(
          "El primer producto no puede ser de tipo 'técnico'. Un palet debe tener un tipo principal (seco, refrigerado, congelado)."
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
      updatedPaletProducts[existingProductIndex].quantity += parseInt(quantity);
      setPaletProducts(updatedPaletProducts);
    } else {
      setPaletProducts([
        ...paletProducts,
        {
          productId: selectedProduct,
          productName: productToAdd.name,
          quantity: parseInt(quantity),
          productType: newProductType,
          lote: lote,
          fechaCaducidad: fechaCaducidad,
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
  };

  const handleSavePalet = async () => {
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
    if (!formatoPalet) {
      // Validar el nuevo campo formatoPalet
      setError(
        "Por favor, selecciona el formato del palet (Europeo, Americano, Otros)."
      );
      return;
    }

    const currentUserUid = auth.currentUser
      ? auth.currentUser.uid
      : "anonymous";

    const result = await savePalet({
      paletId: paletId, // Será null si es un nuevo palet
      loadId: loadId,
      productosContenidos: paletProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        lote: p.lote,
        fechaCaducidad: p.fechaCaducidad,
      })),
      tipoPalet: paletType, // Este es el tipo de contenido (seco, refrigerado, etc.)
      formatoPalet: formatoPalet, // <-- Nuevo campo: formato del palet
      currentUserUid: currentUserUid,
      db: db,
    });

    if (result.success) {
      setMessage(result.message);
      onPaletUpdated(); // Notifica al componente padre que se añadió/actualizó un palet
      setTimeout(() => onClose(), 1500); // Cierra el modal después de un breve mensaje
    } else {
      setError(result.error);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>
          {paletId ? "Editar Palet" : "Añadir Nuevo Palet"} a Carga:{" "}
          {associatedLoadName} ({associatedBoatName})
        </h3>

        <form onSubmit={handleAddProductToPalet}>
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
            <label htmlFor="fecha-caducidad">Fecha de Caducidad:</label>
            <input
              type="date"
              id="fecha-caducidad"
              value={fechaCaducidad}
              onChange={(e) => setFechaCaducidad(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="add-product-to-palet-button">
            Añadir Producto al Palet
          </button>
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
                  {item.productName} (
                  {productsMap[item.productId]?.type || "N/A"}): {item.quantity}{" "}
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

        <div className="form-group">
          {" "}
          {/* Nuevo campo para el formato del palet */}
          <label htmlFor="formato-palet">Formato del Palet:</label>
          <select
            id="formato-palet"
            value={formatoPalet}
            onChange={(e) => setFormatoPalet(e.target.value)}
            required
          >
            <option value="">Selecciona un formato</option>
            <option value="Europeo">Europeo</option>
            <option value="Americano">Americano</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={handleSavePalet}
            className="auth-button"
            disabled={paletProducts.length === 0}
          >
            {" "}
            {/* Deshabilitado si no hay productos */}
            {paletId ? "Guardar Cambios del Palet" : "Crear Palet"}
          </button>
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

export default ManagePaletProductsModal;
