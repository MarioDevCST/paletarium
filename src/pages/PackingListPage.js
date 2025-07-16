import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  where,
} from "firebase/firestore";

// Importar las librerías para PDF
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Logo from "../img/Logo.png"; // Asegúrate de que la ruta sea correcta

function PackingListPage() {
  const { loadId } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef(); // Referencia al elemento HTML que queremos convertir a PDF

  const [loadData, setLoadData] = useState(null);
  const [palets, setPalets] = useState([]);
  const [productsMap, setProductsMap] = useState({}); // Para buscar detalles de productos
  const [boatsMap, setBoatsMap] = useState({}); // Para buscar nombres de barcos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Load Data
        const loadDocRef = doc(db, "cargas", loadId);
        const loadDocSnap = await getDoc(loadDocRef);
        if (!loadDocSnap.exists()) {
          setError("Carga no encontrada.");
          setLoading(false);
          return;
        }
        const currentLoadData = { id: loadDocSnap.id, ...loadDocSnap.data() };
        setLoadData(currentLoadData);

        // 2. Fetch all Products for product details map
        const productsCollectionRef = collection(db, "productos");
        const productsQuerySnapshot = await getDocs(
          query(productsCollectionRef)
        );
        const pMap = {};
        productsQuerySnapshot.docs.forEach((doc) => {
          pMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        setProductsMap(pMap);

        // 3. Fetch all Boats for boat names map
        const boatsCollectionRef = collection(db, "barcos");
        const boatsQuerySnapshot = await getDocs(query(boatsCollectionRef));
        const bMap = {};
        boatsQuerySnapshot.docs.forEach((doc) => {
          bMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        setBoatsMap(bMap);

        // 4. Fetch Palets associated with this load
        const paletsCollectionRef = collection(db, "palets");
        const qPalets = query(
          paletsCollectionRef,
          where("cargaId", "==", loadId)
        );
        const paletsQuerySnapshot = await getDocs(qPalets);
        const paletsList = paletsQuerySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPalets(paletsList);
      } catch (err) {
        console.error("Error al cargar datos para el packing list:", err);
        setError("Error al cargar los datos del packing list.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadId]);

  // Función para formatear fechas
  const formatDate = (date) => {
    if (!date) return "N/A";
    // Asegurarse de que 'date' sea un objeto Date de JS si viene de Timestamp de Firestore
    const jsDate = date.toDate ? date.toDate() : date;
    return jsDate.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Función para obtener el nombre del barco
  const getBoatName = (boatId) => {
    return boatsMap[boatId]?.name || "N/A";
  };

  // Función para obtener la unidad del producto
  const getProductUnit = (productId) => {
    return productsMap[productId]?.unit || "N/A";
  };

  // Función para generar el PDF
  const generatePdf = async () => {
    const input = pdfRef.current; // El div que contiene el contenido del packing list

    if (!input) {
      setError("No se encontró el contenido para generar el PDF.");
      return;
    }

    // Ocultar temporalmente los botones si están dentro del área a capturar
    const buttons = input.querySelectorAll("button");
    buttons.forEach((button) => (button.style.visibility = "hidden"));

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // Aumenta la escala para mejor calidad
        useCORS: true, // Importante si tienes imágenes de diferentes orígenes
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4"); // 'p' para portrait, 'mm' para milímetros, 'a4' para tamaño A4
      const imgWidth = 210; // Ancho A4 en mm
      const pageHeight = 297; // Alto A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `packing-list-${loadData?.loadName || "carga"}-${formatDate(
          loadData?.loadDate
        )}.pdf`
      );
      console.log("PDF generado exitosamente.");
      alert("PDF generado exitosamente."); // Usar un modal personalizado en lugar de alert en producción
    } catch (err) {
      console.error("Error al generar el PDF:", err);
      setError(
        "Error al generar el PDF. Asegúrate de que todo el contenido sea visible y no haya elementos externos que impidan la captura."
      );
    } finally {
      // Mostrar los botones de nuevo
      buttons.forEach((button) => (button.style.visibility = "visible"));
    }
  };

  if (loading) {
    return <p>Cargando packing list...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!loadData) {
    return <p>No se pudo cargar la información del packing list.</p>;
  }

  const allProductsInLoad = palets.flatMap((palet) =>
    palet.productosContenidos.map((product) => ({
      ...product,
      paletNumero: palet.numeroPalet,
      productCode: productsMap[product.productId]?.code || "N/A",
      productName:
        productsMap[product.productId]?.name || "Producto Desconocido",
      productUnit: getProductUnit(product.productId),
    }))
  );

  return (
    <div className="packing-list-container">
      <button onClick={() => navigate(-1)} className="back-button">
        Volver
      </button>
      <button onClick={generatePdf} className="generate-pdf-button">
        Generar PDF
      </button>

      <div className="packing-list-content" ref={pdfRef}>
        {" "}
        {/* Este div será capturado por html2canvas */}
        <div className="packing-list-header">
          <img src={Logo} alt="Logo Empresa" className="packing-list-logo" />{" "}
          {/* Asegúrate de que la ruta sea correcta */}
          <h1>PACKING LIST</h1>
          <div className="header-info">
            <p>
              <strong>Barco:</strong> {getBoatName(loadData.associatedBoatId)}
            </p>
            <p>
              <strong>Fecha de Carga:</strong> {formatDate(loadData.loadDate)}
            </p>
          </div>
        </div>
        <table className="packing-list-table">
          <thead>
            <tr>
              <th>PO</th>
              <th>CODE</th>
              <th>ITEM</th>
              <th>QTY</th>
              <th>UNIT</th>
              <th>LOT</th>
              <th>EXP. DATE</th>
              <th>PALLET</th>
            </tr>
          </thead>
          <tbody>
            {allProductsInLoad.length === 0 ? (
              <tr>
                <td colSpan="8">No hay productos en esta carga.</td>
              </tr>
            ) : (
              allProductsInLoad.map((item, index) => (
                <tr key={index}>
                  <td>N/A</td> {/* PO - Por ahora N/A */}
                  <td>{item.productCode}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.productUnit}</td>
                  <td>{item.lote}</td>
                  <td>{formatDate(item.fechaCaducidad)}</td>
                  <td>{item.paletNumero}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PackingListPage;
