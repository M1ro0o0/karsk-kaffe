const express = require("express");

const {
  formatProduct,
  formatProductCard
} = require("../utils/productFormatter");

module.exports = (supabase) => {

  const router = express.Router();

  /*--------------------
      ALL PRODUCTS
      (optionally filtered by ?tag= or ?tag=discounted)
  --------------------*/

  router.get("/", async (req, res) => {

    const lang =
      req.query.lang || "en";

    const tag =
      req.query.tag || null;

    try {

      let productIds = null;

      // Special case: "discounted" is computed, not a real tag
      if (tag && tag !== "discounted") {

        const { data: tagRow, error: tagError } =
          await supabase
            .from("Tags")
            .select("id")
            .ilike("name", tag)
            .maybeSingle();

        if (tagError) {

          console.error(
            "TAG LOOKUP ERROR:",
            tagError
          );

          return res
            .status(500)
            .json({
              error: tagError.message
            });
        }

        if (!tagRow) {
          // Unknown tag -> no products match
          return res.json([]);
        }

        const { data: links, error: linksError } =
          await supabase
            .from("ProductTags")
            .select("ProductID")
            .eq("tagsID", tagRow.id);

        if (linksError) {

          console.error(
            "PRODUCT TAGS ERROR:",
            linksError
          );

          return res
            .status(500)
            .json({
              error: linksError.message
            });
        }

        productIds = links.map(
          (l) => l.ProductID
        );

        if (productIds.length === 0) {
          return res.json([]);
        }
      }

      let query =
        supabase
          .from("Products")
          .select(`
            id,
            image,
            baseDiscount,
            ProductPrices(price),
            ProductTranslation(name, language)
          `)
          .eq("active", true);

      if (tag === "discounted") {
        query = query.lt("baseDiscount", 1);
      }

      if (productIds) {
        query = query.in("id", productIds);
      }

      const { data, error } = await query;

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