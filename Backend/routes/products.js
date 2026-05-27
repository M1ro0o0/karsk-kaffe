const express = require("express");

const {
  formatProduct,
  formatProductCard
} = require("../utils/productFormatter");

module.exports = (supabase) => {

  const router = express.Router();

  /*--------------------
      ALL PRODUCTS
  --------------------*/

  router.get("/", async (req, res) => {

    const lang =
      req.query.lang || "en";

    try {

      const { data, error } =
        await supabase
          .from("Products")
          .select(`
            id,
            image,
            baseDiscount,
            ProductPrices(price),
            ProductTranslation(name, language)
          `)
          .eq("active", true);

      if (error) {

        console.error(
          "SUPABASE ERROR:",
          error
        );

        return res
          .status(500)
          .json({
            error: error.message
          });
      }

      const formatted = data.map(
        (p) =>
          formatProductCard(
            p,
            lang
          )
      );

      return res.json(
        formatted
      );

    } catch (err) {

      console.error(
        "SERVER CRASH:",
        err
      );

      return res
        .status(500)
        .json({
          error: err.message
        });
    }
  });

  /*--------------------
      SINGLE PRODUCT
  --------------------*/

  router.get("/:id", async (req, res) => {

    try {

      const { id } =
        req.params;

      const lang =
        req.query.lang || "en";

      const { data, error } =
        await supabase
          .from("Products")
          .select(`
            id,
            image,
            type,
            baseDiscount,
            ProductPrices(label, price, weight),
            ProductTranslation(name, language, description),
            ProductOptions(type, value),
            ProductContent(language, items)
          `)
          .eq("active", true)
          .eq("id", id)
          .single();

      if (error) {

        console.error(
          "PRODUCT ERROR:",
          error
        );

        return res
          .status(500)
          .json({
            error: error.message
          });
      }

      if (!data) {

        return res
          .status(404)
          .json({
            error:
              "Product not found"
          });
      }

      const formatted =
        formatProduct(
          data,
          lang
        );

      return res.json(
        formatted
      );

    } catch (err) {

      console.error(
        "PRODUCT FETCH ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch product"
        });
    }
  });

  return router;
};