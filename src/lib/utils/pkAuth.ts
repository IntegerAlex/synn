import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_COOKIE = 'admin_pk_token';
const PK_SECRET = process.env.PK_AUTH_SECRET || 'fallback-dev-secret-change-me';

type Challenge = { challenge: string; expiresAt: number };
const challengeStore = new Map<string, Challenge>();

// Embedded public key is used for verification (already in code)
const EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAnv8YfXH5qOKrj1YyhYqm
nsj7ZKVAXksQxKigYMaNnam77rP8PoXfIFsvirissRjKgh3aiKWqnwL1wLkPTz7C
M9w6fMVV8QvWtC14GpN1BLklJRWPrcTDDVY5QXiBZ1t0ixynIWQkZ0/30ocLqwox
2fRVntb43SDAahUpFPVXV2dycg55z5Wli5wguoFZcKEe9yH0ftDg3C6pR9t8RFTX
2blm2rFthtrORa4bBsIKj9ng8Ef7kpgwFIFTWKB+1LjFzSlCZmUvNDlL2AkOcX4z
+vMbdk5fQl0DDP+yQs26IZbSuuFqUYivqnAa+mD225dq5l+up3fWZtpYeeZbIw0J
rOKpw0E/DTPBa9XjO9oMN5CleY+xplegBKvb5GgeoIxuCuA0iGBJuwQrOxPjbJDr
buLQuvwNvU2H7ijYipgaqjAeQlPlcT/S1u7jEAVvV9r10g5pP3C7aDiZo4frC5/R
Jq8scXQuXmmtOXDd5nfJN5ha0iB3JQu7sQJ7NMA7BkgzgwuA1vBNsDFhlL+ChAxQ
n5ICzoLe864ZGXNORKxymeZRyM5DjOWo5DOJEgI9ESwdhlKa8HveuXedCUB6d3rJ
NfRpihQZjTl3O+SqONKFEP49kavxrM2u/uZc+o6sm5v8Yv+dMblk7vvTTG7CgnfU
UwUuBVTrqO/g0kMqgRO5kBECAwEAAQ==
-----END PUBLIC KEY-----`;

function signToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', PK_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): { valid: boolean; payload?: any } {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expected = crypto.createHmac('sha256', PK_SECRET).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return { valid: false };
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) return { valid: false };
  return { valid: true, payload };
}

export function createChallenge() {
  const id = crypto.randomUUID();
  const challenge = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  challengeStore.set(id, { challenge, expiresAt });
  return { id, challenge, expiresAt };
}

function normalizeB64(input: string): string {
  // Accept both base64 and base64url by normalizing padding and chars
  let out = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = out.length % 4;
  if (pad === 2) out += '==';
  if (pad === 3) out += '=';
  if (pad === 1) out += '===';
  return out;
}

export function verifyPkSignature(challengeId: string, signatureB64: string): { ok: boolean; reason?: string } {
  const entry = challengeStore.get(challengeId);
  if (!entry) return { ok: false, reason: 'challenge_missing' };
  if (entry.expiresAt < Date.now()) {
    challengeStore.delete(challengeId);
    return { ok: false, reason: 'challenge_expired' };
  }
  const verifier = crypto.createVerify('sha256');
  verifier.update(entry.challenge);
  verifier.end();
  try {
    const sig = Buffer.from(normalizeB64(signatureB64), 'base64');
    const ok = verifier.verify(EMBEDDED_PUBLIC_KEY, sig);
    if (ok) {
      challengeStore.delete(challengeId);
      return { ok: true };
    }
    return { ok: false, reason: 'invalid_signature' };
  } catch (error) {
    console.error('PK_VERIFY_DECODE_ERROR', error);
    return { ok: false, reason: 'decode_error' };
  }
}

export function issuePkToken(clerkUserId?: string | null) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const token = signToken({ sub: 'admin-pk', exp, clerkUserId: clerkUserId ?? null });
  const response = NextResponse.json({ success: true, exp });
  response.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_MS / 1000,
  });
  return response;
}

export async function verifyPkToken(): Promise<{ valid: boolean; clerkUserId?: string | null } | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const bearer = headerStore.get('authorization')?.replace(/Bearer\s+/i, '');
  const token = bearer || cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  const result = verifyToken(token);
  if (!result.valid) return null;
  return { valid: true, clerkUserId: result.payload?.clerkUserId ?? null };
}

export function clearPkToken(res: NextResponse) {
  res.cookies.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

