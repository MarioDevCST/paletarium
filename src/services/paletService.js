// src/services/paletService.js
import {
  collection,
  query,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  where,
} from "firebase/firestore";

/**
 * Guarda (crea o actualiza) un palet en Firestore.
 * @param {object} options - Opciones para guardar el palet.
 * @param {string} [options.paletId] - ID del palet si se está actualizando uno existente.
 * @param {string} options.loadId - ID de la carga a la que pertenece el palet.
 * @param {Array<object>} options.productosContenidos - Array de objetos { productId, quantity } del palet.
 * @param {string} options.tipoPalet - Tipo de palet ('seco', 'refrigerado', 'congelado', 'técnico').
 * @param {string} options.currentUserUid - UID del usuario actual que realiza la operación.
 * @param {object} options.db - Instancia de Firestore.
 * @returns {Promise<object>} Objeto con { success: true, message: string } o { success: false, error: string }.
 */
export const savePalet = async ({
  paletId,
  loadId,
  productosContenidos,
  tipoPalet,
  currentUserUid,
  db,
}) => {
  try {
    if (paletId) {
      // Lógica para actualizar un palet existente
      const paletDocRef = doc(db, "palets", paletId);
      await updateDoc(paletDocRef, {
        productosContenidos: productosContenidos,
        tipoPalet: tipoPalet,
        updatedBy: currentUserUid,
        updatedAt: new Date(),
      });
      return { success: true, message: `Palet actualizado exitosamente.` };
    } else {
      // Lógica para crear un nuevo palet
      const paletsCollectionRef = collection(db, "palets");
      // Contar palets existentes para generar el número de palet
      const q = query(paletsCollectionRef, where("cargaId", "==", loadId));
      const querySnapshot = await getDocs(q);
      const existingPaletsCount = querySnapshot.docs.length;
      const numeroPalet = existingPaletsCount + 1;

      // Obtener el nombre del barco asociado a la carga para el nombre del palet
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

      // Añadir el nuevo documento de palet
      await addDoc(paletsCollectionRef, {
        nombre: paletName,
        numeroPalet: numeroPalet,
        tipoPalet: tipoPalet,
        cargaId: loadId,
        productosContenidos: productosContenidos,
        createdBy: currentUserUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return {
        success: true,
        message: `Palet "${paletName}" creado exitosamente.`,
      };
    }
  } catch (err) {
    console.error("Error al guardar palet en el servicio:", err);
    return {
      success: false,
      error: "Error al guardar el palet. Revisa los permisos o la conexión.",
    };
  }
};
