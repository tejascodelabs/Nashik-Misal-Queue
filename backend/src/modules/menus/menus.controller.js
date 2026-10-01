import { and, desc, eq, ilike, or } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "../../db/index.js";
import { menus, shops } from "../../db/schema.js";

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const serializeMenu = (req, menu) => ({
    ...menu,
    image: menu.image ? `${getBaseUrl(req)}${menu.image}` : null,
});

const getMenuId = (req) => Number(req.params.id);

export const createMenu = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const {
            shopId,
            name,
            description,
            category,
            price,
            isDiscount,
            discountPrice,
            sortOrder,
        } = req.body;

        if (!shopId || !name?.trim() || price === undefined || price === "") {
            return res.status(400).json({
                success: false,
                message: "shopId, name and price are required",
            });
        }

        const [shop] = await db
            .select({ id: shops.id })
            .from(shops)
            .where(and(eq(shops.id, Number(shopId)), eq(shops.ownerId, ownerId)))
            .limit(1);

        if (!shop) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to use this shop",
            });
        }

        const discountEnabled = isDiscount === true || isDiscount === "true";
        if (discountEnabled && (discountPrice === undefined || discountPrice === "")) {
            return res.status(400).json({
                success: false,
                message: "Discount price is required when discount is enabled",
            });
        }

        const [menu] = await db
            .insert(menus)
            .values({
                ownerId,
                shopId: Number(shopId),
                name: name.trim(),
                description: description?.trim() || null,
                category: category?.trim() || null,
                price: String(price),
                isDiscount: discountEnabled,
                discountPrice: discountEnabled ? String(discountPrice) : null,
                image: req.file ? `/uploads/menus/${req.file.filename}` : null,
                sortOrder: Number(sortOrder) || 0,
            })
            .returning();

        return res.status(201).json({
            success: true,
            message: "Menu created successfully",
            data: serializeMenu(req, menu),
        });
    } catch (error) {
        console.error("Create Menu Error:", error);
        return res.status(500).json({ success: false, message: "Failed to create menu" });
    }
};

export const getAllMenu = async (req, res) => {
    try {
        const { shopId, search, category, status } = req.query;
        const conditions = [];

        if (shopId) conditions.push(eq(menus.shopId, Number(shopId)));
        if (category) conditions.push(eq(menus.category, category));
        if (status) conditions.push(eq(menus.status, status));
        if (search?.trim()) {
            const value = `%${search.trim()}%`;
            conditions.push(or(ilike(menus.name, value), ilike(menus.description, value), ilike(menus.category, value)));
        }

        const menuList = await db
            .select()
            .from(menus)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(menus.sortOrder, desc(menus.createdAt));

        return res.status(200).json({
            success: true,
            message: "Menus fetched successfully",
            count: menuList.length,
            data: menuList.map((menu) => serializeMenu(req, menu)),
        });
    } catch (error) {
        console.error("Get All Menu Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch menus" });
    }
};

export const getMenuByID = async (req, res) => {
    try {
        const menuId = getMenuId(req);
        if (!Number.isInteger(menuId) || menuId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid menu ID" });
        }

        const [menu] = await db.select().from(menus).where(eq(menus.id, menuId)).limit(1);
        if (!menu) return res.status(404).json({ success: false, message: "Menu not found" });

        return res.status(200).json({
            success: true,
            message: "Menu fetched successfully",
            data: serializeMenu(req, menu),
        });
    } catch (error) {
        console.error("Get Menu By ID Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch menu" });
    }
};

const findOwnedMenu = async (menuId, ownerId) => {
    const [menu] = await db
        .select()
        .from(menus)
        .where(and(eq(menus.id, menuId), eq(menus.ownerId, ownerId)))
        .limit(1);
    return menu;
};

export const updateMenu = async (req, res) => {
    try {
        const menuId = getMenuId(req);
        if (!Number.isInteger(menuId) || menuId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid menu ID" });
        }
        const existingMenu = await findOwnedMenu(menuId, req.user.id);
        if (!existingMenu) return res.status(404).json({ success: false, message: "Menu not found" });

        const { shopId, name, description, category, price, isDiscount, discountPrice, sortOrder } = req.body;
        if (shopId !== undefined) {
            const [shop] = await db.select({ id: shops.id }).from(shops).where(and(eq(shops.id, Number(shopId)), eq(shops.ownerId, req.user.id))).limit(1);
            if (!shop) return res.status(403).json({ success: false, message: "You are not authorized to use this shop" });
        }

        const updateData = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (category !== undefined) updateData.category = category?.trim() || null;
        if (price !== undefined) updateData.price = String(price);
        if (isDiscount !== undefined) updateData.isDiscount = isDiscount === true || isDiscount === "true";
        if (discountPrice !== undefined) updateData.discountPrice = discountPrice === "" ? null : String(discountPrice);
        if (shopId !== undefined) updateData.shopId = Number(shopId);
        if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder) || 0;
        if (req.file) updateData.image = `/uploads/menus/${req.file.filename}`;

        const [updatedMenu] = await db.update(menus).set(updateData).where(eq(menus.id, menuId)).returning();
        if (req.file && existingMenu.image) {
            await unlink(path.resolve(existingMenu.image.replace(/^\/+/, ""))).catch(() => { });
        }

        return res.status(200).json({ success: true, message: "Menu updated successfully", data: serializeMenu(req, updatedMenu) });
    } catch (error) {
        console.error("Update Menu Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update menu" });
    }
};

export const deleteMenu = async (req, res) => {
    try {
        const menuId = getMenuId(req);
        if (!Number.isInteger(menuId) || menuId <= 0) return res.status(400).json({ success: false, message: "Invalid menu ID" });
        const existingMenu = await findOwnedMenu(menuId, req.user.id);
        if (!existingMenu) return res.status(404).json({ success: false, message: "Menu not found" });

        await db.delete(menus).where(eq(menus.id, menuId));
        if (existingMenu.image) await unlink(path.resolve(existingMenu.image.replace(/^\/+/, ""))).catch(() => { });
        return res.status(200).json({ success: true, message: "Menu deleted successfully" });
    } catch (error) {
        console.error("Delete Menu Error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete menu" });
    }
};

export const changeMenuStatus = async (req, res) => {
    try {
        const menuId = getMenuId(req);
        const { status } = req.body;
        
        if (!Number.isInteger(menuId) || menuId <= 0) return res.status(400).json({ success: false, message: "Invalid menu ID" });
        if (!["active", "inactive"].includes(status)) return res.status(400).json({ success: false, message: "Status must be active or inactive" });
        const existingMenu = await findOwnedMenu(menuId, req.user.id);
        if (!existingMenu) return res.status(404).json({ success: false, message: "Menu not found" });

        const [updatedMenu] = await db.update(menus).set({ status, updatedAt: new Date() }).where(eq(menus.id, menuId)).returning();
        return res.status(200).json({ success: true, message: `Menu ${status === "active" ? "activated" : "deactivated"} successfully`, data: updatedMenu });
    } catch (error) {
        console.error("Change Menu Status Error:", error);
        return res.status(500).json({ success: false, message: "Failed to change menu status" });
    }
};
