import mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

export const pool = mariadb.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "reaproveita",

  connectionLimit: 10,
  acquireTimeout: 10000,

  decimalAsNumber: true,
  bigIntAsNumber: true,
  dateStrings: true,
});

export async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.query("SELECT 1");

    console.log("MariaDB conectado com sucesso!");
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
