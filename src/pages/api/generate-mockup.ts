export const prerender = false;

import type { APIRoute } from 'astro';

function getSupabase() {
  const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return { url, key };
}

export const POST: APIRoute = async ({ request }) => {
  const { heroImage, product, heroName, email } = await request.json();

  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  if (!heroImage || !product || !email) {
    return new Response(JSON.stringify({ error: 'Missing hero image, product, or email' }), { status: 400 });
  }

  const { url: sbUrl, key: sbKey } = getSupabase();
  if (!sbUrl || !sbKey) {
    return new Response(JSON.stringify({ error: 'Storage not configured' }), { status: 500 });
  }

  const sbHeaders = { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` };

  // Check how many variations this fan already has for this product
  const countRes = await fetch(
    `${sbUrl}/rest/v1/mockups?fan_email=eq.${encodeURIComponent(email)}&product=eq.${encodeURIComponent(product)}&select=id,variation&order=variation.asc`,
    { headers: { ...sbHeaders, 'Content-Type': 'application/json' } }
  );
  const existing = await countRes.json();
  if (Array.isArray(existing) && existing.length >= 3) {
    return new Response(JSON.stringify({ error: 'Maximum 3 variations per product' }), { status: 429 });
  }

  const nextVariation = Array.isArray(existing) ? existing.length + 1 : 1;

  const productPrompts: Record<string, string> = {
    tee: `Product photography of a black t-shirt laid flat on a white background. The t-shirt has a custom design printed on the front featuring this superhero character as the main graphic, with the text "THOSE ONE GUYS" arched above the character and "TOG SQUAD" below it, and "${heroName}" in smaller text underneath. Comic book style design with orange and gold accents. Clean product shot, high detail.`,
    mug: `Product photography of a white coffee mug on a white background. The mug has a custom design featuring this superhero character wrapped around it as the main graphic, with "THOSE ONE GUYS" text above and "TOG SQUAD" below, and the name "${heroName}" on it. Comic book style with orange and gold accents. Clean product shot, high detail.`,
    pin: `Product photography of a collectible enamel pin on a white background. The pin features this superhero character in a starburst shape with "TOG SQUAD" text and "${heroName}" on a banner below. Gold metal edges, orange and brown colors. Clean product shot, high detail.`,
    cap: `Product photography of a brown trucker cap on a white background. The cap has a custom patch on the front featuring this superhero character with "TOG SQUAD" text above and "${heroName}" below. Comic book style embroidered look. Clean product shot, high detail.`,
  };

  const prompt = productPrompts[product];
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Invalid product type' }), { status: 400 });
  }

  try {
    // Generate image with OpenAI
    const heroB64 = heroImage.replace(/^data:image\/\w+;base64,/, '');
    const heroBuffer = Buffer.from(heroB64, 'base64');
    const heroBlob = new Blob([heroBuffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('model', 'gpt-image-1.5');
    formData.append('image[]', heroBlob, 'hero.png');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('quality', 'medium');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    if (data.error) {
      console.error('OpenAI mockup error:', JSON.stringify(data.error));
      return new Response(JSON.stringify({ error: data.error.message }), { status: 500 });
    }

    if (!data.data || !data.data[0]) {
      console.error('OpenAI unexpected response:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Unexpected API response' }), { status: 500 });
    }

    const imgBase64 = data.data[0].b64_json;
    const imgBuffer = Buffer.from(imgBase64, 'base64');

    // Upload to Supabase Storage
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedEmail}/${product}_v${nextVariation}.png`;

    const uploadRes = await fetch(
      `${sbUrl}/storage/v1/object/mockups/${fileName}`,
      {
        method: 'POST',
        headers: {
          ...sbHeaders,
          'Content-Type': 'image/png',
          'x-upsert': 'true',
        },
        body: imgBuffer,
      }
    );

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      console.error('Storage upload error:', uploadErr);
      // Still return the image even if storage fails
      return new Response(JSON.stringify({
        image: `data:image/png;base64,${imgBase64}`,
        variation: nextVariation,
        stored: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Get public URL
    const imageUrl = `${sbUrl}/storage/v1/object/public/mockups/${fileName}`;

    // Save to mockups table
    await fetch(`${sbUrl}/rest/v1/mockups`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fan_email: email,
        product,
        variation: nextVariation,
        image_url: imageUrl,
      }),
    });

    return new Response(JSON.stringify({
      image: imageUrl,
      variation: nextVariation,
      stored: true,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Mockup generation error:', err.message);
    return new Response(JSON.stringify({ error: err.name === 'AbortError' ? 'Request timed out' : err.message }), { status: 500 });
  }
};

// GET: Load saved mockups for a fan
export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('email');
  if (!email) {
    return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400 });
  }

  const { url: sbUrl, key: sbKey } = getSupabase();
  if (!sbUrl || !sbKey) {
    return new Response(JSON.stringify({}), { status: 200 });
  }

  const sbHeaders = { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' };

  const res = await fetch(
    `${sbUrl}/rest/v1/mockups?fan_email=eq.${encodeURIComponent(email)}&select=product,variation,image_url&order=product.asc,variation.asc`,
    { headers: sbHeaders }
  );

  const rows = await res.json();
  if (!Array.isArray(rows)) {
    return new Response(JSON.stringify({}), { status: 200 });
  }

  // Group by product: { tee: [url1, url2], mug: [url1] }
  const mockups: Record<string, string[]> = {};
  for (const row of rows) {
    if (!mockups[row.product]) mockups[row.product] = [];
    mockups[row.product].push(row.image_url);
  }

  return new Response(JSON.stringify(mockups), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
