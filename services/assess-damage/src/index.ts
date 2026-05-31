import express from "express";
import rateLimit from "express-rate-limit";
import { assessRouter } from "./handler.js";
import { config } from "./config.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// In-process rate limiting as defense-in-depth.
// The primary rate limit is enforced by Cloud Armor at the load balancer (configured in §20 Terraform).
const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests — please retry in a minute." },
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/assess", limiter, assessRouter);

const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => console.log(`assess-damage running on :${PORT}`));
