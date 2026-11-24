import { Router } from "express";

import {
  login,
  logout,
  refresh,
  me,
} from "./auth.controller";

import {
  authenticate,
  authorize,
} from "./auth.middleware";

const router = Router();

router.post("/login", login);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.get(
  "/me",
  authenticate,
  me
);

// Example protected administrative endpoint.
router.get(
  "/admin-check",
  authenticate,
  authorize("HR_ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Administrator access granted",
    });
  }
);

export default router;