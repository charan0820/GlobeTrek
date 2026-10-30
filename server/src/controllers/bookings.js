import { Booking } from "../models/index.js";
import { id } from "../validators/index.js";
import { AppError, missing } from "../utils/errors.js";
import { reserve, cancel } from "../services/booking.js";
import { reconcileExpired } from "../services/reservations.js";
export const bookingsController = {
  create: async (req, res) => {
    const key = req.get("Idempotency-Key");
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key))
      throw new AppError(
        400,
        "INVALID_RETRY_KEY",
        "Provide an Idempotency-Key of 16–100 letters, numbers, hyphens or underscores.",
      );
    await reconcileExpired();
    const { booking, replayed } = await reserve(
      req.user.id,
      req.validated,
      key,
    );
    res
      .status(replayed ? 200 : 201)
      .json({ success: true, data: booking, meta: { replayed } });
  },
  list: async (req, res) => {
    const data = await Booking.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data, meta: { limit: 100 } });
  },
  detail: async (req, res) => {
    const booking = await Booking.findOne({
      _id: id.parse(req.params.id),
      user: req.user.id,
    });
    if (!booking) throw missing("Booking");
    res.json({ success: true, data: booking });
  },
  cancel: async (req, res) =>
    res.json({
      success: true,
      data: await cancel(req.user.id, id.parse(req.params.id)),
    }),
};
