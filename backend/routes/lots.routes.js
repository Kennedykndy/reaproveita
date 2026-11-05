import { Router } from "express";
import { pool } from "../config/database.js";
import { asyncHandler, httpError } from "../utils/asyncHandler.js";

const router = Router();

// =========================================
// LISTAR LOTES
// =========================================

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = `%${String(req.query.search || "").trim()}%`;
    const status = req.query.status || "all";

    let where = "(p.name LIKE ? OR COALESCE(l.lot_code, '') LIKE ?)";
    const params = [search, search];

    if (status === "available") {
      where += `
      AND l.quantity_available > 0
      AND l.expiry_date >= CURDATE()
    `;
    }

    if (status === "expiring") {
      where += `
      AND l.quantity_available > 0
      AND l.expiry_date BETWEEN CURDATE()
      AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    `;
    }

    if (status === "expired") {
      where += " AND l.expiry_date < CURDATE()";
    }

    if (status === "empty") {
      where += " AND l.quantity_available <= 0";
    }

    const rows = await pool.query(
      `
    SELECT
      l.*,
      p.name AS product_name,
      p.unit,
      p.weight_kg,
      CASE
        WHEN l.quantity_available <= 0 THEN 'empty'
        WHEN l.expiry_date < CURDATE() THEN 'expired'
        WHEN l.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 'expiring'
        ELSE 'regular'
      END AS situation
    FROM lotes l
    INNER JOIN produtos p
      ON p.id = l.product_id
    WHERE ${where}
    ORDER BY l.expiry_date ASC
  `,
      params,
    );

    res.json({
      success: true,
      data: rows,
    });
  }),
);

// =========================================
// CADASTRAR LOTE
// =========================================

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      product_id,
      lot_code = null,
      quantity_initial,
      expiry_date,
      received_at,
      notes = null,
    } = req.body;

    const quantity = Number(quantity_initial);

    if (
      !product_id ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !expiry_date
    ) {
      throw httpError("Informe produto, quantidade maior que zero e validade.");
    }

    const result = await pool.query(
      `INSERT INTO lotes
      (product_id, lot_code, quantity_initial, quantity_available,
       expiry_date, received_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_id,
        lot_code || null,
        quantity,
        quantity,
        expiry_date,
        received_at || new Date().toISOString().slice(0, 10),
        notes,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Lote cadastrado.",
      data: {
        id: Number(result.insertId),
      },
    });
  }),
);

// =========================================
// ATUALIZAR LOTE
// =========================================

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const {
      product_id,
      lot_code = null,
      quantity_initial,
      expiry_date,
      received_at,
      notes = null,
    } = req.body;

    const quantity = Number(quantity_initial);

    if (
      !product_id ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !expiry_date
    ) {
      throw httpError("Informe produto, quantidade maior que zero e validade.");
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const rows = await conn.query(
        "SELECT * FROM lotes WHERE id = ? FOR UPDATE",
        [req.params.id],
      );

      const current = rows[0];

      if (!current) {
        throw httpError("Lote não encontrado.", 404);
      }

      const reserved =
        Number(current.quantity_initial) - Number(current.quantity_available);

      if (quantity < reserved) {
        throw httpError(
          "A quantidade inicial não pode ser menor que a quantidade já reservada.",
        );
      }

      await conn.query(
        `UPDATE lotes
       SET
         product_id = ?,
         lot_code = ?,
         quantity_initial = ?,
         quantity_available = ?,
         expiry_date = ?,
         received_at = ?,
         notes = ?
       WHERE id = ?`,
        [
          product_id,
          lot_code || null,
          quantity,
          quantity - reserved,
          expiry_date,
          received_at || current.received_at,
          notes,
          req.params.id,
        ],
      );

      await conn.commit();

      res.json({
        success: true,
        message: "Lote atualizado.",
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }),
);

// =========================================
// EXCLUIR LOTE
// =========================================

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM lotes WHERE id = ?", [
        req.params.id,
      ]);

      if (!result.affectedRows) {
        throw httpError("Lote não encontrado.", 404);
      }

      res.json({
        success: true,
        message: "Lote excluído.",
      });
    } catch (error) {
      if (
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        error.code === "ER_ROW_IS_REFERENCED"
      ) {
        throw httpError(
          "Este lote possui reservas vinculadas e não pode ser excluído.",
          409,
        );
      }

      throw error;
    }
  }),
);

export default router;
