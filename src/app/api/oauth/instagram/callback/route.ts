import { NextResponse } from 'next/server';

// Scaffold callback. השלמה אחרי Meta App Review.
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(
    new URL('/he/settings?oauth=instagram_scaffold', url.origin)
  );
}
