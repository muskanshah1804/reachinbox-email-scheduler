import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import { env } from "../config/env";

const router = Router();

passport.use(
  new GoogleStrategy(
    {
      clientID: env.googleClientId,
      clientSecret: env.googleClientSecret,
      callbackURL: env.googleCallbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      return done(null, {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || "",
        photo: profile.photos?.[0]?.value || "",
      });
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export const authMiddleware = session({
  secret: "reachinbox-demo-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5175/?login=failed",
  }),
  (_req, res) => {
    res.redirect("http://localhost:5175/?login=success");
  }
);

router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.json({
      authenticated: false,
    });
  }

  return res.json({
    authenticated: true,
    user: req.user,
  });
});

router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({
      authenticated: false,
    });
  });
});

export default router;
