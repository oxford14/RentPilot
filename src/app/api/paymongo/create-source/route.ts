
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
    } else {
        const { tenantId, tenantName, clientId } = details;
        if (!tenantId || !clientId) throw new Error('Tenant and Client IDs are required for rent payment.');
        metadata = { tenantId, tenantName, clientId, paymentType: 'rent' };
        description = `Rent Payment for ${tenantName}`;
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `Basic ${btoa(secretKey)}` 
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Amount in centavos
            description: description,
            remarks: JSON.stringify(metadata) // Using remarks to pass metadata
          }
        }
      })
    };

    const response = await fetch('https://api.paymongo.com/v1/links', options);
    const data = await response.json();
    
    if (!response.ok || data.errors) {
        const errorDetails = data.errors?.map((e: any) => e.detail).join(', ') || 'Unknown PayMongo API error';
        throw new Error(errorDetails);
    }
    
    const checkoutUrl = data.data.attributes.checkout_url;
    
    if (!checkoutUrl) {
      throw new Error('Checkout URL not found in PayMongo response.');
    }

    // The component now expects the URL directly.
    return NextResponse.json({ checkout_url: checkoutUrl });

  } catch (error: any) {
    console.error('[PayMongo Create Payment Link Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
