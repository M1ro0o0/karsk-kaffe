const express = require("express");

const { computeSku } = require("../utils/sku");
const { getZohoIdForSku } = require("../utils/zoho-sku-lookup");
const { getItem } = require("../utils/zoho");

module.exports = (supabase) => {
  const router = express.Router();

  router.post("/stock-check", async (req, res) => {
    try {
      const { productId, selectedOptions } = req.body;

      if (!productId) {
        return res.status(400).json({
          error: "Missing productId",
        });
      }

      /*--------------------
            LOAD PRODUCT OPTIONS
            (only needed for coffee products, but cheap enough to always fetch —
            computeSku() ignores it for box products anyway)
        --------------------*/

      const { data: optionsFromDb, error: optionsError } = await supabase
        .from("ProductOptions")
        .select("*");

      if (optionsError) {
        console.error("OPTIONS ERROR:", optionsError);

        return res.status(500).json({
          error: "Failed to load product options",
        });
      }

      let sku;

      try {
        sku = computeSku(productId, selectedOptions, optionsFromDb);
      } catch (skuErr) {
        console.error("SKU BUILD ERROR:", skuErr);

        return res.status(400).json({
          error: skuErr.message,
        });
      }

      /*--------------------
            FIND ZOHO ID
        --------------------*/

      const zohoId = await getZohoIdForSku(supabase, sku);

      if (!zohoId) {
        console.error("SKU MAP ERROR: no ZohoInventory row for SKU", sku);

        return res.status(404).json({
          error: "SKU not mapped",
          sku,
        });
      }

      /*--------------------
            FETCH ZOHO ITEM
        --------------------*/

      const item = await getItem(zohoId);

      /*--------------------
              RETURN
        --------------------*/

      return res.json({
        sku,
        stock: item?.available_stock ?? item?.stock_on_hand ?? 0,
      });
    } catch (err) {
      console.error("STOCK CHECK ERROR:", err);

      return res.status(500).json({
        error: err.message,
      });
    }
  });

  return router;
};
