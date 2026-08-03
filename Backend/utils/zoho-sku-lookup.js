/**
 * Looks up the Zoho item_id mapped to a given internal SKU, via the ZohoInventory table
 * (columns: ProductSKU, ZohoID). Extracted from stock.js's original inline query so both
 * stock.js (availability checks) and zoho.js (sales order line items) share one lookup.
 *
 * @param {object} supabase
 * @param {string} sku
 * @returns {Promise<string|null>} the ZohoID, or null if this SKU has no mapping row
 */
async function getZohoIdForSku(supabase, sku) {

  const {
    data: product,
    error: productError
  } = await supabase
    .from("ZohoInventory")
    .select("ZohoID")
    .eq("ProductSKU", sku)
    .single();

  if (productError || !product) {
    return null;
  }

  return String(product.ZohoID).trim();
}

module.exports = {
  getZohoIdForSku
};