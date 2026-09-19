import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const translateRouter = Router();

const translateSchema = z.object({
  text: z.string().min(1),
  target: z.enum(["en", "ar"]),
});

// Admin-only assist for the bilingual Content editor's "Auto-translate"
// button — optional, same pattern as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY on
// the web side: a real, billed third-party dependency that must never
// block the underlying feature (the owner can always type both
// languages by hand) when the buyer hasn't configured it.
translateRouter.post(
  "/admin/translate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = translateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return res.status(501).json({ error: "Translation is not configured on this server" });
    }

    const response = await fetch(`https://translation.googleapis.com/language/translate2?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: parsed.data.text, target: parsed.data.target, format: "text" }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Translation request failed" });
    }

    const data = (await response.json()) as {
      data?: { translations?: { translatedText?: string }[] };
    };
    const translatedText = data.data?.translations?.[0]?.translatedText;
    if (!translatedText) {
      return res.status(502).json({ error: "Translation request failed" });
    }

    res.json({ translatedText });
  }),
);
