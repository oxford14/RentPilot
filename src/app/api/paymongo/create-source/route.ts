import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { savePendingCheckout } from '@/lib/paymongo-pending';

function getAppOrigin(request: Request): string {
  const origin = request.headers.get('origin');
  if (origin) return origin;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  return 'http://localhost:3000';
}

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

    let metadata: Record<string, string> = {};
    let description = 'Payment for RentPilot';

    if (paymentType === 'subscription') {
        const { clientId, clientName, planName, billingEndDate } = details;
        if (!clientId || !clientName || !planName) throw new Error('Client and plan details are required for subscription payment.');
        const paymentRef = randomUUID();
        metadata = {
          clientId,
          clientName,
          paymentType: 'subscription',
          planName,
          amount: String(amount),
          paymentRef,
          ...(billingEndDate ? { billingEndDate: String(billingEndDate) } : {}),
        };
        description = `RentPilot Subscription: ${planName}`;

        const origin = getAppOrigin(request);
        const authString = Buffer.from(`${secretKey}:`).toString('base64');
        const checkoutResponse = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            authorization: `Basic ${authString}`,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                line_items: [
                  {
                    name: description,
                    amount: Math.round(amount * 100),
                    currency: 'PHP',
                    quantity: 1,
                  },
                ],
                payment_method_types: ['card', 'gcash', 'grab_pay', 'qrph', 'paymaya'],
                success_url: `${origin}/subscription?payment=success&ref=${paymentRef}`,
                cancel_url: `${origin}/subscription?payment=cancelled&ref=${paymentRef}`,
                metadata,
              },
            },
          }),
        });

        const checkoutData = await checkoutResponse.json();
        if (!checkoutResponse.ok || checkoutData.errors) {
          const errorDetails =
            checkoutData.errors?.map((e: { detail?: string }) => e.detail).join(', ') ||
            'Could not start PayMongo checkout.';
          throw new Error(errorDetails);
        }

        const sessionId = checkoutData.data?.id;
        const checkoutUrl = checkoutData.data?.attributes?.checkout_url;
        if (!checkoutUrl || !sessionId) {
          throw new Error('Checkout URL not found in PayMongo response.');
        }

        await savePendingCheckout(paymentRef, {
          sessionId,
          clientId,
          billingEndDate: billingEndDate ? String(billingEndDate) : undefined,
        });

        return NextResponse.json({ checkoutUrl, sessionId, paymentRef });
    } else { // 'rent'
        const { tenantId, tenantName, clientId } = details;
        if (!tenantId || !clientId) throw new Error('Tenant and Client IDs are required for rent payment.');
        metadata = {
          tenantId,
          tenantName: tenantName ?? '',
          clientId,
          paymentType: 'rent',
        };
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
            amount: Math.round(amount * 100),
            description: description,
            remarks: JSON.stringify(metadata), // Use remarks to pass metadata for links
            payment_method_types: ['card', 'gcash', 'grab_pay', 'qrph', 'paymaya']
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
    
    const linkId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    if (!checkoutUrl || !linkId) {
      console.error("Checkout URL not found in PayMongo response:", JSON.stringify(data, null, 2));
      throw new Error('Checkout URL not found in PayMongo response.');
    }

    // Store linkId in remarks so webhooks can resolve metadata reliably
    const metadataWithLink = { ...metadata, linkId };
    const patchAuth = Buffer.from(`${secretKey}:`).toString('base64');
    await fetch(`https://api.paymongo.com/v1/links/${linkId}`, {
      method: 'PATCH',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: `Basic ${patchAuth}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            remarks: JSON.stringify(metadataWithLink),
          },
        },
      }),
    });

    return NextResponse.json({ checkoutUrl, linkId });

  } catch (error: any) {
    console.error('[PayMongo Create Link Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
