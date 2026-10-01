import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const uploadRoot = path.resolve("uploads");

const fileFilter = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension) || !file.mimetype.startsWith("image/")) {
    const error = new Error(
      "Only JPG, JPEG, PNG, WEBP and GIF image files are allowed"
    );
    error.statusCode = 400;
    return callback(error);
  }

  callback(null, true);
};

export const createImageUpload = ({ folder, fields, field, maxCount = 1 }) => {
  const uploadDirectory = path.join(uploadRoot, folder);
  const storage = multer.diskStorage({
    destination: async (_req, _file, callback) => {
      try {
        await mkdir(uploadDirectory, { recursive: true });
        callback(null, uploadDirectory);
      } catch (error) {
        callback(error);
      }
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
  });

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 2 * 1024 * 1024,
      files: fields?.reduce((total, item) => total + item.maxCount, 0) || maxCount,
    },
  });

  return fields ? upload.fields(fields) : upload.single(field);
};

export const getUploadedFilePath = (folder, file) =>
  file ? `/uploads/${folder}/${file.filename}` : null;

export const deleteUploadedFiles = async (filePaths = []) => {
  await Promise.allSettled(
    filePaths
      .filter((filePath) => filePath?.startsWith("/uploads/"))
      .map((filePath) => unlink(path.resolve(`.${filePath}`)))
  );
};