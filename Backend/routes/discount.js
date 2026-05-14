//Validation
router.post("/api/discount/validate", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.json({ valid: false, error: "EMPTY_CODE" });
  }

  const { data, error } = await supabase
    .from("DiscountCodes")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !data) {
    return res.json({ valid: false, error: "NOT_FOUND" });
  }

  // expired check (if you have it)
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return res.json({ valid: false, error: "EXPIRED" });
  }

  // single-use check
  if (data.type === "single" && data.used) {
    return res.json({ valid: false, error: "ALREADY_USED" });
  }

  return res.json({
    valid: true,
    discount: data.discount,
  });
});

//Redeem
router.post("/api/discount/redeem", async (req, res) => {
  const { code, invoice } = req.body;

  const { data } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code)
    .single();

  if (!data) {
    return res.status(400).send("Invalid code");
  }

  if (data.type === "single" && data.used) {
    return res.status(400).send("Already used");
  }

  const { error } = await supabase
    .from("discount_codes")
    .update({
      used: true,
      used_at: new Date().toISOString(),
      invoice: invoice,
    })
    .eq("code", code);

  if (error) {
    return res.status(500).send(error.message);
  }

  res.send({ success: true });
});const express = require("express");

module.exports = (supabase) => {

  const router = express.Router();

  /*--------------------
      VALIDATE CODE
  --------------------*/

  router.post(
    "/validate",
    async (req, res) => {

      try {

        const { code } =
          req.body;

        if (!code) {

          return res.json({
            valid: false,
            error:
              "EMPTY_CODE"
          });
        }

        const {
          data,
          error
        } = await supabase
          .from(
            "DiscountCodes"
          )
          .select("*")
          .eq("code", code)
          .single();

        if (
          error ||
          !data
        ) {

          return res.json({
            valid: false,
            error:
              "NOT_FOUND"
          });
        }

        // EXPIRED
        if (
          data.expires_at &&
          new Date(
            data.expires_at
          ) < new Date()
        ) {

          return res.json({
            valid: false,
            error:
              "EXPIRED"
          });
        }

        // SINGLE USE
        if (
          data.type ===
            "single" &&
          data.used
        ) {

          return res.json({
            valid: false,
            error:
              "ALREADY_USED"
          });
        }

        return res.json({
          valid: true,
          discount:
            data.discount
        });

      } catch (err) {

        console.error(
          "DISCOUNT VALIDATION ERROR:",
          err
        );

        return res
          .status(500)
          .json({
            valid: false,
            error:
              "SERVER_ERROR"
          });
      }
    }
  );

  /*--------------------
      REDEEM CODE
  --------------------*/

  router.post(
    "/redeem",
    async (req, res) => {

      try {

        const {
          code,
          invoice
        } = req.body;

        if (!code) {

          return res
            .status(400)
            .json({
              error:
                "Missing discount code"
            });
        }

        const {
          data,
          error
        } = await supabase
          .from(
            "DiscountCodes"
          )
          .select("*")
          .eq("code", code)
          .single();

        if (
          error ||
          !data
        ) {

          return res
            .status(400)
            .json({
              error:
                "Invalid code"
            });
        }

        if (
          data.type ===
            "single" &&
          data.used
        ) {

          return res
            .status(400)
            .json({
              error:
                "Already used"
            });
        }

        const {
          error: updateError
        } = await supabase
          .from(
            "DiscountCodes"
          )
          .update({
            used: true,
            used_at:
              new Date()
                .toISOString(),
            invoice
          })
          .eq("code", code);

        if (updateError) {

          console.error(
            "DISCOUNT UPDATE ERROR:",
            updateError
          );

          return res
            .status(500)
            .json({
              error:
                updateError.message
            });
        }

        return res.json({
          success: true
        });

      } catch (err) {

        console.error(
          "DISCOUNT REDEEM ERROR:",
          err
        );

        return res
          .status(500)
          .json({
            error:
              "SERVER_ERROR"
          });
      }
    }
  );

  return router;
};