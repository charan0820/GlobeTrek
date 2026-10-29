import { Hotel } from "../models/index.js";
import { id } from "../validators/index.js";
import { missing } from "../utils/errors.js";
import { TtlCache } from "../utils/cache.js";
import { availability } from "../services/booking.js";
export function hotelsController({ cacheEnabled }) {
  const cache = new TtlCache();
  return {
    list: async (req, res) => {
      const { city, q, page, limit, sort, minCapacity } = req.validated;
      const key = JSON.stringify(req.validated);
      const cached = cacheEnabled && cache.get(key);
      res.set("Cache-Control", "public, max-age=60");
      if (cached) return res.set("X-Cache", "HIT").json(cached);
      const filter = {};
      if (city) filter.city = city;
      if (minCapacity !== undefined) {
        filter["roomTypes.capacity"] = { $gte: minCapacity };
      }
      if (q)
        filter.name = {
          $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        };
      const order = {
        name: { name: 1, _id: 1 },
        price_asc: { minPrice: 1, _id: 1 },
        price_desc: { minPrice: -1, _id: 1 },
      }[sort];
      const [data, total] = await Promise.all([
        Hotel.find(filter)
          .sort(order)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Hotel.countDocuments(filter),
      ]);
      const response = {
        success: true,
        data,
        meta: { page, limit, total, pages: Math.ceil(total / limit) },
      };
      if (cacheEnabled) cache.set(key, response);
      res.set("X-Cache", cacheEnabled ? "MISS" : "DISABLED").json(response);
    },
    detail: async (req, res) => {
      const hotel = await Hotel.findById(id.parse(req.params.id)).lean();
      if (!hotel) throw missing("Hotel");
      res.json({ success: true, data: hotel });
    },
    availability: async (req, res) =>
      res.json({
        success: true,
        data: await availability(id.parse(req.params.id), req.validated),
      }),
  };
}
