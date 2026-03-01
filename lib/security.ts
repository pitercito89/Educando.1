import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(
  plainText: string,
  storedHashOrPlain: string | null | undefined
): Promise<boolean> {
  if (!storedHashOrPlain) return false;
  if (isBcryptHash(storedHashOrPlain)) {
    return bcrypt.compare(plainText, storedHashOrPlain);
  }
  // Compatibilidad temporal con passwords legadas en texto plano.
  return plainText === storedHashOrPlain;
}

export function isBcryptHash(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}
