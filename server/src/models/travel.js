import mongoose from "mongoose";
const { Schema, model } = mongoose;
export const geographicPoint = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);
const integer = {
  type: Number,
  min: 0,
  required: true,
  validate: Number.isSafeInteger,
};
const catalog = {
  country: { type: String, required: true, index: true },
  cityId: String,
  name: String,
  version: { type: Number, default: 1 },
};
export const Country = model(
  "Country",
  new Schema({
    code: { type: String, unique: true },
    iso3: String,
    name: String,
    currency: String,
    lat: Number,
    lng: Number,
    description: String,
    source: String,
    version: Number,
  }),
);
export const City = model(
  "City",
  new Schema({
    id: { type: String, unique: true },
    country: String,
    name: String,
    timezone: String,
    lat: Number,
    lng: Number,
    source: String,
  }),
);
export const Attraction = model(
  "Attraction",
  new Schema({
    id: { type: String, unique: true },
    ...catalog,
    city: String,
    lat: Number,
    lng: Number,
    source: String,
    durationMinutes: Number,
    description: String,
    coordinateAccuracy: String,
    location: { type: geographicPoint, default: undefined },
    visitDurationBasis: String,
  }),
);
export const Tour = model(
  "Tour",
  new Schema({
    ...catalog,
    slug: { type: String, unique: true },
    city: String,
    timezone: String,
    lat: Number,
    lng: Number,
    currency: String,
    price: integer,
    durationMinutes: Number,
    localStart: String,
    total: integer,
    demo: Boolean,
    description: String,
    attractionIds: [String],
    location: { type: geographicPoint, default: undefined },
    inventoryThrough: String,
  }),
);
const departureSchema = new Schema({
  tour: { type: Schema.Types.ObjectId, ref: "Tour" },
  country: String,
  date: String,
  startAt: Date,
  endAt: Date,
  timezone: String,
  total: integer,
  booked: { ...integer, default: 0 },
  held: { ...integer, default: 0 },
});
departureSchema.index({ tour: 1, date: 1 }, { unique: true });
export const TourDeparture = model("TourDeparture", departureSchema);
Attraction.schema.index({ location: "2dsphere" });
Tour.schema.index({ location: "2dsphere" });
export const Template = model(
  "Template",
  new Schema({
    id: { type: String, unique: true },
    ...catalog,
    description: String,
    days: [Schema.Types.Mixed],
  }),
);
export const Package = model(
  "Package",
  new Schema({
    ...catalog,
    slug: { type: String, unique: true },
    templateId: String,
    days: [Schema.Types.Mixed],
    durationDays: Number,
    demo: Boolean,
    description: String,
    inventoryThrough: String,
  }),
);
const packageDepartureSchema = new Schema({
  package: { type: Schema.Types.ObjectId, ref: "Package" },
  country: String,
  date: String,
  startAt: Date,
  total: integer,
  booked: { ...integer, default: 0 },
  held: { ...integer, default: 0 },
  stays: [Schema.Types.Mixed],
  tours: [Schema.Types.ObjectId],
});
packageDepartureSchema.index({ package: 1, date: 1 }, { unique: true });
export const PackageDeparture = model(
  "PackageDeparture",
  packageDepartureSchema,
);
export const Trip = model(
  "Trip",
  new Schema(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      name: String,
      country: String,
      startDate: String,
      endDate: String,
      travelers: Number,
      revision: { type: Number, default: 1 },
      reservationEpoch: { type: Number, default: 0 },
      days: [Schema.Types.Mixed],
      stays: [Schema.Types.Mixed],
    },
    { timestamps: true },
  ),
);
export const Quote = model(
  "Quote",
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, required: true },
      source: Schema.Types.Mixed,
      trip: Schema.Types.ObjectId,
      revision: Number,
      country: String,
      travelers: Number,
      items: [Schema.Types.Mixed],
      demands: [Schema.Types.Mixed],
      price: Schema.Types.Mixed,
      expiresAt: Date,
      firstStart: Date,
      cleanupAt: Date,
    },
    { timestamps: true },
  ),
);
Quote.schema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });
const reservationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true },
    quote: Schema.Types.ObjectId,
    trip: Schema.Types.ObjectId,
    source: Schema.Types.Mixed,
    country: String,
    travelers: Number,
    items: [Schema.Types.Mixed],
    demands: [Schema.Types.Mixed],
    price: Schema.Types.Mixed,
    firstStart: Date,
    expiresAt: Date,
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired"],
      required: true,
    },
    idempotencyKey: String,
    requestHash: String,
    confirmedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);
reservationSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
reservationSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "one_pending_per_user",
  },
);
reservationSchema.index(
  { trip: 1 },
  {
    unique: true,
    partialFilterExpression: {
      trip: { $type: "objectId" },
      status: { $in: ["pending", "confirmed"] },
    },
    name: "one_active_per_trip",
  },
);
reservationSchema.index({ status: 1, expiresAt: 1 });
export const Reservation = model("Reservation", reservationSchema);
export const ExchangeRateSnapshot = model(
  "ExchangeRateSnapshot",
  new Schema({
    date: { type: String, unique: true },
    rates: Schema.Types.Mixed,
    fetchedAt: Date,
    source: String,
  }),
);
export const travelModels = [
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
  ExchangeRateSnapshot,
];
