import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash
} from "node:crypto";

export const defaultDemoPassword = "plainbase123";
const scryptPrefix = "scrypt";
const saltBytes = 16;
const keyLength = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(saltBytes).toString("hex");
  const derivedKey = scryptSync(password, salt, keyLength).toString("hex");
  return `${scryptPrefix}$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith(`${scryptPrefix}$`)) {
    const [, salt, expectedHash] = passwordHash.split("$");

    if (!salt || !expectedHash) {
      return false;
    }

    const actualHash = scryptSync(password, salt, keyLength).toString("hex");
    return safeCompare(actualHash, expectedHash);
  }

  return safeCompare(
    createHash("sha256").update(password).digest("hex"),
    passwordHash
  );
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
