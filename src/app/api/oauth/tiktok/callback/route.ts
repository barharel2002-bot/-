import { NextResponse } from 'next/server';

// Scaffold callback. השלמה אחרי TikTok App Review.
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(
    new URL('/he/settings?oauth=tiktok_scaffold', url.origin)
  );
}
