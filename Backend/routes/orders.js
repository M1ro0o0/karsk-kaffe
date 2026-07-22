const express = require("express");

module.exports = (supabase) => {
  const router = express.Router();

  router.get("/:id/status", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("Orders")
        .select("status, customerName, totalAmount")
        .eq("id", req.params.id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(data); // only ever expose minimal fields — never the full row publicly
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};