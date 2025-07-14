// paletUtils.js
/**
 * Determina el tipo de un palet basado en los productos que contiene.
 * Si hay productos no técnicos, el tipo de palet será el del primer producto no técnico.
 * Si solo hay productos técnicos, el palet será de tipo 'técnico'.
 * Si no hay productos, el tipo es nulo.
 *
 * @param {Array} productsInPalet - Array de objetos de producto en el palet (ej. [{ productId: 'id', quantity: 10 }]).
 * @param {Array} allProducts - Array de todos los objetos de producto disponibles (ej. [{ id: 'id', name: 'Nombre', type: 'Tipo' }]).
 * @returns {string|null} El tipo de palet ('seco', 'refrigerado', 'congelado', 'técnico') o null si no hay productos.
 */
export const determinePaletType = (productsInPalet, allProducts) => {
  const nonTechnicalProducts = productsInPalet.filter((p) => {
    const productData = allProducts.find((ap) => ap.id === p.productId);
    return productData && productData.type.toLowerCase() !== "técnico";
  });

  if (nonTechnicalProducts.length > 0) {
    // Si hay productos no técnicos, el tipo de palet es el del primer producto no técnico
    const firstNonTechnicalProductType = allProducts
      .find((ap) => ap.id === nonTechnicalProducts[0].productId)
      ?.type.toLowerCase();
    return firstNonTechnicalProductType;
  } else if (productsInPalet.length > 0) {
    // Si solo hay productos técnicos, el palet es de tipo 'técnico'
    return "técnico";
  } else {
    // Si no hay productos, el tipo es nulo
    return null;
  }
};
