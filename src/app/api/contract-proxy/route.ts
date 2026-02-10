import { NextResponse } from 'next/server';

// This API route is deprecated. The contract link is now opened directly.
export async function GET() {
  return new NextResponse('This API route is deprecated and no longer in use.', { status: 410 });
}
