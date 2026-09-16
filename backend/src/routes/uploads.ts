import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const uploadsRouter = Router();

// Local disk by default — the simplest thing that works with zero external
// dependencies for a self-hosted, resold template. The endpoint is the only
// place that knows where files live, so a buyer can swap this for an
// S3-compatible bucket later without touching any caller.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// Exported so other routes (e.g. the public payment-proof upload) can
// reuse the same local-disk storage/validation without duplicating it.
export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype] ?? ""}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

uploadsRouter.post(
  "/admin/uploads",
  requireAuth,
  asyncHandler(async (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
      res.status(201).json({ url: `${backendUrl}/uploads/${req.file.filename}` });
    });
  }),
);
