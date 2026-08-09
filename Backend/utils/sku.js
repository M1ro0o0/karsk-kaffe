function buildSku(productId, selectedOptions = {}, optionsFromDb = []) {
  const getCode = (type, value) => {
    if (!value) {
      throw new Error(`Missing selected option value for ${type}`);
    }

    const match = optionsFromDb.find(
      (opt) =>
        opt.type &&
        opt.value &&
        opt.code &&
        opt.type.trim().toLowerCase() === type.trim().toLowerCase() &&
        opt.value.trim().toLowerCase() === value.trim().toLowerCase(),
    );

    if (!match) {
      throw new Error(`No matching option for ${type}: ${value}`);
    }

    return match.code;
  };

  // WEIGHT
  const weight = selectedOptions.size;

  if (!weight) {
    throw new Error("Missing product size");
  }

  // OPTION CODES
  const roast = getCode("roast", selectedOptions.roast);

  const grind = getCode("grind", selectedOptions.grind);

  // FINAL SKU
  return `${productId}-${weight}-${roast}:${grind}`;
}

/**
 * Shared entry point for turning a (productId, selectedOptions) pair into a SKU — used by both
 * stock.js (checking availability before "add to cart") and zoho.js (building Zoho sales order
 * line items from a saved order). Keeping the box-vs-coffee branching here means both callers
 * stay in sync automatically instead of duplicating the same `startsWith("BO-")` check.
 *
 * @param {string} productId
 * @param {object} selectedOptions - e.g. { size, roast, grind }. Ignored for box products.
 * @param {Array} optionsFromDb - rows from the ProductOptions table. Ignored for box products.
 * @returns {string} sku
 */
function computeSku(productId, selectedOptions = {}, optionsFromDb = []) {
  // BOX PRODUCTS — box ID is the SKU, no option lookup needed
  if (productId.startsWith("BO-")) {
    return productId;
  }

  // COFFEE PRODUCTS — build from selected roast/grind/size
  return buildSku(productId, selectedOptions, optionsFromDb);
}

module.exports = {
  buildSku,
  computeSku,
};
