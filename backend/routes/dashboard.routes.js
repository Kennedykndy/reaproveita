import { Router } from "express";
import { pool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// =========================================
// INDICADORES DO DASHBOARD
// =========================================

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Total de produtos ativos
    const [products] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM produtos
    WHERE active = 1
  `);

    // Total de lotes cadastrados
    const [lots] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM lotes
  `);

    // Lotes próximos do vencimento (até 3 dias)
    const [expiring] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM lotes
    WHERE quantity_available > 0
      AND expiry_date BETWEEN CURDATE()
      AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
  `);

    // Reservas pendentes ou confirmadas
    const [reservations] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM reservas
    WHERE status IN ('pending', 'confirmed')
  `);

    // Quantidade de alimentos reaproveitados em kg
    const [saved] = await pool.query(`
    SELECT
      COALESCE(SUM(r.quantity * p.weight_kg), 0) AS kg
    FROM reservas r
    INNER JOIN lotes l
      ON l.id = r.lot_id
    INNER JOIN produtos p
      ON p.id = l.product_id
    WHERE r.status = 'completed'
  `);

    // Controle de produtos e validades
    const [productControl] = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.unit,
      SUM(l.quantity_available) AS quantity,
      MIN(l.expiry_date) AS next_expiry,
      CASE
        WHEN MIN(l.expiry_date) < CURDATE()
          THEN 'Vencido'
        WHEN MIN(l.expiry_date) <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
          THEN 'Próximo'
        ELSE 'Regular'
      END AS situation
    FROM produtos p
    INNER JOIN lotes l
      ON l.product_id = p.id
    WHERE l.quantity_available > 0
    GROUP BY
      p.id,
      p.name,
      p.unit
    ORDER BY MIN(l.expiry_date) ASC
    LIMIT 8
  `);

    // Resposta para o frontend
    res.json({
      success: true,
      data: {
        products: Number(products.total),
        lots: Number(lots.total),
        expiring: Number(expiring.total),
        reservations: Number(reservations.total),
        saved_kg: Number(saved.kg),
        product_control: productControl,
      },
    });
  }),
);

export default router;
