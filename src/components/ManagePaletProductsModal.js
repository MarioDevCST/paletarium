import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  where,
  addDoc,
} from "firebase/firestore";
import { determinePaletType } from "../utils/paletUtils";

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
  const [selectedProductUnit, setSelectedProductUnit] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [tempPaletProducts, setTempPaletProducts] = useState(
    initialPaletProducts || []
  );
  const [paletType, setPaletType] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const productsCollectionRef = collection(db, "productos");
        const qProducts = query(productsCollectionRef);
        const querySnapshot = await getDocs(qProducts);
        const products = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProductsList(products);

        if (
          paletId &&
          initialPaletProducts &&
          initialPaletProducts.length > 0
        ) {
          const productsWithUnits = initialPaletProducts.map((item) => {
            const productData = products.find((p) => p.id === item.productId);
            return {
              ...item,
              productName: productData?.name,
              productType: productData?.type.toLowerCase(),
              productUnit: productData?.unit.toLowerCase(),
            };
          });
          setTempPaletProducts(productsWithUnits);
          setPaletType(determinePaletType(productsWithUnits, products));
        } else {
          setPaletType(null);
        }
      } catch (err) {
        console.error("Error al cargar la lista de productos:", err);
        setError("Error al cargar la lista de productos.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [paletId, initialPaletProducts]);

  const filteredProducts = productsList.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductSelect = (product) => {
    setSearchTerm(product.name);
    setSelectedProduct(product.id);
    setSelectedProductUnit(product.unit.toLowerCase());
  };

  const handleSearchTermChange = (e) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);

    if (selectedProduct) {
      const currentSelectedProductData = productsList.find(
        (p) => p.id === selectedProduct
      );
      if (
        !currentSelectedProductData ||
        !currentSelectedProductData.name
          .toLowerCase()
          .includes(newTerm.toLowerCase())
      ) {
        setSelectedProduct("");
        setSelectedProductUnit("");
        setQuantity("");
      }
    }
  };

  const handleAddProductToPalet = (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) {
      setError("Por favor, selecciona un producto y una cantidad válida.");
      return;
    }

    const productToAdd = productsList.find((p) => p.id === selectedProduct);
    if (!productToAdd) {
      setError("Producto seleccionado no válido.");
      return;
    }

    const newProductType = productToAdd.type.toLowerCase();
    const parsedQuantity =
      productToAdd.unit.toLowerCase() === "peso"
        ? parseFloat(quantity)
        : parseInt(quantity);

    let currentPaletType = paletType;

    if (tempPaletProducts.length === 0) {
      if (newProductType === "técnico") {
        setError(
          "El primer producto no puede ser de tipo 'técnico'. Un palet debe tener un tipo principal (seco, refrigerado, congelado)."
        );
        return;
      }
      currentPaletType = newProductType;
    } else {
      if (newProductType === "técnico") {
        if (currentPaletType === null || currentPaletType === "técnico") {
          currentPaletType = "técnico";
        }
      } else if (currentPaletType === "técnico") {
        currentPaletType = newProductType;
      } else if (newProductType !== currentPaletType) {
        setError(
          `Este palet es de tipo "${currentPaletType}". No puedes añadir productos de tipo "${newProductType}".`
        );
        return;
      }
    }

    const existingProductIndex = tempPaletProducts.findIndex(
      (item) => item.productId === selectedProduct
    );
    let updatedProducts;
    if (existingProductIndex > -1) {
      updatedProducts = [...tempPaletProducts];
      updatedProducts[existingProductIndex].quantity += parsedQuantity;
    } else {
      updatedProducts = [
        ...tempPaletProducts,
        {
          productId: selectedProduct,
          productName: productToAdd.name,
          quantity: parsedQuantity,
          productType: newProductType,
          productUnit: productToAdd.unit.toLowerCase(),
        },
      ];
    }
    setTempPaletProducts(updatedProducts);
    setPaletType(currentPaletType);
    setSelectedProduct("");
    setSelectedProductUnit("");
    setSearchTerm("");
    setQuantity("");
  };

  const handleRemoveProductFromPalet = (productIdToRemove) => {
    const updatedPaletProducts = tempPaletProducts.filter(
      (item) => item.productId !== productIdToRemove
    );
    setTempPaletProducts(updatedPaletProducts);
    setPaletType(determinePaletType(updatedPaletProducts, productsList));
  };

  const handleSavePalet = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (tempPaletProducts.length === 0) {
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
      const currentUserUid = auth.currentUser
        ? auth.currentUser.uid
        : "anonymous";
      const paletsCollectionRef = collection(db, "palets");

      // Si es un palet existente (paletId está presente)
      if (paletId) {
        const paletDocRef = doc(db, "palets", paletId);
        await updateDoc(paletDocRef, {
          productosContenidos: tempPaletProducts.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
          tipoPalet: paletType,
          updatedBy: currentUserUid,
          updatedAt: new Date(),
        });
        setMessage("Palet actualizado exitosamente.");
      } else {
        // Si es un palet nuevo (paletId es null)
        // 1. Calcular el número correlativo del palet para esta carga
        const qPaletsForLoad = query(
          paletsCollectionRef,
          where("cargaId", "==", loadId)
        );
        const querySnapshot = await getDocs(qPaletsForLoad);
        const existingPaletsCount = querySnapshot.docs.length;
        const sequentialPaletNumber = existingPaletsCount + 1; // El siguiente número correlativo

        // 2. Generar el numeroPalet técnico (ej. PAL-XXXXXX)
        const formattedPaletNumber = `PAL-${Date.now().toString().slice(-6)}`;

        // 3. Construir el nombre del palet con el formato deseado
        const paletName = `${
          associatedBoatName || "Barco Desconocido"
        } - Palet ${sequentialPaletNumber}`;
        console.log(
          "ManagePaletProductsModal - Nombre final del palet:",
          paletName
        );
        console.log(
          "ManagePaletProductsModal - Número técnico de palet:",
          formattedPaletNumber
        );

        await addDoc(paletsCollectionRef, {
          cargaId: loadId,
          nombre: paletName, // Usar el nombre del palet construido
          numeroPalet: formattedPaletNumber, // Usar el número de palet generado en formato PAL-XXXXXX
          productosContenidos: tempPaletProducts.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
          tipoPalet: paletType,
          status: "en_almacen", // Estado inicial para nuevos palets
          createdBy: currentUserUid,
          createdAt: new Date(),
          updatedBy: currentUserUid,
          updatedAt: new Date(),
        });
        setMessage("Nuevo palet creado exitosamente.");
      }

      onPaletUpdated();
      onClose();
    } catch (err) {
      console.error(
        "Error inesperado al guardar palet desde el componente:",
        err
      );
      setError("Ocurrió un error inesperado al guardar el palet.");
    }
  };

  if (loading) {
    return <p>Cargando productos...</p>;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{paletId ? "Editar Productos del Palet" : "Añadir Nuevo Palet"}</h3>
        <form onSubmit={handleAddProductToPalet}>
          <div className="form-group">
            <label htmlFor="product-search">Buscar Producto:</label>
            <input
              type="text"
              id="product-search"
              placeholder="Escribe para buscar productos..."
              value={searchTerm}
              onChange={handleSearchTermChange}
            />
            {searchTerm && filteredProducts.length > 0 && (
              <ul className="product-suggestions-list">
                {filteredProducts.slice(0, 10).map((product) => (
                  <li
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                  >
                    {product.name} ({product.type})
                  </li>
                ))}
              </ul>
            )}
            {searchTerm && filteredProducts.length === 0 && (
              <p className="no-suggestions">No se encontraron productos.</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="quantity">Cantidad:</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              step={selectedProductUnit === "peso" ? "0.01" : "1"}
              disabled={!selectedProduct}
              placeholder={
                !selectedProduct
                  ? "Selecciona un producto primero"
                  : "Introduce la cantidad"
              }
            />
          </div>
          <button
            type="submit"
            className="add-product-to-palet-button"
            disabled={!selectedProduct}
            style={{ padding: "8px 15px", fontSize: "0.9em" }} // Ajuste de tamaño
          >
            Añadir Producto al Palet
          </button>
        </form>

        {tempPaletProducts.length > 0 && (
          <div className="palet-products-preview">
            <h4>
              Productos en este Palet (
              {paletType ? `Tipo: ${paletType}` : "Tipo no definido"})
            </h4>
            <ul>
              {tempPaletProducts.map((item, index) => (
                <li key={index}>
                  {item.productName ||
                    productsList.find((p) => p.id === item.productId)?.name}
                  : {item.quantity}{" "}
                  {item.productUnit === "peso" ? "Kg" : "unidades"}
                  <button
                    type="button"
                    onClick={() => handleRemoveProductFromPalet(item.productId)}
                    className="remove-product-button"
                    style={{
                      padding: "3px 8px",
                      fontSize: "0.7em",
                      marginLeft: "10px",
                    }} // Ajuste de tamaño
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
            onClick={handleSavePalet}
            className="auth-button"
            style={{ padding: "10px 20px", fontSize: "1em" }} // Ajuste de tamaño
          >
            {paletId ? "Guardar Cambios" : "Crear Palet"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cancel-button"
            style={{
              padding: "10px 20px",
              fontSize: "1em",
              marginLeft: "10px",
            }} // Ajuste de tamaño
          >
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
