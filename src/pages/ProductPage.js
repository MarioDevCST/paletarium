import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useNavigate } from "react-router-dom";

function ProductPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const navigate = useNavigate();

  // Estados para el formulario de añadir producto
  const [newProductName, setNewProductName] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductType, setNewProductType] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [newProductImage, setNewProductImage] = useState(null);
  const [addProductMessage, setAddProductMessage] = useState(null);
  const [addProductError, setAddProductError] = useState(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Estado para almacenar un mapa de todos los usuarios
  const [allUsersMap, setAllUsersMap] = useState({});

  // Opciones para los desplegables
  const productTypeOptions = ["Seco", "Refrigerado", "Congelado", "Técnico"];
  const productUnitOptions = ["Unidades", "Peso"];

  // Inicializa Firebase Storage
  const storage = getStorage();

  // Función para obtener todos los usuarios y crear un mapa
  const fetchUsersData = async () => {
    try {
      const usersCollectionRef = collection(db, "users");
      const querySnapshot = await getDocs(query(usersCollectionRef));
      const usersMap = {};
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        usersMap[doc.id] = {
          name: data.nombre || data.email,
          email: data.email,
        };
      });
      setAllUsersMap(usersMap);
    } catch (err) {
      console.error("Error al cargar datos de usuarios para el mapa:", err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const productsCollectionRef = collection(db, "productos");
      const q = query(productsCollectionRef);
      const querySnapshot = await getDocs(q);

      const productsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
      setProducts(productsList);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError(
        "No se pudieron cargar los productos. Revisa las reglas de seguridad o tu conexión."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchUsersData();
  }, []);

  const handleImageChange = async (event) => {
    const imageFile = event.target.files[0];
    if (imageFile) {
      try {
        console.log(
          "Original image file size:",
          imageFile.size / 1024 / 1024,
          "MB"
        );

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(imageFile, options);
        console.log(
          "Compressed image file size:",
          compressedFile.size / 1024 / 1024,
          "MB"
        );

        setNewProductImage(compressedFile);

        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error al comprimir la imagen:", error);
        setAddProductError("Error al procesar la imagen. Intenta con otra.");
        setNewProductImage(null);
        setImagePreview(null);
      }
    } else {
      setNewProductImage(null);
      setImagePreview(null);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAddProductMessage(null);
    setAddProductError(null);

    if (
      !newProductName ||
      !newProductCode ||
      !newProductType ||
      !newProductUnit
    ) {
      setAddProductError(
        "Nombre, Código, Tipo y Unidad son campos obligatorios."
      );
      return;
    }

    let imageUrl = null;
    if (newProductImage) {
      try {
        const storageRef = ref(
          storage,
          `productos_imagenes/${Date.now()}_${newProductImage.name}`
        );
        const uploadTask = await uploadBytes(storageRef, newProductImage);
        imageUrl = await getDownloadURL(uploadTask.ref);
        console.log("Imagen subida. URL:", imageUrl);
      } catch (uploadError) {
        console.error("Error al subir la imagen:", uploadError);
        setAddProductError(
          "Error al subir la imagen. Por favor, inténtalo de nuevo."
        );
        return;
      }
    }

    try {
      const productsCollectionRef = collection(db, "productos");
      const currentUserUid = auth.currentUser
        ? auth.currentUser.uid
        : "anonymous";

      await addDoc(productsCollectionRef, {
        name: newProductName,
        code: newProductCode,
        description: newProductDescription,
        type: newProductType,
        unit: newProductUnit,
        imageUrl: imageUrl,
        createdBy: currentUserUid,
        updatedBy: currentUserUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setAddProductMessage("Producto añadido exitosamente.");
      setNewProductName("");
      setNewProductCode("");
      setNewProductDescription("");
      setNewProductType("");
      setNewProductUnit("");
      setNewProductImage(null);
      setImagePreview(null);
      setShowAddProductForm(false);
      fetchProducts();
    } catch (err) {
      console.error("Error al añadir producto:", err);
      setAddProductError("Error al añadir el producto. Revisa los permisos.");
    }
  };

  const handleModifyProduct = (productId) => {
    navigate(`/admin/products/edit/${productId}`);
  };

  // La función handleDeleteProduct ha sido eliminada de este componente
  // ya que la funcionalidad de eliminación se gestionará exclusivamente en ProductEditPage.js

  // Lógica de filtrado de productos
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description &&
        product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.type &&
        product.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.unit &&
        product.unit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.createdBy &&
        (allUsersMap[product.createdBy]?.name || product.createdBy)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  // Lógica de ordenación de productos
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "code") {
      return a.code.localeCompare(b.code);
    } else if (sortBy === "type") {
      return (a.type || "").localeCompare(b.type || "");
    } else if (sortBy === "unit") {
      return (a.unit || "").localeCompare(b.unit || "");
    } else if (sortBy === "createdBy") {
      const creatorNameA = allUsersMap[a.createdBy]?.name || "";
      const creatorNameB = allUsersMap[b.createdBy]?.name || "";
      return creatorNameA.localeCompare(creatorNameB);
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
    return <p>Cargando lista de productos...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div>
      <h3>Gestión de Productos</h3>

      <div className="search-sort-create-container">
        <input
          type="text"
          placeholder="Buscar producto por nombre, código, descripción..."
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
          <option value="code">Ordenar por Código</option>
          <option value="type">Ordenar por Tipo</option>
          <option value="unit">Ordenar por Unidad</option>
          <option value="createdBy">Ordenar por Creador</option>
          <option value="createdAt">Ordenar por Fecha Creación</option>
          <option value="updatedAt">Ordenar por Fecha Modificación</option>
        </select>
        <button
          onClick={() => setShowAddProductForm(!showAddProductForm)}
          className="create-new-item-button"
        >
          {showAddProductForm ? "Ocultar Formulario" : "Crear Nuevo Producto"}
        </button>
      </div>

      {showAddProductForm && (
        <div className="add-item-form-container">
          <h4>Añadir Nuevo Producto</h4>
          <form onSubmit={handleAddProduct}>
            <div className="form-group">
              <label htmlFor="product-name">Nombre del Producto:</label>
              <input
                type="text"
                id="product-name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="product-code">Código del Producto:</label>
              <input
                type="text"
                id="product-code"
                value={newProductCode}
                onChange={(e) => setNewProductCode(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="product-description">
                Descripción de Producto:
              </label>
              <textarea
                id="product-description"
                value={newProductDescription}
                onChange={(e) => setNewProductDescription(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            <div className="form-group">
              <label htmlFor="product-type">Tipo de Producto:</label>
              <select
                id="product-type"
                value={newProductType}
                onChange={(e) => setNewProductType(e.target.value)}
                required
              >
                <option value="">Selecciona un tipo</option>
                {productTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="product-unit">Unidad:</label>
              <select
                id="product-unit"
                value={newProductUnit}
                onChange={(e) => setNewProductUnit(e.target.value)}
                required
              >
                <option value="">Selecciona una unidad</option>
                {productUnitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="product-image">
                Imagen del Producto (opcional):
              </label>
              <input
                type="file"
                id="product-image"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div style={{ marginTop: "10px", textAlign: "center" }}>
                  <img
                    src={imagePreview}
                    alt="Previsualización"
                    style={{
                      maxWidth: "150px",
                      maxHeight: "150px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                  />
                  <p style={{ fontSize: "0.8em", color: "#666" }}>
                    Imagen lista para subir
                  </p>
                </div>
              )}
            </div>
            <button type="submit" className="auth-button">
              Añadir Producto
            </button>
          </form>
          {addProductMessage && (
            <p className="auth-message success">{addProductMessage}</p>
          )}
          {addProductError && (
            <p className="auth-message error">{addProductError}</p>
          )}
        </div>
      )}

      {/* Tabla de Productos */}
      {sortedProducts.length === 0 && searchTerm !== "" ? (
        <p>No se encontraron productos que coincidan con la búsqueda.</p>
      ) : sortedProducts.length === 0 && searchTerm === "" ? (
        <p>No hay productos registrados.</p>
      ) : (
        <table className="admin-user-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Unidad</th>
              <th>Creado Por</th>
              <th>Fecha Creación</th>
              <th>Fecha Modificación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{
                        width: "50px",
                        height: "50px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    <span style={{ color: "#aaa" }}>Sin imagen</span>
                  )}
                </td>
                <td>{product.name}</td>
                <td>{product.code}</td>
                <td>{product.description || "N/A"}</td>
                <td>{product.type || "N/A"}</td>
                <td>{product.unit || "N/A"}</td>
                <td>{getUserDisplayName(product.createdBy)}</td>
                <td>{formatDate(product.createdAt)}</td>
                <td>{formatDate(product.updatedAt)}</td>
                <td>
                  <button
                    onClick={() => handleModifyProduct(product.id)}
                    className="modify-button"
                  >
                    Modificar
                  </button>
                  {/* El botón de eliminar se ha eliminado de aquí y solo estará en ProductEditPage */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ProductPage;
