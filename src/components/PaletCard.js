import React from "react";

// Añadido formatoPalet a las props
function PaletCard({
  palet,
  getProductName,
  getUserDisplayName,
  formatDate,
  onViewDetails,
  formatoPalet,
}) {
  const actualPaletType = palet.tipoPalet || "seco";

  // Determina si el palet no es Europeo para aplicar el borde negro
  const isNonEuropeo = formatoPalet && formatoPalet.toLowerCase() !== "europeo";

  return (
    <div
      key={palet.id}
      // Añade la clase condicional para el borde negro
      className={`palet-card palet-card-type-${actualPaletType.toLowerCase()} ${
        isNonEuropeo ? "palet-card-non-europeo" : ""
      }`}
      onClick={() => onViewDetails(palet)}
      style={{ cursor: "pointer" }}
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
          <strong>Formato:</strong> {formatoPalet || "N/A"}
        </p>{" "}
        {/* Muestra el formato del palet */}
        {/* Se ha eliminado la lista de productos de aquí para mostrarla solo en el detalle */}
        <p className="palet-card-meta">
          Creado por: {getUserDisplayName(palet.createdBy)} el{" "}
          {formatDate(palet.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default PaletCard;
