
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, tenantId, tenantName, clientId } = await request.json();
    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      throw new Error('PayMongo secret key is not configured.');
    }
    
    if (!amount || amount <= 0 || !tenantId || !clientId) {
      throw new Error('Missing required payment details: amount, tenantId, clientId.');
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `Basic ${btoa(secretKey + ':')}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Ensure it's an integer in centavos
            type: 'qr_ph',
            currency: 'PHP',
            metadata: { tenantId, clientId, tenantName }
          }
        }
      })
    };

    const response = await fetch('https://api.paymongo.com/v1/sources', options);
    const data = await response.json();

    if (!response.ok) {
        const errorDetails = data.errors?.map((e: any) => e.detail).join(', ') || 'Unknown PayMongo API error';
        throw new Error(errorDetails);
    }

    return NextResponse.json({ source: data.data });
  } catch (error: any) {
    console.error('[PayMongo Create Source Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
