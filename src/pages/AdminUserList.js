import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function AdminUserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("email");
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef);
      const querySnapshot = await getDocs(q);

      const usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
      console.log("Usuarios cargados para el Admin:", usersList);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      setError(
        "No se pudieron cargar los usuarios. Revisa las reglas de seguridad o tu conexión."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApproveUser = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        status: "approved",
      });
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, status: "approved" } : user
        )
      );
      console.log(`Usuario ${userId} aprobado.`);
    } catch (err) {
      console.error("Error al aprobar usuario:", err);
      setError(
        `No se pudo aprobar al usuario ${userId}. Revisa las reglas de seguridad.`
      );
    }
  };

  const handleModifyUser = (userId) => {
    navigate(`/admin/users/edit/${userId}`);
  };

  const handleDeleteUser = async (userId, email) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el perfil de ${email}?`
      )
    ) {
      try {
        const userDocRef = doc(db, "users", userId);
        // await deleteDoc(userDocRef); // Habilitar si quieres la función de borrado
        console.warn(
          "Funcionalidad de borrado de Firestore inhabilitada para evitar borrados accidentales de Auth. Elimina manualmente de la consola o implementa Cloud Function."
        );
        setError(
          "Funcionalidad de borrado de Firestore inhabilitada por seguridad (requiere Cloud Function para Auth)."
        );

        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
        console.log(`Perfil de usuario ${userId} eliminado de Firestore.`);
      } catch (err) {
        console.error("Error al eliminar usuario:", err);
        setError(
          `No se pudo eliminar al usuario ${userId}. Revisa las reglas de seguridad.`
        );
      }
    }
  };

  // Lógica de filtrado de usuarios
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.nombre &&
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.apellidos &&
        user.apellidos.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.telefono &&
        user.telefono.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de ordenación de usuarios
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === "email") {
      return a.email.localeCompare(b.email);
    } else if (sortBy === "nombre") {
      return (a.nombre || "").localeCompare(b.nombre || "");
    } else if (sortBy === "apellidos") {
      return (a.apellidos || "").localeCompare(b.apellidos || "");
    } else if (sortBy === "role") {
      return a.role.localeCompare(b.role);
    } else if (sortBy === "status") {
      return a.status.localeCompare(b.status);
    }
    return 0; // No change
  });

  if (loading) {
    return <p>Cargando lista de usuarios...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div>
      <h3>Panel de Administración de Usuarios</h3>
      <div className="search-sort-container">
        <input
          type="text"
          placeholder="Buscar usuario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="user-search-input"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="user-sort-select"
        >
          <option value="email">Ordenar por Email</option>
          <option value="nombre">Ordenar por Nombre</option>
          <option value="apellidos">Ordenar por Apellidos</option>
          <option value="role">Ordenar por Rol</option>
          <option value="status">Ordenar por Estado</option>
        </select>
      </div>
      {sortedUsers.length === 0 && searchTerm !== "" ? (
        <p>No se encontraron usuarios que coincidan con la búsqueda.</p>
      ) : sortedUsers.length === 0 && searchTerm === "" ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <table className="admin-user-table">
          <thead>
            <tr>
              <th>Avatar</th> {/* <-- Nueva columna para el avatar */}
              <th>Email</th>
              <th>Nombre</th>
              <th>Apellidos</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={`Avatar de ${user.nombre || user.email}`}
                      className="table-user-avatar"
                    />
                  ) : (
                    <div className="table-user-avatar-placeholder">
                      <span>
                        {(user.nombre || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </td>{" "}
                {/* <-- Muestra el avatar o un placeholder */}
                <td>{user.email}</td>
                <td>{user.nombre || "N/A"}</td>
                <td>{user.apellidos || "N/A"}</td>
                <td>{user.telefono || "N/A"}</td>
                <td className={`status-${user.status}`}>{user.status}</td>
                <td className={`role-${user.role}`}>{user.role}</td>
                <td>
                  {user.status === "pending" && (
                    <button
                      onClick={() => handleApproveUser(user.id)}
                      className="approve-button"
                    >
                      Aprobar
                    </button>
                  )}
                  {user.status === "approved" && (
                    <button
                      onClick={() => handleModifyUser(user.id)}
                      className="modify-button"
                    >
                      Modificar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminUserList;
