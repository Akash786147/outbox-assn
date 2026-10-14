import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as auth from "../controllers/authController";
import * as email from "../controllers/emailController";
import * as slack from "../controllers/slackController";

const router = Router();

router.post("/auth/google", auth.googleLogin);
router.post("/auth/login", auth.passwordLogin);
router.get("/auth/me", requireAuth, auth.me);

router.get("/senders", requireAuth, email.senders);

router.post("/emails/schedule", requireAuth, email.schedule);
router.get("/emails", requireAuth, email.list);
router.get("/emails/stats", requireAuth, email.stats);
router.get("/emails/:id", requireAuth, email.getOne);
router.patch("/emails/:id/star", requireAuth, email.star);

router.get("/slack/connect-url", requireAuth, slack.connectUrl);
router.get("/slack/callback", slack.callback);
router.post("/slack/test", requireAuth, slack.test);
router.delete("/slack", requireAuth, slack.disconnect);

export default router;
