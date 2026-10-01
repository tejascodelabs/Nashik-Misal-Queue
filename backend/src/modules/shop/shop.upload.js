import path from "node:path";
import { unlink } from "node:fs/promises";
import { createImageUpload } from "../../shared/middleware/image-upload.js";

const shopUploadFields = [
  { name: "profile_image", maxCount: 1 },
  { name: "images", maxCount: 10 },
];

export const shopUpload = createImageUpload({
  folder: "shops",
  fields: shopUploadFields,
});

export const saveShopFiles = async (files = []) =>
  files.map((file) => ({
    absolutePath: path.resolve("uploads/shops", file.filename),
    relativePath: `/uploads/shops/${file.filename}`,
  }));

export const deleteShopFiles = async (filePaths = []) => {
  await Promise.allSettled(
    filePaths
      .filter((filePath) => filePath?.startsWith("/uploads/shops/"))
      .map((filePath) => unlink(path.resolve(`.${filePath}`)))
  );
};

export const getShopImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${req.protocol}://${req.get("host")}${imagePath}`;
};

export const serializeShop = (req, shop) => {
  const { profileImage, ...shopData } = shop;

  return {
    ...shopData,
    profile_image: getShopImageUrl(req, profileImage),
    images: Array.isArray(shop.images)
      ? shop.images.map((imagePath) => getShopImageUrl(req, imagePath))
      : [],
  };
};

export const getStoredShopImagePath = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("/uploads/shops/")) return imagePath;

  try {
    const pathname = new URL(imagePath).pathname;
    return pathname.startsWith("/uploads/shops/") ? pathname : null;
  } catch {
    return null;
  }
};