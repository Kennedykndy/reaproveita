import { Router } from "express";
import { pool } from "../config/database.js";
import { asyncHandler, httpError } from "../utils/asyncHandler.js";

const router = Router();

// =========================================
// LISTAR RESERVAS
// =========================================

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = `%${String(req.query.search || "").trim()}%`;
    const status = req.query.status || "all";

    let where = "(r.reserver_name LIKE ? OR p.name LIKE ?)";
    const params = [search, search];

    if (status !== "all") {
      where += " AND r.status = ?";
      params.push(status);
    }

    const rows = await pool.query(
      `
    SELECT
      r.*,
      l.lot_code,
      p.name AS product_name,
      p.unit
    FROM reservas r
    INNER JOIN lotes l
      ON l.id = r.lot_id
    INNER JOIN produtos p
      ON p.id = l.product_id
    WHERE ${where}
    ORDER BY r.reserved_at DESC
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
// CADASTRAR RESERVA
// =========================================

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      lot_id,
      reserver_name,
      contact = null,
      quantity,
      notes = null,
    } = req.body;

    const amount = Number(quantity);

    if (
      !lot_id ||
      !String(reserver_name || "").trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw httpError("Informe lote, nome do responsável e quantidade válida.");
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const lots = await conn.query(
        "SELECT * FROM lotes WHERE id = ? FOR UPDATE",
        [lot_id],
      );

      const lot = lots[0];

      if (!lot) {
        throw httpError("Lote não encontrado.", 404);
      }

      const today = new Date().toISOString().slice(0, 10);

      if (String(lot.expiry_date).slice(0, 10) < today) {
        throw httpError("Este lote está vencido e não pode ser reservado.");
      }

      if (Number(lot.quantity_available) < amount) {
        throw httpError(`Quantidade disponível: ${lot.quantity_available}.`);
      }

      await conn.query(
        `UPDATE lotes
       SET quantity_available = quantity_available - ?
       WHERE id = ?`,
        [amount, lot_id],
      );

      const result = await conn.query(
        `INSERT INTO reservas
        (lot_id, reserver_name, contact, quantity, notes)
       VALUES (?, ?, ?, ?, ?)`,
        [lot_id, reserver_name.trim(), contact, amount, notes],
      );

      await conn.commit();

      res.status(201).json({
        success: true,
        message: "Reserva registrada.",
        data: {
          id: Number(result.insertId),
        },
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
// ATUALIZAR STATUS DA RESERVA
// =========================================

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    const allowed = ["pending", "confirmed", "completed", "cancelled"];

    if (!allowed.includes(status)) {
      throw httpError("Status de reserva inválido.");
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const reservations = await conn.query(
        "SELECT * FROM reservas WHERE id = ? FOR UPDATE",
        [req.params.id],
      );

      const reservation = reservations[0];

      if (!reservation) {
        throw httpError("Reserva não encontrada.", 404);
      }

      const previous = reservation.status;

      if (previous === "cancelled" || previous === "completed") {
        if (previous !== status) {
          throw httpError(
            "Reservas concluídas ou canceladas não podem ser reabertas por esta ação.",
          );
        }
      } else if (status === "cancelled") {
        await conn.query(
          `UPDATE lotes
         SET quantity_available = quantity_available + ?
         WHERE id = ?`,
          [reservation.quantity, reservation.lot_id],
        );
      }

      await conn.query(
        `UPDATE reservas
       SET
         status = ?,
         completed_at = IF(? = 'completed', NOW(), completed_at)
       WHERE id = ?`,
        [status, status, req.params.id],
      );

      await conn.commit();

      res.json({
        success: true,
        message: "Status da reserva atualizado.",
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
// EXCLUIR RESERVA
// =========================================

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const reservations = await conn.query(
        "SELECT * FROM reservas WHERE id = ? FOR UPDATE",
        [req.params.id],
      );

      const reservation = reservations[0];

      if (!reservation) {
        throw httpError("Reserva não encontrada.", 404);
      }

      // Devolve o estoque somente se a reserva
      // ainda não foi cancelada ou concluída.
      if (
        reservation.status !== "cancelled" &&
        reservation.status !== "completed"
      ) {
        await conn.query(
          `UPDATE lotes
         SET quantity_available = quantity_available + ?
         WHERE id = ?`,
          [reservation.quantity, reservation.lot_id],
        );
      }

      await conn.query("DELETE FROM reservas WHERE id = ?", [req.params.id]);

      await conn.commit();

      res.json({
        success: true,
        message: "Reserva excluída.",
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }),
);

export default router;
