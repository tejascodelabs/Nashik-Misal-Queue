import { and, eq, asc, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tokens } from "../../db/schema.js";
import { emitToShop } from "../../shared/socket.js";

const tokenIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const emitTokenUpdate = (token, event = "token:updated") => {
  emitToShop(token.shopId, event, { token });
};

const expireCalledToken = async (tokenId, shopId) => {
  const [expired] = await db
    .update(tokens)
    .set({
      status: "not_arrived",
      callTimeout: true,
      expiredAt: new Date(),
    })
    .where(
      and(
        eq(tokens.id, tokenId),
        eq(tokens.status, "called"),
        eq(tokens.callTimeout, false)
      )
    )
    .returning();

  if (expired) emitTokenUpdate(expired, "token:timeout");
  return expired;
};

export async function createToken(req, res) {
  const { shopId, mobile, name, groupSize = 1, queueType = "A" } = req.body;

  if (
    !Number.isInteger(Number(shopId)) ||
    !/^\d{10}$/.test(String(mobile ?? "")) ||
    !String(name ?? "").trim() ||
    !Number.isInteger(Number(groupSize)) ||
    Number(groupSize) < 1 ||
    Number(groupSize) > 20 ||
    !/^[a-zA-Z0-9]{1,5}$/.test(String(queueType))
  ) {
    return res.status(400).json({ message: "Invalid token details." });
  }

  try {
    const token = await db.transaction(async (tx) => {
      // Serialize token-number allocation for this shop and queue type today.
      await tx.execute(sql`
        SELECT pg_advisory_xact_lock(
          hashtext(${`${shopId}:${queueType.toUpperCase()}:${new Date().toISOString().slice(0, 10)}`})
        )
      `);

      const [result] = await tx
        .select({
          maxTokenNo: sql`coalesce(max(${tokens.tokenNo}), 0)::int`,
        })
        .from(tokens)
        .where(
          and(
            eq(tokens.shopId, Number(shopId)),
            eq(tokens.queueType, queueType.toUpperCase()),
            sql`${tokens.queueDate} = CURRENT_DATE`
          )
        );

      const [created] = await tx
        .insert(tokens)
        .values({
          shopId: Number(shopId),
          mobile: String(mobile),
          name: String(name).trim(),
          groupSize: Number(groupSize),
          queueType: queueType.toUpperCase(),
          tokenNo: result.maxTokenNo + 1,
        })
        .returning();

      return created;
    });

    return res.status(201).json({ token });
  } catch (error) {
    console.error("Create token failed:", error);
    return res.status(500).json({ message: "Could not create token." });
  }
}

export async function getTokenById(req, res) {
  const { id } = req.params;

  // UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof id !== "string" || !uuidRegex.test(id)) {
    return res.status(400).json({
      message: "Invalid token ID.",
    });
  }

  try {
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, id))
      .limit(1);

    if (!token) {
      return res.status(404).json({
        message: "Token not found.",
      });
    }

    return res.status(200).json({
      token,
    });
  } catch (error) {
    console.error("Get token by ID failed:", error);

    return res.status(500).json({
      message: "Could not fetch token.",
    });
  }
}

export async function cancelToken(req, res) {
  const { mobile, reason } = req.body;

  if (!/^\d{10}$/.test(String(mobile ?? ""))) {
    return res.status(400).json({ message: "A valid mobile number is required." });
  }

  try {
    const [cancelled] = await db
      .update(tokens)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason ? String(reason).slice(0, 500) : null,
      })
      .where(
        and(
          eq(tokens.id, req.params.id),
          eq(tokens.mobile, String(mobile)),
          eq(tokens.status, "waiting")
        )
      )
      .returning();

    if (!cancelled) {
      return res.status(404).json({
        message: "Waiting token not found for that mobile number.",
      });
    }

    return res.json({ token: cancelled });
  } catch (error) {
    console.error("Cancel token failed:", error);
    return res.status(500).json({ message: "Could not cancel token." });
  }
}

export async function callNextToken(req, res) {
  const shopId = Number(req.params.shopId);
  const queueType = req.body?.queueType
    ? String(req.body.queueType).trim().toUpperCase()
    : null;
  const staffName = req.user?.name || req.body.staffName || null;

  if (!Number.isInteger(shopId) || shopId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid shop ID." });
  }

  try {
    const calledToken = await db.transaction(async (tx) => {
      const conditions = [
        eq(tokens.shopId, shopId),
        eq(tokens.status, "waiting"),
        eq(tokens.queueDate, sql`CURRENT_DATE`),
      ];

      if (queueType) conditions.push(eq(tokens.queueType, queueType));

      const [nextToken] = await tx
        .select()
        .from(tokens)
        .where(and(...conditions))
        .orderBy(asc(tokens.tokenNo))
        .limit(1);

      if (!nextToken) return null;

      const expiresAt = new Date(Date.now() + 30_000);
      const [updated] = await tx
        .update(tokens)
        .set({
          status: "called",
          alerted: true,
          calledAt: new Date(),
          expiresAt,
          callTimeout: false,
          calledByStaffName: staffName,
        })
        .where(and(eq(tokens.id, nextToken.id), eq(tokens.status, "waiting")))
        .returning();

      return updated;
    });

    if (!calledToken) {
      return res.status(404).json({
        success: false,
        message: "No waiting token found.",
      });
    }

    emitTokenUpdate(calledToken, "token:called");
    emitTokenUpdate(calledToken, "token:bell");
    setTimeout(() => expireCalledToken(calledToken.id, shopId), 30_000);

    return res.status(200).json({
      success: true,
      countdownSeconds: 30,
      token: calledToken,
    });
  } catch (error) {
    console.error("Call next token failed:", error);
    return res.status(500).json({ success: false, message: "Could not call next token." });
  }
}

export async function markTokenHere(req, res) {
  const { id } = req.params;
  const { mobile } = req.body;

  if (!tokenIdPattern.test(id)) {
    return res.status(400).json({ success: false, message: "Invalid token ID." });
  }

  try {
    const conditions = [eq(tokens.id, id), eq(tokens.status, "called")];
    if (mobile !== undefined) conditions.push(eq(tokens.mobile, String(mobile)));

    const [updated] = await db
      .update(tokens)
      .set({
        status: "arrived",
        customerArrived: true,
        callTimeout: false,
        expiredAt: null,
      })
      .where(and(...conditions))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Called token not found or already expired.",
      });
    }

    emitTokenUpdate(updated, "token:im-here");
    return res.status(200).json({ success: true, token: updated });
  } catch (error) {
    console.error("Mark token here failed:", error);
    return res.status(500).json({ success: false, message: "Could not update token arrival." });
  }
}

export async function updateTokenArrivalStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!tokenIdPattern.test(id)) {
    return res.status(400).json({ success: false, message: "Invalid token ID." });
  }

  if (!["arrived", "not_arrived"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "status must be either arrived or not_arrived.",
    });
  }

  try {
    const [updated] = await db
      .update(tokens)
      .set({
        status,
        customerArrived: status === "arrived",
        callTimeout: status === "not_arrived",
        expiredAt: status === "not_arrived" ? new Date() : null,
      })
      .where(eq(tokens.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Token not found." });
    }

    emitTokenUpdate(updated, "token:arrival-status");
    return res.status(200).json({ success: true, token: updated });
  } catch (error) {
    console.error("Update token arrival status failed:", error);
    return res.status(500).json({ success: false, message: "Could not update arrival status." });
  }
}


export async function getTokenByShopId(req, res) {
  const { shopId } = req.params;
  const parsedShopId = Number(shopId);

  if (
    typeof shopId !== "string" ||
    !/^\d+$/.test(shopId) ||
    !Number.isSafeInteger(parsedShopId) ||
    parsedShopId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid shop ID.",
    });
  }

  try {
    // Today's date
    const today = new Date().toISOString().split("T")[0];

    const tokenList = await db
      .select()
      .from(tokens)
      .where(
        and(
          eq(tokens.shopId, parsedShopId),
          eq(tokens.status, "waiting"),
          eq(tokens.queueDate, today)
        )
      )
      .orderBy(
        sql`
          CASE
            WHEN ${tokens.queueType} = 'Q2' THEN 1
            WHEN ${tokens.queueType} = 'Q4' THEN 2
            WHEN ${tokens.queueType} = 'Q6' THEN 3
            WHEN ${tokens.queueType} = 'Q8' THEN 4
            ELSE 5
          END
        `,
        asc(tokens.tokenNo)
      );

    // Group by queue type
    const groupedTokens = {
      Q2: [],
      Q4: [],
      Q6: [],
      Q8: [],
    };

    for (const token of tokenList) {
      if (groupedTokens[token.queueType]) {
        groupedTokens[token.queueType].push(token);
      }
    }

    return res.status(200).json({
      success: true,
      tokens: groupedTokens,
    });
  } catch (error) {
    console.error(
      "Get waiting tokens by shop ID failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Could not fetch tokens.",
    });
  }
}
