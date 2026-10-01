import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(moduleDirectory, "../../../uploads/menus");

await mkdir(uploadDirectory, {
  recursive: true,
});

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const uniqueName = `${Date.now()}-${crypto
      .randomBytes(8)
      .toString("hex")}${extension}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return cb(
      new Error(
        "Only JPG, JPEG, PNG, WEBP and GIF images are allowed"
      )
    );
  }

  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }

  cb(null, true);
};

export const menuUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});