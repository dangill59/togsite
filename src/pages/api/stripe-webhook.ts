export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const POST: APIRoute = async ({ request }) => {
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  const printfulKey = import.meta.env.PRINTFUL_API_KEY || process.env.PRINTFUL_API_KEY;
  const sbUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const sbKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!stripeKey || !webhookSecret) {
    return new Response('Stripe not configured', { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const fanEmail = session.metadata?.fan_email || session.customer_email;

    if (!orderId || !sbUrl || !sbKey) {
      console.error('Missing order_id or Supabase config');
      return new Response('OK', { status: 200 });
    }

    const sbHeaders = { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' };

    // Fetch the order
    const orderRes = await fetch(`${sbUrl}/rest/v1/orders?id=eq.${orderId}&select=*&limit=1`, { headers: sbHeaders });
    const orders = await orderRes.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      console.error('Order not found:', orderId);
      return new Response('OK', { status: 200 });
    }

    const order = orders[0];

    // Skip if already processed
    if (order.status !== 'pending') {
      return new Response('OK', { status: 200 });
    }

    const shippingAddress = session.shipping_details?.address;
    const shippingName = session.shipping_details?.name;

    // Update order status
    await fetch(`${sbUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: sbHeaders,
      body: JSON.stringify({
        status: 'paid',
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        shipping_address: session.shipping_details,
        updated_at: new Date().toISOString(),
      }),
    });

    const items = order.items as any[];
    const printfulItems = items.filter((i: any) => i.fulfillment === 'printful');
    const selfItems = items.filter((i: any) => i.fulfillment === 'self');

    // === Submit to Printful ===
    if (printfulItems.length > 0 && printfulKey && shippingAddress) {
      try {
        const printfulOrder = {
          recipient: {
            name: shippingName || '',
            address1: shippingAddress.line1 || '',
            address2: shippingAddress.line2 || '',
            city: shippingAddress.city || '',
            state_code: shippingAddress.state || '',
            country_code: shippingAddress.country || 'US',
            zip: shippingAddress.postal_code || '',
            email: fanEmail || '',
          },
          items: printfulItems.map((item: any) => ({
            variant_id: item.printful_variant_id || 4012, // Default variant, will be configured properly
            quantity: item.qty || 1,
            files: [
              {
                type: 'default',
                url: item.mockup_url || `https://thoseoneguys.band${item.image || '/merch-black-t-shirt.png'}`,
              },
            ],
          })),
        };

        const pfRes = await fetch('https://api.printful.com/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${printfulKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(printfulOrder),
        });

        const pfData = await pfRes.json();

        if (pfData.result?.id) {
          await fetch(`${sbUrl}/rest/v1/orders?id=eq.${orderId}`, {
            method: 'PATCH',
            headers: sbHeaders,
            body: JSON.stringify({
              printful_order_id: String(pfData.result.id),
              status: 'printful_submitted',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          console.error('Printful order failed:', JSON.stringify(pfData));
        }
      } catch (err: any) {
        console.error('Printful submission error:', err.message);
      }
    }

    // === Notify band for self-fulfilled items ===
    if (selfItems.length > 0) {
      try {
        const itemList = selfItems.map((i: any) => `- ${i.name} x${i.qty}`).join('\n');
        const address = shippingAddress
          ? `${shippingName}\n${shippingAddress.line1}\n${shippingAddress.line2 || ''}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`
          : 'No address provided';

        // Send via Formspree (same as fan club notifications)
        await fetch('https://formspree.io/f/xpqolkgy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'merch-order-self-fulfilled',
            orderId,
            email: fanEmail,
            items: itemList,
            shippingAddress: address,
            message: `Self-ship order!\n\n${itemList}\n\nShip to:\n${address}`,
          }),
        });
      } catch (err: any) {
        console.error('Notification error:', err.message);
      }
    }

    // === Clean up custom hero mockups after purchase ===
    const customItems = items.filter((i: any) => i.is_custom_hero);
    for (const item of customItems) {
      const product = item.slug.replace('custom-hero-', ''); // tee, mug, cap, pin
      try {
        // Delete from mockups table (frees up slots for new designs)
        await fetch(`${sbUrl}/rest/v1/mockups?fan_email=eq.${encodeURIComponent(fanEmail || '')}&product=eq.${encodeURIComponent(product)}`, {
          method: 'DELETE',
          headers: sbHeaders,
        });
      } catch (err: any) {
        console.error('Mockup cleanup error:', err.message);
      }
    }
  }

  return new Response('OK', { status: 200 });
};
