import { Router } from "express";
import { pool } from "../config/database.js";
import { asyncHandler, httpError } from "../utils/asyncHandler.js";

const router = Router();

// =========================================
// LISTAR ESTABELECIMENTOS
// =========================================

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await pool.query(`
    SELECT
      id,
      name,
      kind
    FROM estabelecimentos
    ORDER BY name
  `);

    res.json({
      success: true,
      data: rows,
    });
  }),
);

// =========================================
// CADASTRAR ESTABELECIMENTO
// =========================================

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      name,
      kind = "Estabelecimento",
      contact_name = null,
      phone = null,
      address = null,
    } = req.body;

    if (!String(name || "").trim()) {
      throw httpError("Informe o nome do estabelecimento.");
    }

    const result = await pool.query(
      `INSERT INTO estabelecimentos
      (name, kind, contact_name, phone, address)
     VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), kind, contact_name, phone, address],
    );

    res.status(201).json({
      success: true,
      message: "Estabelecimento cadastrado.",
      data: {
        id: Number(result.insertId),
      },
    });
  }),
);

export default router;
