import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware/require-auth.js";
import { sendRouter } from "./routes/send.js";

const app = express();
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests — please retry in a minute." },
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/send", limiter, requireAuth, sendRouter);

const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => console.log(`send-signing-link running on :${PORT}`));
