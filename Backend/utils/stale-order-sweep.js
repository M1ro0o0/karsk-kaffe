/**
 * Wires up releaseStaleOrders() to actually run on a schedule.
 *
 * order-reservation.js explicitly says nothing wires this up — this file is that wiring.
 * Require and call startStaleOrderSweep(supabase) once, wherever your server boots
 * (e.g. server.js), alongside your existing route setup.
 *
 * IMPORTANT — only correct for a long-running Node process (a normal Express server kept
 * alive by e.g. PM2, a VM, Railway, Render, Fly.io, etc). If this API is deployed as
 * serverless functions (Vercel, Netlify, AWS Lambda, Supabase Edge Functions), node-cron
 * will NOT work — the process doesn't stay alive between requests, so nothing will ever
 * trigger it. In that case use the platform's own scheduler instead (e.g. Vercel Cron,
 * a Supabase scheduled Edge Function, or a GitHub Actions cron hitting a protected route)
 * and just call releaseStaleOrders(supabase, olderThanMinutes) from inside that.
 */

const cron = require("node-cron");
const { releaseStaleOrders } = require("./utils/order-reservation");

function startStaleOrderSweep(supabase, { schedule = "*/10 * * * *", olderThanMinutes = 30 } = {}) {
  cron.schedule(schedule, async () => {
    try {
      await releaseStaleOrders(supabase, olderThanMinutes);
    } catch (err) {
      console.error("Stale order sweep failed:", err);
    }
  });

  console.log(`Stale order sweep scheduled: "${schedule}", releasing pending orders older than ${olderThanMinutes}m`);
}

module.exports = { startStaleOrderSweep };