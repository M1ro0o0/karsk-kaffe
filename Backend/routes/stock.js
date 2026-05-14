const express = require("express");

const { buildSku } =
  require("../utils/sku");

const {
  getItem
} = require("../utils/zoho");

module.exports = (supabase) => {

  const router =
    express.Router();

  router.post(
    "/stock-check",
    async (req, res) => {

      try {

        const {
          productId,
          selectedOptions
        } = req.body;

        if (!productId) {

          return res
            .status(400)
            .json({
              error:
                "Missing productId"
            });
        }

        let sku;

        /*--------------------
            BOX PRODUCTS
        --------------------*/

        if (
          productId.startsWith(
            "BO-"
          )
        ) {

          // BOX ID IS SKU
          sku = productId;

        } else {

          /*--------------------
              COFFEE PRODUCTS
          --------------------*/

          const {
            data: optionsFromDb,
            error:
              optionsError
          } = await supabase
            .from(
              "ProductOptions"
            )
            .select("*");

          if (
            optionsError
          ) {

            console.error(
              "OPTIONS ERROR:",
              optionsError
            );

            return res
              .status(500)
              .json({
                error:
                  "Failed to load product options"
              });
          }

          sku = buildSku(
            productId,
            selectedOptions,
            optionsFromDb
          );
        }

        /*--------------------
            FIND ZOHO ID
        --------------------*/

        const {
          data: product,
          error:
            productError
        } = await supabase
          .from(
            "ZohoInventory"
          )
          .select(
            "ZohoID"
          )
          .eq(
            "ProductSKU",
            sku
          )
          .single();

        if (
          productError ||
          !product
        ) {

          console.error(
            "SKU MAP ERROR:",
            productError
          );

          return res
            .status(404)
            .json({
              error:
                "SKU not mapped",
              sku
            });
        }

        /*--------------------
            FETCH ZOHO ITEM
        --------------------*/

        const item =
          await getItem(
            String(
              product.ZohoID
            ).trim()
          );

        /*--------------------
              RETURN
        --------------------*/

        return res.json({
          sku,
          stock:
            item
              ?.available_stock ??
            item
              ?.stock_on_hand ??
            0
        });

      } catch (err) {

        console.error(
          "STOCK CHECK ERROR:",
          err
        );

        return res
          .status(500)
          .json({
            error:
              err.message
          });
      }
    }
  );

  return router;
};