import { pool } from "../../db/index.js";

export const getOwnerDashboard = async (req, res) => {
  try {
    const shopId = Number(req.params.shopId);

    if (!req.user || !Number.isInteger(shopId) || shopId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid shop ID and authentication are required",
      });
    }

    const ownership = await pool.query(
      `SELECT id FROM shops WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [shopId, req.user.id]
    );

    if (ownership.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this shop dashboard",
      });
    }

    // Live queue
    const liveQueueQuery = `
      SELECT
        queue_type,
        COUNT(*)::int AS count
      FROM tokens
      WHERE shop_id = $1
        AND DATE(created_at) = CURRENT_DATE
        AND status = 'waiting'
      GROUP BY queue_type
      ORDER BY queue_type;
    `;

    // Today's summary
    const summaryQuery = `
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'waiting'
        )::int AS waiting,

        COUNT(*) FILTER (
          WHERE status = 'arrived'
        )::int AS arrived,

        COUNT(*) FILTER (
          WHERE status = 'not_arrived'
        )::int AS not_arrived,

        COUNT(*) FILTER (
          WHERE status = 'cancelled'
        )::int AS cancelled

      FROM tokens
      WHERE shop_id = $1
        AND DATE(created_at) = CURRENT_DATE;
    `;

    const [liveQueue, summary] = await Promise.all([
      pool.query(liveQueueQuery, [shopId]),
      pool.query(summaryQuery, [shopId]),
    ]);

    return res.status(200).json({
      success: true,

      liveQueue: liveQueue.rows,

      todaySummary: summary.rows[0],

    });

  } catch (error) {
    console.error("Owner Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch owner dashboard"
    });
  }
};
