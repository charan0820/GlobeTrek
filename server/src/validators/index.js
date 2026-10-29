import { z } from "zod";
export const id = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid resource ID.")
  .transform((v) => v.toLowerCase());
export const registerInput = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.email().max(254).trim().toLowerCase(),
    password: z
      .string()
      .min(10)
      .max(72)
      .refine(
        (v) => Buffer.byteLength(v) <= 72,
        "Password must be at most 72 UTF-8 bytes.",
      ),
  })
  .strict();
export const loginInput = registerInput.omit({ name: true });
export const stayInput = z
  .object({
    roomTypeId: id,
    checkIn: z.string(),
    checkOut: z.string(),
    rooms: z.coerce.number().int().min(1).max(3),
    guests: z.coerce.number().int().min(1).max(12),
  })
  .strict();
export const bookingInput = stayInput.extend({ hotelId: id });
export const listInput = z
  .object({
    city: z.enum(["Jaipur", "Udaipur", "Kochi"]).optional(),
    q: z.string().trim().max(60).default(""),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(20).default(6),
    sort: z.enum(["name", "price_asc", "price_desc"]).default("name"),
    minCapacity: z.coerce.number().int().min(1).max(12).optional(),
  })
  .strict();
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    try {
      req.validated = schema.parse(req[source]);
      next();
    } catch (err) {
      next(err);
    }
  };
}
