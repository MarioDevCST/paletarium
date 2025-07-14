import React from "react";

function PaletCard({
  palet,
  getProductName,
  getUserDisplayName,
  formatDate,
  onViewDetails,
}) {
  // Determina el tipo de palet para aplicar los estilos de color
  // Se asume que palet.tipoPalet ya viene en minúsculas y es correcto.
  // Si no, se podría añadir .toLowerCase() aquí.
  const actualPaletType = palet.tipoPalet || "seco"; // Fallback si tipoPalet no está definido

  return (
    <div
      key={palet.id}
      className={`palet-card palet-card-type-${actualPaletType.toLowerCase()}`}
      onClick={() => onViewDetails(palet)} // <-- Añadido el onClick para ver detalles
      style={{ cursor: "pointer" }} // Indicar que la tarjeta es clickeable
    >
      <div
        className={`palet-card-header palet-header-type-${actualPaletType.toLowerCase()}`}
      >
        <h5>{palet.nombre}</h5>
        <span className={`palet-type-${palet.tipoPalet.toLowerCase()}`}>
          {palet.tipoPalet}
        </span>
      </div>
      <div className="palet-card-body">
        <p>
          <strong>Número de Palet:</strong> {palet.numeroPalet}
        </p>
        <p>
          <strong>Productos:</strong>
        </p>
        <ul>
          {palet.productosContenidos &&
            palet.productosContenidos.map((prod, idx) => (
              <li key={idx}>
                {getProductName(prod.productId)}: {prod.quantity} unidades
              </li>
            ))}
        </ul>
        <p className="palet-card-meta">
          Creado por: {getUserDisplayName(palet.createdBy)} el{" "}
          {formatDate(palet.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default PaletCard;
