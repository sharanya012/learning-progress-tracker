
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pool from "../src/config/db.js";

dotenv.config();

const rl = readline.createInterface({ input, output });

try {
  const email = (await rl.question("Coordinator email: "))
    .trim()
    .toLowerCase();

  const password = await rl.question(
    "Coordinator password (minimum 8 characters): "
  );

  if (!email || password.length < 8) {
    throw new Error("Enter a valid email and a password of at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO accounts (email, password_hash, role)
     VALUES ($1, $2, 'coordinator')`,
    [email, passwordHash]
  );

  console.log("Coordinator account created successfully.");
} catch (error) {
  console.error("Could not create coordinator:", error.message);
} finally {
  rl.close();
  await pool.end();
}
