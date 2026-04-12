export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getProduct } from '../../lib/products';

export const POST: APIRoute = async ({ request }) => {
  const stripeKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const { items, email } = await request.json();

  if (!items || !Array.isArray(items) || items.length === 0 || !email) {
    return new Response(JSON.stringify({ error: 'Missing items or email' }), { status: 400 });
  }

  // Validate items and build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItems: any[] = [];
  let totalCents = 0;
  let hasPrintful = false;
  let hasSelf = false;

  for (const item of items) {
    const product = getProduct(item.slug);
    if (!product) {
      return new Response(JSON.stringify({ error: `Unknown product: ${item.slug}` }), { status: 400 });
    }

    const qty = item.qty || 1;
    totalCents += product.priceCents * qty;

    if (product.fulfillment === 'printful') hasPrintful = true;
    else hasSelf = true;

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: product.name,
          images: [`https://thoseoneguys.band${product.image}`],
        },
        unit_amount: product.priceCents,
      },
      quantity: qty,
    });

    // Resolve Printful variant ID
    let variantId = product.printfulVariantId || null;
    if (product.printfulVariants && item.size) {
      variantId = product.printfulVariants[item.size] || null;
    }

    orderItems.push({
      slug: item.slug,
      name: product.name,
      price_cents: product.priceCents,
      qty,
      size: item.size || null,
      fulfillment: product.fulfillment,
      mockup_url: item.mockupUrl || null,
      is_custom_hero: product.isCustomHero || false,
      printful_variant_id: variantId,
      image: product.image,
    });
  }

  const fulfillmentType = hasPrintful && hasSelf ? 'mixed' : hasPrintful ? 'printful' : 'self';

  // Pre-insert order into Supabase
  const sbUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const sbKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  let orderId: string | null = null;

  if (sbUrl && sbKey) {
    const sbHeaders = { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

    const orderRes = await fetch(`${sbUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({
        fan_email: email,
        items: orderItems,
        total_cents: totalCents,
        fulfillment_type: fulfillmentType,
        status: 'pending',
      }),
    });

    const orderData = await orderRes.json();
    if (Array.isArray(orderData) && orderData[0]) {
      orderId = orderData[0].id;
    }
  }

  // Need shipping for physical goods
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: email,
    shipping_address_collection: { allowed_countries: ['US'] },
    success_url: 'https://thoseoneguys.band/merch?order=success',
    cancel_url: 'https://thoseoneguys.band/merch?order=cancelled',
    metadata: {
      order_id: orderId || '',
      fan_email: email,
    },
  });

  // Update order with stripe session ID
  if (orderId && sbUrl && sbKey) {
    await fetch(`${sbUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripe_session_id: session.id }),
    });
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
