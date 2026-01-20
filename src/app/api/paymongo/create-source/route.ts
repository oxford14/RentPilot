
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, paymentType, details } = await request.json();
    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      throw new Error('PayMongo secret key is not configured.');
    }
    
    if (!amount || amount <= 0 || !details) {
      throw new Error('Missing required payment details.');
    }

    let metadata = {};
    if (paymentType === 'subscription') {
        const { clientId, clientName, planName } = details;
        if (!clientId || !clientName || !planName) throw new Error('Client and plan details are required for subscription payment.');
        metadata = { clientId, clientName, paymentType: 'subscription', planName, amount: String(amount) };
    } else {
        const { tenantId, tenantName, clientId } = details;
        if (!tenantId || !clientId) throw new Error('Tenant and Client IDs are required for rent payment.');
        metadata = { tenantId, tenantName, clientId, paymentType: 'rent' };
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
            amount: Math.round(amount * 100), // Amount in centavos
            payment_method_allowed: ['qrph'],
            currency: 'PHP',
            description: `Payment for RentPilot`,
            statement_descriptor: 'RentPilot',
            metadata: metadata,
          }
        }
      })
    };

    const response = await fetch('https://api.paymongo.com/v1/payment_intents', options);
    const data = await response.json();

    if (!response.ok || data.errors) {
        const errorDetails = data.errors?.map((e: any) => e.detail).join(', ') || 'Unknown PayMongo API error';
        throw new Error(errorDetails);
    }
    
    const qrCodeUrl = data.data.attributes.next_action?.redirect?.url;
    
    if (!qrCodeUrl) {
      throw new Error('QR Code URL not found in PayMongo response.');
    }

    // The component expects the URL in this nested structure
    return NextResponse.json({ source: { redirect: { checkout_url: qrCodeUrl } } });

  } catch (error: any) {
    console.error('[PayMongo Create Payment Intent Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
