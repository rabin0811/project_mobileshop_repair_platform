import { createHash, randomInt } from 'node:crypto';

/** Base32-ish alphabet without ambiguous characters (0/O, 1/I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `MF-YYYYMMDD-XXXXX` — high-entropy, public-safe (docs/memory.md D-006). */
export function generateRef(prefix: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const suffix = Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${prefix}-${ymd}-${suffix}`;
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
