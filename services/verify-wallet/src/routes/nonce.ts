import { Router, Request, Response } from "express";
import { z } from "zod";
import * as nonceStore from "../nonce.js";

export const nonceRouter = Router();

const QuerySchema = z.object({ pubkey: z.string().min(32).max(44) });

nonceRouter.get("/", (req: Request, res: Response) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: "pubkey required (32–44 chars)" });
        return;
    }
    const nonce = nonceStore.issue(parsed.data.pubkey);
    res.json({ nonce });
});
