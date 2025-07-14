import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import imageCompression from "browser-image-compression";

function UserEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  // const [direccion, setDireccion] = useState(''); // <-- Campo 'direccion' eliminado
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null);
  const [newAvatarImage, setNewAvatarImage] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const roleOptions = ["user", "admin", "mozo_almacen", "chofer", "oficina"];
  const statusOptions = ["pending", "approved", "disabled"];

  const storage = getStorage();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userDocRef = doc(db, "users", userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setEmail(data.email || "");
          setRole(data.role || "user");
          setStatus(data.status || "pending");
          setNombre(data.nombre || "");
          setApellidos(data.apellidos || "");
          setTelefono(data.telefono || "");
          // setDireccion(data.direccion || ''); // <-- Campo 'direccion' eliminado al cargar
          setCurrentAvatarUrl(data.avatarUrl || null);
          setAvatarPreview(data.avatarUrl || null);
        } else {
          setError("Usuario no encontrado.");
        }
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
        setError("Error al cargar los datos del usuario.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleAvatarChange = async (event) => {
    const imageFile = event.target.files[0];
    if (imageFile) {
      try {
        console.log(
          "Original avatar file size:",
          imageFile.size / 1024 / 1024,
          "MB"
        );

        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 200,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(imageFile, options);
        console.log(
          "Compressed avatar file size:",
          compressedFile.size / 1024 / 1024,
          "MB"
        );

        setNewAvatarImage(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error al comprimir la imagen de avatar:", error);
        setError("Error al procesar la imagen de avatar. Intenta con otra.");
        setNewAvatarImage(null);
        setAvatarPreview(currentAvatarUrl);
      }
    } else {
      setNewAvatarImage(null);
      setAvatarPreview(currentAvatarUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    let updatedAvatarUrl = currentAvatarUrl;

    if (newAvatarImage) {
      try {
        if (currentAvatarUrl) {
          const pathStartIndex = currentAvatarUrl.indexOf("/o/") + 3;
          const pathEndIndex = currentAvatarUrl.indexOf("?");
          const oldImagePath = currentAvatarUrl
            .substring(pathStartIndex, pathEndIndex)
            .replace(/%2F/g, "/");

          const oldAvatarRef = ref(storage, oldImagePath);
          await deleteObject(oldAvatarRef).catch((err) =>
            console.warn(
              "No se pudo eliminar el avatar antiguo de Storage:",
              err.message
            )
          );
        }

        const storageRef = ref(
          storage,
          `user_avatars/${userId}/${Date.now()}_${newAvatarImage.name}`
        );
        const uploadTask = await uploadBytes(storageRef, newAvatarImage);
        updatedAvatarUrl = await getDownloadURL(uploadTask.ref);
        console.log("Nuevo avatar subido. URL:", updatedAvatarUrl);
      } catch (uploadError) {
        console.error("Error al subir el nuevo avatar:", uploadError);
        setError(
          "Error al subir el nuevo avatar. Por favor, inténtalo de nuevo."
        );
        return;
      }
    }

    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        role: role,
        status: status,
        nombre: nombre,
        apellidos: apellidos,
        telefono: telefono,
        // direccion: direccion, // <-- Campo 'direccion' eliminado al actualizar
        avatarUrl: updatedAvatarUrl,
        updatedAt: new Date(),
      });
      setMessage("Usuario actualizado exitosamente.");
      console.log(`Usuario ${userId} actualizado.`);
      setTimeout(() => navigate("/admin/users"), 1500);
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      setError("Error al actualizar el usuario. Revisa los permisos.");
    }
  };

  const handleDeleteUser = async () => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el perfil de Firestore de ${email}? \n\n¡ATENCIÓN! Esto NO eliminará el usuario de Firebase Authentication. Deberás eliminarlo manualmente en la consola de Firebase Auth o implementar una Cloud Function.`
      )
    ) {
      try {
        if (userData.avatarUrl) {
          const pathStartIndex = userData.avatarUrl.indexOf("/o/") + 3;
          const pathEndIndex = userData.avatarUrl.indexOf("?");
          const imagePath = userData.avatarUrl
            .substring(pathStartIndex, pathEndIndex)
            .replace(/%2F/g, "/");

          const avatarRef = ref(storage, imagePath);
          await deleteObject(avatarRef).catch((err) =>
            console.warn(
              "No se pudo eliminar el avatar de Storage:",
              err.message
            )
          );
        }

        const userDocRef = doc(db, "users", userId);
        await deleteDoc(userDocRef);

        setMessage("Perfil de usuario eliminado exitosamente de Firestore.");
        console.log(`Perfil de usuario ${userId} eliminado de Firestore.`);

        if (auth.currentUser && auth.currentUser.uid === userId) {
          await signOut(auth);
          console.log("Sesión del usuario eliminado cerrada.");
          navigate("/login");
        } else {
          setTimeout(() => navigate("/admin/users"), 1500);
        }
      } catch (err) {
        console.error("Error al eliminar usuario:", err);
        setError(
          `No se pudo eliminar el perfil del usuario ${userId}. Revisa las reglas de seguridad.`
        );
      }
    }
  };

  if (loading) {
    return <p>Cargando datos del usuario...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!userData) {
    return <p>No se pudo cargar la información del usuario.</p>;
  }

  return (
    <div className="user-edit-container">
      <h3>Editar Usuario: {userData.email}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="edit-email">Email:</label>
          <input type="email" id="edit-email" value={email} disabled />
        </div>
        <div className="form-group">
          <label htmlFor="edit-nombre">Nombre:</label>
          <input
            type="text"
            id="edit-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-apellidos">Apellidos:</label>
          <input
            type="text"
            id="edit-apellidos"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-telefono">Teléfono:</label>
          <input
            type="text"
            id="edit-telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>
        {/* <-- Campo 'Dirección' eliminado del JSX */}
        {/* <div className="form-group">
          <label htmlFor="edit-direccion">Dirección:</label>
          <input
            type="text"
            id="edit-direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </div> */}

        <div className="form-group">
          <label htmlFor="edit-role">Rol:</label>
          <select
            id="edit-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="edit-status">Estado:</label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="user-avatar">Avatar del Usuario (opcional):</label>
          {avatarPreview && (
            <div style={{ marginBottom: "10px", textAlign: "center" }}>
              <img
                src={avatarPreview}
                alt="Previsualización del Avatar"
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "2px solid #ddd",
                }}
              />
              <p style={{ fontSize: "0.8em", color: "#666", marginTop: "5px" }}>
                Avatar actual
              </p>
            </div>
          )}
          <input
            type="file"
            id="user-avatar"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <p style={{ fontSize: "0.8em", color: "#888", marginTop: "5px" }}>
            Selecciona un archivo para reemplazar el avatar.
          </p>
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
          onClick={handleDeleteUser}
          className="delete-button"
          style={{ marginTop: "10px", width: "100%" }}
        >
          Eliminar Usuario
        </button>
      </form>
      {message && <p className="auth-message success">{message}</p>}
      {error && <p className="auth-message error">{error}</p>}
    </div>
  );
}

export default UserEditPage;
