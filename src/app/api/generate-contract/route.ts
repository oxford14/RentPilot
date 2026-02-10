
import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function POST(request: NextRequest) {
  // This is the actual cloud function URL
  const functionUrl = "https://asia-east1-tenanttracker-u4wuw.cloudfunctions.net/generateContract";

  try {
    const body = await request.json();

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Forward the error from the cloud function
      return new NextResponse(errorText, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('API Route /api/generate-contract Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
