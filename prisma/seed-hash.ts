import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

export async function hash(value: string) {
  const salt = randomBytes(16);
  const key = (await scrypt(value, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verify(value: string, stored: string) {
  try {
    const [, saltHex, keyHex] = stored.split("$");
    if (!saltHex || !keyHex) return false;
    const key = (await scrypt(value, Buffer.from(saltHex, "hex"), 64)) as Buffer;
    const expected = Buffer.from(keyHex, "hex");
    return expected.length === key.length && timingSafeEqual(expected, key);
  } catch {
    return false;
  }
}
