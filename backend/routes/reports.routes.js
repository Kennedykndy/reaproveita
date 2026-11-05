import { Router } from "express";
import { pool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// =========================================
// RELATÓRIO GERAL
// =========================================

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [summary] = await pool.query(`
    SELECT
      COUNT(DISTINCT CASE
        WHEN r.status = 'completed' THEN r.id
      END) AS completed_reservations,

      COALESCE(
        SUM(
          CASE
            WHEN r.status = 'completed'
            THEN r.quantity * p.weight_kg
            ELSE 0
          END
        ),
        0
      ) AS saved_kg,

      COUNT(DISTINCT p.id) AS products,
      COUNT(DISTINCT l.id) AS lots,
      COUNT(DISTINCT e.id) AS establishments

    FROM produtos p

    LEFT JOIN estabelecimentos e
      ON e.id = p.establishment_id

    LEFT JOIN lotes l
      ON l.product_id = p.id

    LEFT JOIN reservas r
      ON r.lot_id = l.id
  `);

    // Reaproveitamento por produto
    const byProduct = await pool.query(`
    SELECT
      p.name,

      COALESCE(
        SUM(
          CASE
            WHEN r.status = 'completed'
            THEN r.quantity * p.weight_kg
            ELSE 0
          END
        ),
        0
      ) AS saved_kg

    FROM produtos p

    LEFT JOIN lotes l
      ON l.product_id = p.id

    LEFT JOIN reservas r
      ON r.lot_id = l.id

    GROUP BY
      p.id,
      p.name

    HAVING saved_kg > 0

    ORDER BY saved_kg DESC
  `);

    res.json({
      success: true,
      data: {
        summary,
        by_product: byProduct,
      },
    });
  }),
);

// =========================================
// EXPORTAR RELATÓRIO CSV
// =========================================

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const rows = await pool.query(`
    SELECT
      p.name AS product,
      l.lot_code,
      r.reserver_name,
      r.quantity,
      p.weight_kg,
      CASE
      WHEN r.status = 'completed'
      THEN r.quantity * p.weight_kg
      ELSE 0
      END AS saved_kg,
      r.status,
      r.reserved_at

    FROM reservas r

    INNER JOIN lotes l
      ON l.id = r.lot_id

    INNER JOIN produtos p
      ON p.id = l.product_id

    ORDER BY r.reserved_at DESC
  `);

    const columns = [
      "product",
      "lot_code",
      "reserver_name",
      "quantity",
      "weight_kg",
      "saved_kg",
      "status",
      "reserved_at",
    ];

    const csv = [
      columns.join(";"),

      ...rows.map((row) =>
        columns
          .map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`)
          .join(";"),
      ),
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="relatorio-reaproveita.csv"',
    );

    res.send("\uFEFF" + csv);
  }),
);

export default router;
