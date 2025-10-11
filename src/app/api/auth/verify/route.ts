import { NextResponse } from 'next/server';
import { verifyPasscode, generateAuthToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { passcode } = await request.json();

    if (!passcode) {
      return NextResponse.json(
        { error: 'Passcode is required' },
        { status: 400 }
      );
    }

    // Verify passcode
    const isValid = verifyPasscode(passcode);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid passcode' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await generateAuthToken();

    // Set token in HTTP-only cookie
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
