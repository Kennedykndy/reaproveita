import { Router } from "express";
import { pool } from "../config/database.js";
import { asyncHandler, httpError } from "../utils/asyncHandler.js";

const router = Router();

// =========================================
// LISTAR PRODUTOS
// =========================================

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = `%${String(req.query.search || "").trim()}%`;

    const rows = await pool.query(
      `
    SELECT
      p.id,
      p.name,
      p.category,
      p.description,
      p.unit,
      p.weight_kg,
      p.active,
      p.establishment_id,
      e.name AS establishment_name,
      COUNT(DISTINCT l.id) AS lots_count,
      COALESCE(SUM(l.quantity_available), 0) AS quantity_available
    FROM produtos p
    LEFT JOIN estabelecimentos e
      ON e.id = p.establishment_id
    LEFT JOIN lotes l
      ON l.product_id = p.id
    WHERE p.name LIKE ?
       OR p.category LIKE ?
    GROUP BY p.id
    ORDER BY p.name
  `,
      [search, search],
    );

    res.json({
      success: true,
      data: rows,
    });
  }),
);

// =========================================
// CADASTRAR PRODUTO
// =========================================

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      name,
      category = "Outros",
      description = null,
      unit = "unidade",
      weight_kg = 0,
      establishment_id = null,
    } = req.body;

    if (!String(name || "").trim()) {
      throw httpError("Informe o nome do produto.");
    }

    const result = await pool.query(
      `INSERT INTO produtos
      (name, category, description, unit, weight_kg, establishment_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        category,
        description,
        unit,
        Number(weight_kg),
        establishment_id || null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Produto cadastrado.",
      data: {
        id: Number(result.insertId),
      },
    });
  }),
);

// =========================================
// ATUALIZAR PRODUTO
// =========================================

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const {
      name,
      category = "Outros",
      description = null,
      unit = "unidade",
      weight_kg = 0,
      establishment_id = null,
      active = 1,
    } = req.body;

    if (!String(name || "").trim()) {
      throw httpError("Informe o nome do produto.");
    }

    const result = await pool.query(
      `UPDATE produtos
     SET
       name = ?,
       category = ?,
       description = ?,
       unit = ?,
       weight_kg = ?,
       establishment_id = ?,
       active = ?
     WHERE id = ?`,
      [
        name.trim(),
        category,
        description,
        unit,
        Number(weight_kg),
        establishment_id || null,
        active ? 1 : 0,
        req.params.id,
      ],
    );

    if (!result.affectedRows) {
      throw httpError("Produto não encontrado.", 404);
    }

    res.json({
      success: true,
      message: "Produto atualizado.",
    });
  }),
);

// =========================================
// EXCLUIR PRODUTO
// =========================================

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM produtos WHERE id = ?", [
        req.params.id,
      ]);

      if (!result.affectedRows) {
        throw httpError("Produto não encontrado.", 404);
      }

      res.json({
        success: true,
        message: "Produto excluído.",
      });
    } catch (error) {
      if (
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        error.code === "ER_ROW_IS_REFERENCED"
      ) {
        throw httpError(
          "Não é possível excluir um produto que possui lotes.",
          409,
        );
      }

      throw error;
    }
  }),
);

export default router;
