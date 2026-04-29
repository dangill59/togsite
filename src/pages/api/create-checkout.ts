export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getProduct } from '../../lib/products';
import { getSql } from '../../lib/db';

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

  // Pre-insert order into Neon
  let orderId: string | null = null;

  try {
    const sql = getSql();
    const inserted = await sql`
      INSERT INTO orders (fan_email, items, total_cents, fulfillment_type, status)
      VALUES (${email}, ${JSON.stringify(orderItems)}::jsonb, ${totalCents}, ${fulfillmentType}, 'pending')
      RETURNING id
    `;
    if (inserted[0]) orderId = inserted[0].id as string;
  } catch (err: any) {
    console.error('Order insert error:', err.message);
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
  if (orderId) {
    try {
      const sql = getSql();
      await sql`
        UPDATE orders
        SET stripe_session_id = ${session.id}, updated_at = NOW()
        WHERE id = ${orderId}::uuid
      `;
    } catch (err: any) {
      console.error('Order session update error:', err.message);
    }
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
