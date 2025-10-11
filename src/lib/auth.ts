import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
);

const AUTH_COOKIE_NAME = 'loft-auth-token';
const TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

export interface JWTPayload {
  authenticated: boolean;
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token for authenticated users
 */
export async function generateAuthToken(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY}s`)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify a JWT token
 */
export async function verifyAuthToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Set auth token in HTTP-only cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY,
    path: '/',
  });
}

/**
 * Get auth token from cookies
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Clear auth cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;

  const payload = await verifyAuthToken(token);
  if (!payload) {
    // Token is invalid, clear it
    await clearAuthCookie();
    return false;
  }

  // Check if token expires soon (within 24 hours), refresh it
  const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
  if (expiresIn < 24 * 60 * 60) {
    const newToken = await generateAuthToken();
    await setAuthCookie(newToken);
  }

  return payload.authenticated;
}

/**
 * Verify passcode against environment variable
 */
export function verifyPasscode(passcode: string): boolean {
  const correctPasscode = process.env.AUTH_PASSCODE;
  if (!correctPasscode) {
    console.error('AUTH_PASSCODE not set in environment variables');
    return false;
  }
  return passcode === correctPasscode;
}

/**
 * Verify token (for middleware usage)
 * This is a simpler version that just checks if token is valid
 */
export async function verifyToken(token: string): Promise<boolean> {
  const payload = await verifyAuthToken(token);
  return payload !== null && payload.authenticated === true;
}
