import argon2 from 'argon2';

/**
 * Single source of truth for password hashing parameters. The administrator
 * creation script and the login endpoint must use identical settings so a
 * stored hash always verifies.
 *
 * These values follow the OWASP Argon2id baseline (19 MiB, 2 iterations,
 * 1 lane).
 */
export const PASSWORD_HASH_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

/**
 * A fixed, valid Argon2id hash of an arbitrary throwaway string. It is used
 * only to keep the work factor of an unknown-account login comparable to a
 * wrong-password login. It contains no secret and hashes no real credential.
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$UKIkWuWCE73MsTgW78hbpA$i/SGxBIbta2bL9z0W2km1bg68YZtgJbsd1OqZe2VxTc';

/** Hashes a plaintext password with the shared Argon2id parameters. */
export function hashPassword(password) {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored Argon2id hash. Returns false
 * for malformed hashes instead of throwing, so callers can treat every
 * credential failure the same way.
 */
export async function verifyPassword(passwordHash, password) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Runs one Argon2id verification against the dummy hash. Used when the email
 * does not match an administrator so that response timing does not reveal
 * whether an account exists.
 */
export function verifyAgainstDummyHash(password) {
  return verifyPassword(DUMMY_PASSWORD_HASH, password);
}
