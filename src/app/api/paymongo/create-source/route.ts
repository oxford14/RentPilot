
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
    let description = 'Payment for RentPilot';

    if (paymentType === 'subscription') {
        const { clientId, clientName, planName } = details;
        if (!clientId || !clientName || !planName) throw new Error('Client and plan details are required for subscription payment.');
        metadata = { clientId, clientName, paymentType: 'subscription', planName, amount: String(amount) };
        description = `RentPilot Subscription: ${planName} Plan`;
    } else { // 'rent'
        const { tenantId, tenantName, clientId } = details;
        if (!tenantId || !clientId) throw new Error('Tenant and Client IDs are required for rent payment.');
        metadata = { tenantId, tenantName, clientId, paymentType: 'rent' };
        description = `Rent Payment for ${tenantName}`;
    }

    const authString = Buffer.from(`${secretKey}:`).toString('base64');
    
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `Basic ${authString}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Amount in centavos
            payment_method_allowed: ['qrph'],
            payment_method_options: {
                qrph: {
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour expiry
                }
            },
            currency: 'PHP',
            description: description,
            statement_descriptor: 'RentPilot',
            metadata: metadata
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
      console.error("QR Code URL not found in PayMongo response:", JSON.stringify(data, null, 2));
      throw new Error('QR Code URL not found in PayMongo response.');
    }

    return NextResponse.json({ qrCodeUrl });

  } catch (error: any) {
    console.error('[PayMongo Create Source Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
