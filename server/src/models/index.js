import mongoose from "mongoose";
const { Schema, model } = mongoose;
const integer = {
  type: Number,
  required: true,
  min: 0,
  validate: Number.isSafeInteger,
};
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
const roomSchema = new Schema({
  name: { type: String, required: true },
  capacity: { ...integer, min: 1 },
  basePrice: integer,
  totalInventory: { ...integer, min: 1 },
  amenities: [String],
});
const hotelSchema = new Schema(
  {
    slug: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    neighborhood: String,
    description: String,
    amenities: [String],
    image: String,
    imageCredit: String,
    roomTypes: [roomSchema],
    minPrice: integer,
  },
  { timestamps: true },
);
hotelSchema.index({ city: 1, minPrice: 1 });
hotelSchema.index({ name: 1 });
const inventorySchema = new Schema({
  hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
  roomTypeId: { type: Schema.Types.ObjectId, required: true },
  date: { type: Date, required: true },
  total: integer,
  booked: { ...integer, default: 0 },
});
inventorySchema.index({ roomTypeId: 1, date: 1 }, { unique: true });
const bookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    roomTypeId: { type: Schema.Types.ObjectId, required: true },
    hotelName: String,
    city: String,
    roomName: String,
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    rooms: { ...integer, min: 1, max: 3 },
    guests: { ...integer, min: 1 },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
    price: {
      subtotal: integer,
      tax: integer,
      total: integer,
      currency: { type: String, default: "INR" },
      nights: integer,
    },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    cancelledAt: Date,
  },
  { timestamps: true },
);
bookingSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
bookingSchema.index({ user: 1, createdAt: -1 });
export const User = model("User", userSchema);
export const Hotel = model("Hotel", hotelSchema);
export const Inventory = model("Inventory", inventorySchema);
export const Booking = model("Booking", bookingSchema);
export async function ensureIndexes() {
  await Promise.all([
    User.init(),
    Hotel.init(),
    Inventory.init(),
    Booking.init(),
  ]);
}
