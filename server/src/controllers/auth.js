import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { AppError } from "../utils/errors.js";
import {
  cookieOptions,
  loginCookie,
  publicUser,
} from "../middleware/security.js";
// A valid precomputed hash keeps unknown-email logins on the password-check path.
const dummyHash = bcrypt.hashSync("globetrek-dummy-not-a-real-password", 12);
export function authController(config) {
  return {
    register: async (req, res) => {
      const { name, email, password } = req.validated;
      const passwordHash = await bcrypt.hash(password, 12);
      let user;
      try {
        user = await User.create({ name, email, passwordHash });
      } catch (err) {
        if (err.code === 11000)
          throw new AppError(
            409,
            "EMAIL_IN_USE",
            "An account already uses this email. Try logging in.",
          );
        throw err;
      }
      loginCookie(res, user, config);
      res.status(201).json({ success: true, data: publicUser(user) });
    },
    login: async (req, res) => {
      const user = await User.findOne({ email: req.validated.email }).select(
        "+passwordHash",
      );
      const valid = await bcrypt.compare(
        req.validated.password,
        user?.passwordHash || dummyHash,
      );
      if (!user || !valid)
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      loginCookie(res, user, config);
      res.json({ success: true, data: publicUser(user) });
    },
    me: (req, res) => res.json({ success: true, data: publicUser(req.user) }),
    logout: async (req, res) => {
      await User.updateOne(
        { _id: req.user._id },
        { $inc: { tokenVersion: 1 } },
      );
      res.clearCookie("session", cookieOptions(config));
      res.json({ success: true, data: { loggedOut: true } });
    },
  };
}
