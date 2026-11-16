import bcrypt from "bcryptjs";

const HASH_ROUNDS = 12;

export function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, HASH_ROUNDS);
}

export function verifyPassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
