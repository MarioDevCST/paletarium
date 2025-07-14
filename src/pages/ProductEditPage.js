import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage"; // Importa deleteObject
import imageCompression from "browser-image-compression"; // Importa la librería de compresión

function ProductEditPage() {
  const { productId } = useParams(); // Obtiene el ID del producto de la URL
  const navigate = useNavigate(); // Para redirigir después de guardar o eliminar

  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Estados para los campos del formulario
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [unit, setUnit] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState(null); // URL de la imagen actual del producto
  const [newProductImage, setNewProductImage] = useState(null); // Nuevo archivo de imagen seleccionado para reemplazar
  const [imagePreview, setImagePreview] = useState(null); // Previsualización de la nueva imagen

  // Estado para almacenar un mapa de todos los usuarios (para 'Creado Por' y 'Modificado Por')
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
          name: data.nombre || data.email, // Usar nombre o email
          email: data.email,
        };
      });
      setAllUsersMap(usersMap);
    } catch (err) {
      console.error("Error al cargar datos de usuarios para el mapa:", err);
    }
  };

  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      setError(null);
      try {
        const productDocRef = doc(db, "productos", productId);
        const docSnap = await getDoc(productDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProductData(data);
          // Rellenar los estados del formulario con los datos existentes
          setName(data.name || "");
          setCode(data.code || "");
          setDescription(data.description || "");
          setType(data.type || "");
          setUnit(data.unit || "");
          setCurrentImageUrl(data.imageUrl || null); // Establece la URL de la imagen actual
          setImagePreview(data.imageUrl || null); // La previsualización inicial es la imagen actual
        } else {
          setError("Producto no encontrado.");
        }
      } catch (err) {
        console.error("Error al cargar datos del producto:", err);
        setError("Error al cargar los datos del producto.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
    fetchUsersData(); // Cargar usuarios para el mapa al montar el componente
  }, [productId]); // Se ejecuta cada vez que cambia el productId en la URL

  // Función para manejar la selección y compresión de imágenes
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
          maxSizeMB: 1, // Tamaño máximo de la imagen en MB
          maxWidthOrHeight: 1920, // Ancho o alto máximo de la imagen
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(imageFile, options);
        console.log(
          "Compressed image file size:",
          compressedFile.size / 1024 / 1024,
          "MB"
        );

        setNewProductImage(compressedFile); // Guarda el archivo comprimido
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result); // Actualiza la previsualización con la nueva imagen
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error al comprimir la imagen:", error);
        setError("Error al procesar la imagen. Intenta con otra.");
        setNewProductImage(null);
        setImagePreview(currentImageUrl); // Vuelve a la imagen actual si hay error
      }
    } else {
      setNewProductImage(null);
      setImagePreview(currentImageUrl); // Si no se selecciona nada, vuelve a la imagen actual
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Validación básica
    if (!name || !code || !type || !unit) {
      setError("Nombre, Código, Tipo y Unidad son campos obligatorios.");
      return;
    }

    let updatedImageUrl = currentImageUrl; // Por defecto, mantiene la imagen actual

    // Si se ha seleccionado una nueva imagen
    if (newProductImage) {
      try {
        // Opcional: Eliminar la imagen antigua de Storage si existe
        if (currentImageUrl) {
          const oldImageRef = ref(storage, currentImageUrl); // Firebase Storage URL es una referencia directa
          await deleteObject(oldImageRef).catch((err) =>
            console.warn(
              "No se pudo eliminar la imagen antigua de Storage:",
              err.message
            )
          );
        }

        // Subir la nueva imagen
        const storageRef = ref(
          storage,
          `productos_imagenes/${Date.now()}_${newProductImage.name}`
        );
        const uploadTask = await uploadBytes(storageRef, newProductImage);
        updatedImageUrl = await getDownloadURL(uploadTask.ref);
        console.log("Nueva imagen subida. URL:", updatedImageUrl);
      } catch (uploadError) {
        console.error("Error al subir la nueva imagen:", uploadError);
        setError(
          "Error al subir la nueva imagen. Por favor, inténtalo de nuevo."
        );
        return; // Detener el proceso si la subida falla
      }
    }

    try {
      const productDocRef = doc(db, "productos", productId);
      const currentUserUid = auth.currentUser
        ? auth.currentUser.uid
        : "anonymous";

      await updateDoc(productDocRef, {
        name: name,
        code: code,
        description: description,
        type: type,
        unit: unit,
        imageUrl: updatedImageUrl, // Guarda la nueva URL de la imagen (o la misma si no cambió)
        updatedBy: currentUserUid,
        updatedAt: new Date(),
      });
      setMessage("Producto actualizado exitosamente.");
      console.log(`Producto ${productId} actualizado.`);
      // Redirigir de vuelta a la lista de productos después de un breve retraso
      setTimeout(() => navigate("/admin/products"), 1500);
    } catch (err) {
      console.error("Error al actualizar producto:", err);
      setError("Error al actualizar el producto. Revisa los permisos.");
    }
  };

  const handleDeleteProduct = async () => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el producto "${productData.name}"?`
      )
    ) {
      try {
        // Opcional: Eliminar la imagen asociada de Storage
        if (productData.imageUrl) {
          const imageRef = ref(storage, productData.imageUrl);
          await deleteObject(imageRef).catch((err) =>
            console.warn(
              "No se pudo eliminar la imagen de Storage:",
              err.message
            )
          );
        }

        const productDocRef = doc(db, "productos", productId);
        await deleteDoc(productDocRef); // Elimina el documento de Firestore

        setMessage("Producto eliminado exitosamente.");
        console.log(`Producto ${productId} eliminado.`);

        // Redirigir a la lista de productos
        setTimeout(() => navigate("/admin/products"), 1500);
      } catch (err) {
        console.error("Error al eliminar producto:", err);
        setError(
          `No se pudo eliminar el producto "${productData.name}". Revisa las reglas de seguridad.`
        );
      }
    }
  };

  // Función para obtener el nombre de usuario por ID
  const getUserDisplayName = (userId) => {
    return allUsersMap[userId]?.name || userId || "N/A";
  };

  if (loading) {
    return <p>Cargando datos del producto...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!productData) {
    return <p>No se pudo cargar la información del producto.</p>;
  }

  return (
    <div className="boat-edit-container">
      {" "}
      {/* Reutilizamos la clase del contenedor de edición */}
      <h3>Editar Producto: {productData.name}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="edit-product-name">Nombre del Producto:</label>
          <input
            type="text"
            id="edit-product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-product-code">Código del Producto:</label>
          <input
            type="text"
            id="edit-product-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-product-description">
            Descripción de Producto:
          </label>
          <textarea
            id="edit-product-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          ></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="edit-product-type">Tipo de Producto:</label>
          <select
            id="edit-product-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
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
          <label htmlFor="edit-product-unit">Unidad:</label>
          <select
            id="edit-product-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
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

        {/* Campo para la imagen del producto */}
        <div className="form-group">
          <label htmlFor="edit-product-image">Imagen del Producto:</label>
          {imagePreview && (
            <div style={{ marginBottom: "10px", textAlign: "center" }}>
              <img
                src={imagePreview}
                alt="Previsualización del Producto"
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              />
              <p style={{ fontSize: "0.8em", color: "#666", marginTop: "5px" }}>
                Imagen actual
              </p>
            </div>
          )}
          <input
            type="file"
            id="edit-product-image"
            accept="image/*"
            onChange={handleImageChange}
          />
          <p style={{ fontSize: "0.8em", color: "#888", marginTop: "5px" }}>
            Selecciona un archivo para reemplazar la imagen actual.
          </p>
        </div>

        {/* Campos de auditoría */}
        <div className="form-group">
          <label>Creado Por:</label>
          <input
            type="text"
            value={getUserDisplayName(productData.createdBy)}
            disabled
          />
        </div>
        <div className="form-group">
          <label>Fecha Creación:</label>
          <input
            type="text"
            value={
              productData.createdAt?.toDate().toLocaleString("es-ES") || "N/A"
            }
            disabled
          />
        </div>
        <div className="form-group">
          <label>Modificado Por:</label>
          <input
            type="text"
            value={getUserDisplayName(productData.updatedBy)}
            disabled
          />
        </div>
        <div className="form-group">
          <label>Fecha Modificación:</label>
          <input
            type="text"
            value={
              productData.updatedAt?.toDate().toLocaleString("es-ES") || "N/A"
            }
            disabled
          />
        </div>

        <button
          type="submit"
          className="auth-button"
          style={{ marginTop: "20px", width: "100%" }}
        >
          Guardar Cambios
        </button>
        <button
          type="button"
          onClick={handleDeleteProduct}
          className="delete-button"
          style={{ marginTop: "10px", width: "100%" }}
        >
          Eliminar Producto
        </button>
      </form>
      {message && <p className="auth-message success">{message}</p>}
      {error && <p className="auth-message error">{error}</p>}
    </div>
  );
}

export default ProductEditPage;
