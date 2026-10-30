import { reconcileExpired } from "./reservations.js";
import { refreshRates } from "./exchange-rates.js";
import { extendTravelInventory } from "../seed/travel.js";
import { Country } from "../models/travel.js";
// Capacity recovery is also request-driven. Sleeping hosting does not guarantee timers.
export function startMaintenance(logger = console) {
  let running = false;
  let extendedDay;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await reconcileExpired();
      const day = new Date().toISOString().slice(0, 10);
      if (extendedDay !== day && (await Country.exists({}))) {
        await extendTravelInventory();
        extendedDay = day;
      }
    } catch {
      logger.error("Hold reconciliation failed; the next cycle will retry.");
    } finally {
      running = false;
    }
    if (process.env.FX_REFRESH_ENABLED === "true") {
      try {
        await refreshRates();
      } catch {
        logger.error(
          "Exchange rates unavailable; native destination pricing remains available.",
        );
      }
    }
  };
  void run();
  const timer = setInterval(run, 30000);
  timer.unref();
  return () => clearInterval(timer);
}
