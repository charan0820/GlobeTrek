import { z } from "zod";
import { id } from "./index.js";
export const departureLookup = z
  .object({
    ids: z
      .string()
      .max(4500)
      .transform((value) =>
        z.array(id).min(1).max(180).parse(value.split(",")),
      ),
  })
  .strict();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ref = z.string().min(1).max(100);
const country = z.enum([
  "IN",
  "JP",
  "TH",
  "ID",
  "FR",
  "IT",
  "ES",
  "GR",
  "TR",
  "US",
]);
export const stay = z
  .object({ hotelId: id, roomTypeId: id, checkIn: date, checkOut: date })
  .strict();
export const tripInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    country,
    startDate: date,
    endDate: date,
    travelers: z.number().int().min(1).max(12),
    days: z
      .array(
        z
          .object({
            date,
            stops: z
              .array(
                z
                  .object({
                    id: ref,
                    kind: z.enum(["attraction", "tour"]),
                    refId: ref,
                    departureId: id.optional(),
                  })
                  .strict(),
              )
              .max(12),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    stays: z.array(stay).max(30),
  })
  .strict();
export const tripUpdate = tripInput.extend({
  expectedRevision: z.number().int().positive(),
});
export const quoteInput = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("trip"),
      tripId: id,
      revision: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("stay"),
      ...stay.shape,
      travelers: z.number().int().min(1).max(12),
    })
    .strict(),
  z
    .object({
      kind: z.literal("tour"),
      departureId: id,
      travelers: z.number().int().min(1).max(12),
    })
    .strict(),
  z
    .object({
      kind: z.literal("package"),
      departureId: id,
      travelers: z.number().int().min(1).max(12),
    })
    .strict(),
]);
export const holdInput = z.object({ quoteId: id }).strict();
export const catalogInput = z
  .object({
    country: country.optional(),
    cityId: ref.optional(),
    kind: z
      .enum(["attractions", "stays", "tours", "templates", "packages"])
      .default("attractions"),
    q: z.string().trim().max(80).default(""),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    sort: z.enum(["name", "price_asc", "price_desc"]).default("name"),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(1).max(100).default(20),
  })
  .strict();
export const departureInput = z.object({ from: date, to: date }).strict();
export const estimateInput = z
  .object({
    travelers: z.number().int().min(1).max(12).default(2),
    selections: z
      .array(
        z
          .object({
            kind: z.enum([
              "attractions",
              "stays",
              "tours",
              "templates",
              "packages",
            ]),
            id: ref,
            roomTypeId: id.optional(),
            departureId: id.optional(),
            checkIn: date.optional(),
            checkOut: date.optional(),
          })
          .strict()
          .superRefine((value, ctx) => {
            if (
              ["stays", "tours", "packages"].includes(value.kind) &&
              !/^[a-f\d]{24}$/i.test(value.id)
            )
              ctx.addIssue({
                code: "custom",
                message: "Invalid product identifier.",
                path: ["id"],
              });
            if (Boolean(value.checkIn) !== Boolean(value.checkOut))
              ctx.addIssue({
                code: "custom",
                message: "Provide both stay dates.",
                path: ["checkOut"],
              });
          }),
      )
      .min(1)
      .max(20),
  })
  .strict();
