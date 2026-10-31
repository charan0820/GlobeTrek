import {
  Country,
  City,
  Attraction,
  Tour,
  TourDeparture,
  Template,
  Package,
  PackageDeparture,
  Trip,
  Quote,
  Reservation,
} from "../models/travel.js";
import { Hotel } from "../models/index.js";
import { id } from "../validators/index.js";
import {
  createQuote,
  hold,
  transition,
  reconcileExpired,
  retryKey,
} from "../services/reservations.js";
import {
  ownTrip,
  saveTrip,
  deleteTrip,
  validateTrip,
} from "../services/trips.js";
import { AppError, missing } from "../utils/errors.js";
import { TtlCache } from "../utils/cache.js";
import { range } from "../services/travel-policy.js";
import { estimateSelections, tripEstimate } from "../services/estimates.js";
const collections = {
  attractions: Attraction,
  stays: Hotel,
  tours: Tour,
  templates: Template,
  packages: Package,
};
const ok = (res, data, meta) =>
  res.json({ success: true, data, ...(meta && { meta }) });
const escape = (q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function travelController({ cacheEnabled = true } = {}) {
  const cache = new TtlCache();
  return {
    estimates: async (req, res) =>
      ok(
        res.set("Cache-Control", "no-store"),
        await estimateSelections(req.validated),
      ),
    estimateTrip: async (req, res) =>
      ok(
        res.set("Cache-Control", "no-store"),
        await tripEstimate(validateTrip(req.validated)),
      ),
    departureLookup: async (req, res) =>
      ok(
        res,
        await TourDeparture.find({ _id: { $in: req.validated.ids } })
          .select("tour date startAt endAt timezone")
          .lean(),
      ),
    countries: async (_req, res) =>
      ok(res, await Country.find().sort({ name: 1 }).lean()),
    country: async (req, res) => {
      const country = await Country.findOne({
        code: req.params.code.toUpperCase(),
      }).lean();
      if (!country) throw missing("Country");
      ok(res, {
        ...country,
        cities: await City.find({ country: country.code }).lean(),
      });
    },
    catalog: async (req, res) => {
      const { kind, country, cityId, q, sort, page, limit, lat, lng, radius } =
        req.validated;
      if ((lat === undefined) !== (lng === undefined))
        throw new AppError(
          400,
          "INVALID_LOCATION",
          "Provide both latitude and longitude.",
        );
      const key = JSON.stringify(req.validated);
      const hit = cacheEnabled && cache.get(key);
      if (hit)
        return res
          .set("Age", String(Math.floor((Date.now() - hit.at) / 1000)))
          .set("Cache-Control", "public, max-age=60")
          .set("X-Cache", "HIT")
          .json(hit.body);
      const filter = {
        ...(country && { country }),
        ...(cityId && {
          [["templates", "packages"].includes(kind) ? "days.cityId" : "cityId"]:
            cityId,
        }),
        ...(q && { name: { $regex: escape(q), $options: "i" } }),
      };
      if (lat !== undefined)
        filter.location = {
          $geoWithin: { $centerSphere: [[lng, lat], radius / 6371] },
        };
      if (sort !== "name" && !country)
        throw new AppError(
          400,
          "COUNTRY_REQUIRED",
          "Choose a country before sorting destination prices.",
        );
      const rows = await collections[kind].find(filter).limit(1000).lean();
      rows.sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : (sort === "price_desc" ? -1 : 1) *
              ((a.minPrice ?? a.price ?? 0) - (b.minPrice ?? b.price ?? 0)) ||
            a.name.localeCompare(b.name),
      );
      const total = rows.length;
      const body = {
        success: true,
        data: rows.slice((page - 1) * limit, page * limit),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
      if (cacheEnabled) cache.set(key, { at: Date.now(), body });
      res
        .set("Cache-Control", "public, max-age=60")
        .set("X-Cache", cacheEnabled ? "MISS" : "DISABLED")
        .json(body);
    },
    search: async (req, res) => {
      const q = String(req.query.q || "").trim();
      if (q.length < 2 || q.length > 80) return ok(res, []);
      const pattern = { $regex: escape(q), $options: "i" };
      const groups = await Promise.all(
        Object.entries(collections).map(async ([kind, Model]) =>
          (
            await Model.find({ name: pattern })
              .sort({ name: 1 })
              .limit(3)
              .lean()
          ).map((r) => ({
            id: r.id || String(r._id),
            name: r.name,
            country: r.country,
            kind,
          })),
        ),
      );
      ok(res, groups.flat().slice(0, 10));
    },
    detail: async (req, res) => {
      if (!collections[req.params.kind]) throw missing("Collection");
      const record = await collections[req.params.kind]
        .findOne(
          req.params.kind === "attractions" || req.params.kind === "templates"
            ? { id: req.params.id }
            : { _id: id.parse(req.params.id) },
        )
        .lean();
      if (!record) throw missing("Place");
      ok(res, record);
    },
    departures: async (req, res) => {
      await reconcileExpired();
      const dates = range(req.validated.from, req.validated.to, {
        inclusive: true,
      });
      const Model =
        req.params.kind === "tours"
          ? TourDeparture
          : req.params.kind === "packages"
            ? PackageDeparture
            : null;
      if (!Model) throw missing("Departures");
      const rows = await Model.find({
        [req.params.kind === "tours" ? "tour" : "package"]: id.parse(
          req.params.id,
        ),
        date: { $in: dates },
        startAt: { $gt: new Date() },
      })
        .sort({ date: 1 })
        .lean();
      ok(
        res,
        rows.map((r) => ({ ...r, remaining: r.total - r.booked - r.held })),
      );
    },
    createTrip: async (req, res) =>
      res.status(201).json({
        success: true,
        data: await Trip.create({
          ...validateTrip(req.validated),
          user: req.user.id,
        }),
      }),
    listTrips: async (req, res) =>
      ok(
        res,
        await Promise.all(
          (
            await Trip.find({ user: req.user.id })
              .sort({ updatedAt: -1 })
              .limit(100)
              .lean()
          ).map(async (trip) => ({
            ...trip,
            pricingSummary: await tripEstimate(trip),
          })),
        ),
      ),
    trip: async (req, res) =>
      ok(res, await ownTrip(req.user.id, id.parse(req.params.id))),
    saveTrip: async (req, res) =>
      ok(
        res,
        await saveTrip(req.user.id, id.parse(req.params.id), req.validated),
      ),
    deleteTrip: async (req, res) => {
      await deleteTrip(req.user.id, id.parse(req.params.id));
      ok(res, { deleted: true });
    },
    quote: async (req, res) =>
      res.status(201).json({
        success: true,
        data: await createQuote(req.user.id, req.validated),
      }),
    quoteDetail: async (req, res) => {
      const quote = await Quote.findOne({
        _id: id.parse(req.params.id),
        user: req.user.id,
      });
      if (!quote) throw missing("Quote");
      ok(res, quote, { serverTime: new Date() });
    },
    hold: async (req, res) => {
      const result = await hold(
        req.user.id,
        req.validated.quoteId,
        retryKey(req),
      );
      res.status(result.replayed ? 200 : 201).json({
        success: true,
        data: result.reservation,
        meta: { replayed: result.replayed, serverTime: new Date() },
      });
    },
    reservations: async (req, res) => {
      await reconcileExpired({ user: req.user.id });
      ok(
        res,
        await Reservation.find({ user: req.user.id })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        { serverTime: new Date() },
      );
    },
    reservation: async (req, res) => {
      await reconcileExpired({ user: req.user.id });
      const record = await Reservation.findOne({
        _id: id.parse(req.params.id),
        user: req.user.id,
      });
      if (!record) throw missing("Reservation");
      ok(res, record, { serverTime: new Date() });
    },
    confirm: async (req, res) =>
      ok(
        res,
        await transition(req.user.id, id.parse(req.params.id), "confirm"),
      ),
    cancel: async (req, res) =>
      ok(res, await transition(req.user.id, id.parse(req.params.id), "cancel")),
  };
}
