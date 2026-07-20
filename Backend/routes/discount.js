const express = require("express");

module.exports = (supabase) => {
  const router = express.Router();

  /*--------------------
      VALIDATE CODE
      (read-only check, safe to call repeatedly as customer types code in cart)
  --------------------*/
  router.post("/validate", async (req, res) => {
    try {
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

      if (!data.isValid) {
        return res.json({ valid: false, error: "NO_LONGER_VALID" });
      }

      if (data.type === "limited") {
        const expired = data.expiresAt && new Date(data.expiresAt) < new Date();
        const outOfUses = data.usesLeft !== null && data.usesLeft <= 0;

        if (expired || outOfUses) {
          // self-heal: flip isValid now that we've noticed it's exhausted
          await supabase.from("DiscountCodes").update({ isValid: false }).eq("code", code);
          return res.json({ valid: false, error: expired ? "EXPIRED" : "NO_USES_LEFT" });
        }
      }

      if (data.type === "single-use" && data.usedAt) {
        return res.json({ valid: false, error: "ALREADY_USED" });
      }

      return res.json({ valid: true, discount: data.discount });

    } catch (err) {
      console.error("DISCOUNT VALIDATION ERROR:", err);
      return res.status(500).json({ valid: false, error: "SERVER_ERROR" });
    }
  });

  /*--------------------
      REDEEM CODE
      (only called server-side, after payment succeeds — not from frontend directly)
  --------------------*/
  router.post("/redeem", async (req, res) => {
    try {
      const { code, invoice } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Missing discount code" });
      }

      const { data, error } = await supabase
        .from("DiscountCodes")
        .select("*")
        .eq("code", code)
        .single();

      if (error || !data) {
        return res.status(400).json({ error: "Invalid code" });
      }

      if (!data.isValid) {
        return res.status(400).json({ error: "Code no longer valid" });
      }

      if (data.type === "single-use") {
        if (data.usedAt) {
          return res.status(400).json({ error: "Already used" });
        }
        const { error: updateError } = await supabase
          .from("DiscountCodes")
          .update({ isValid: false, usedAt: new Date().toISOString(), invoice })
          .eq("code", code);

        if (updateError) throw updateError;

      } else if (data.type === "limited") {
        const newUsesLeft = data.usesLeft !== null ? data.usesLeft - 1 : null;
        const expired = data.expiresAt && new Date(data.expiresAt) < new Date();
        const outOfUses = newUsesLeft !== null && newUsesLeft <= 0;

        const { error: updateError } = await supabase
          .from("DiscountCodes")
          .update({
            usesLeft: newUsesLeft,
            isValid: !(expired || outOfUses)
          })
          .eq("code", code);

        if (updateError) throw updateError;
      }
      // "unlimited" type: no DB update needed on redeem

      return res.json({ success: true });

    } catch (err) {
      console.error("DISCOUNT REDEEM ERROR:", err);
      return res.status(500).json({ error: "SERVER_ERROR" });
    }
  });

  return router;
};