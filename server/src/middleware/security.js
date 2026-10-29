import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { AppError } from "../utils/errors.js";
export function mutationOrigin(origin) {
  return (req, _res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== origin
    )
      return next(
        new AppError(
          403,
          "INVALID_ORIGIN",
          "This request did not come from the application.",
        ),
      );
    next();
  };
}
export function authenticate(config) {
  return async (req, _res, next) => {
    let payload;
    try {
      payload = jwt.verify(req.cookies.session || "", config.secret, {
        algorithms: ["HS256"],
        issuer: "globetrek",
        audience: "globetrek-web",
      });
    } catch {
      return next(
        new AppError(401, "UNAUTHENTICATED", "Please log in to continue."),
      );
    }
    // Database outages are operational errors, not bad credentials.
    const user = await User.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.version)
      return next(
        new AppError(401, "UNAUTHENTICATED", "Please log in to continue."),
      );
    req.user = user;
    next();
  };
}
export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
export const cookieOptions = (config) => ({
  httpOnly: true,
  secure: config.production,
  sameSite: "lax",
  path: "/",
});
export function loginCookie(res, user, config) {
  const token = jwt.sign({ version: user.tokenVersion }, config.secret, {
    subject: user.id,
    algorithm: "HS256",
    issuer: "globetrek",
    audience: "globetrek-web",
    expiresIn: "2h",
  });
  res.cookie("session", token, {
    ...cookieOptions(config),
    maxAge: 2 * 60 * 60 * 1000,
  });
}
