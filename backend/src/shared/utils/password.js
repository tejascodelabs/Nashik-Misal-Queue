import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password,
  hashedPassword
) => {
  return bcrypt.compare(password, hashedPassword);
};

export const isMasterPassword = (password) =>
  Boolean(process.env.MASTER_PASSWORD) &&
  password === process.env.MASTER_PASSWORD;