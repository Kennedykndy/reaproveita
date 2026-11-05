import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { pool, testConnection } from "./config/database.js";

import productsRoutes from "./routes/products.routes.js";
import lotsRoutes from "./routes/lots.routes.js";
import reservationsRoutes from "./routes/reservations.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import establishmentsRoutes from "./routes/establishments.routes.js";

import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);

// Middlewares
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Verificação da API e do banco
app.get("/api/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      message: "API Reaproveita e MariaDB funcionando.",
    });
  } catch (error) {
    next(error);
  }
});

// Rotas da API
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/lots", lotsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/establishments", establishmentsRoutes);

// Arquivos do frontend
app.use(express.static(path.resolve(__dirname, "../frontend")));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.resolve(__dirname, "../frontend/index.html"));
});

// Tratamento de erros
app.use(notFound);
app.use(errorHandler);

// Inicialização
try {
  await testConnection();

  app.listen(PORT, () => {
    console.log("-----------------------------------");
    console.log(" REAPROVEITA - SERVIDOR INICIADO");
    console.log("-----------------------------------");
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/health`);
    console.log("MariaDB: conectado");
  });
} catch (error) {
  console.error("-----------------------------------");
  console.error(" ERRO AO INICIAR O REAPROVEITA");
  console.error("-----------------------------------");
  console.error("Não foi possível conectar ao MariaDB.");
  console.error(error.message);

  process.exit(1);
}
