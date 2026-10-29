import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import pino from "pino";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";
import { ZodError } from "zod";
import { root } from "./config.js";
import { AppError } from "./utils/errors.js";
import { authenticate, mutationOrigin } from "./middleware/security.js";
import { authController } from "./controllers/auth.js";
import { hotelsController } from "./controllers/hotels.js";
import { bookingsController as bookings } from "./controllers/bookings.js";
import {
  validate,
  registerInput,
  loginInput,
  listInput,
  stayInput,
  bookingInput,
} from "./validators/index.js";
export function createApp(
  config,
  {
    logLevel = process.env.LOG_LEVEL || "info",
    authLimit = 20,
    apiLimit = 300,
  } = {},
) {
  const app = express();
  const logger = pino({ level: logLevel });
  app.disable("x-powered-by");
  if (config.production) app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:"],
          "script-src": ["'self'"],
          "style-src": ["'self'"],
          "connect-src": ["'self'"],
        },
      },
    }),
  );
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set("X-Request-Id", req.requestId);
    res.set("Cache-Control", "no-store");
    const start = performance.now();
    res.on("finish", () => {
      // Explicit fields only: never log body, query, email, cookies, or headers.
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          route: req.route?.path || "unmatched",
          status: res.statusCode,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
        },
        "request",
      );
    });
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: apiLimit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Try again shortly.",
          },
        }),
    }),
  );
  app.use(
    express.json({ limit: "16kb" }),
    cookieParser(),
    mutationOrigin(config.origin),
  );
  const auth = authController(config),
    hotels = hotelsController(config),
    requireAuth = authenticate(config);
  const loginLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: authLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        error: {
          code: "AUTH_RATE_LIMITED",
          message: "Too many login attempts. Try again in 15 minutes.",
        },
      }),
  });
  app.get("/api/health", (_req, res) =>
    res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
      success: mongoose.connection.readyState === 1,
      data: {
        status: mongoose.connection.readyState === 1 ? "ready" : "unavailable",
      },
    }),
  );
  app.post(
    "/api/auth/register",
    loginLimit,
    validate(registerInput),
    auth.register,
  );
  app.post("/api/auth/login", loginLimit, validate(loginInput), auth.login);
  app.get("/api/auth/me", requireAuth, auth.me);
  app.post("/api/auth/logout", requireAuth, auth.logout);
  app.get("/api/hotels", validate(listInput, "query"), hotels.list);
  app.get(
    "/api/hotels/:id/availability",
    validate(stayInput, "query"),
    hotels.availability,
  );
  app.get("/api/hotels/:id", hotels.detail);
  app.post(
    "/api/bookings",
    requireAuth,
    validate(bookingInput),
    bookings.create,
  );
  app.get("/api/users/me/bookings", requireAuth, bookings.list);
  app.get("/api/bookings/:id", requireAuth, bookings.detail);
  app.delete("/api/bookings/:id", requireAuth, bookings.cancel);
  app.use("/api", (_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "API endpoint not found.")),
  );
  const client = path.join(root, "client/dist");
  if (existsSync(path.join(client, "index.html"))) {
    app.use(express.static(client));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.join(client, "index.html")),
    );
  }
  app.use((_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "Resource not found.")),
  );
  app.use((err, req, res, _next) => {
    let status = err.status || 500,
      code = err.code || "INTERNAL_ERROR",
      message = err.message,
      details;
    if (err instanceof ZodError) {
      status = 400;
      code = "VALIDATION_ERROR";
      message = "Please check the submitted fields.";
      details = err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
    }
    if (err.type === "entity.parse.failed") {
      status = 400;
      code = "INVALID_JSON";
      message = "Request body must contain valid JSON.";
    }
    if (status >= 500) {
      logger.error(
        { requestId: req.requestId, errorType: err.name },
        "request failed",
      );
      code = "INTERNAL_ERROR";
      message = "Something went wrong. Please try again.";
    }
    res
      .set("Cache-Control", "no-store")
      .status(status)
      .json({
        success: false,
        error: {
          code,
          message,
          ...(details && { details }),
          requestId: req.requestId,
        },
      });
  });
  return app;
}
