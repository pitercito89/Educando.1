import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, isBcryptHash, verifyPassword } from "@/lib/security";

test("hashPassword genera hash bcrypt", async () => {
  const hash = await hashPassword("MiClave123*");
  assert.equal(isBcryptHash(hash), true);
});

test("verifyPassword valida hash y compatibilidad legado", async () => {
  const plain = "Admin123*";
  const hash = await hashPassword(plain);

  const okHash = await verifyPassword(plain, hash);
  assert.equal(okHash, true);

  const okLegacy = await verifyPassword(plain, plain);
  assert.equal(okLegacy, true);

  const bad = await verifyPassword("otra", hash);
  assert.equal(bad, false);
});
