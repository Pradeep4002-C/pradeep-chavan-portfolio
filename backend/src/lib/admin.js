/**
 * The only administrator shape that may leave the server. Security fields
 * (passwordHash, failedAttempts, lockedUntil, timestamps) are never included.
 */
export function toSafeAdmin(admin) {
  return {
    id: String(admin._id ?? admin.id),
    email: admin.email,
    name: admin.name,
  };
}
