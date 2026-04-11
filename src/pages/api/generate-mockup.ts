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

  // Each variation gets a distinctly different design style
  const variationStyles = [
    {
      label: 'bold comic',
      tee: `black t-shirt laid flat. Large centered character as main graphic with bold comic book explosion bursts around them. "THOSE ONE GUYS" in big blocky letters above, "TOG SQUAD" in a banner below, "${heroName}" underneath. Bright orange, gold, and red color scheme. Bold outlines, pop art style.`,
      mug: `white coffee mug. Character in an action pose as the main wrap-around design. "THOSE ONE GUYS" in bold comic letters on one side, "TOG SQUAD" on the other, "${heroName}" below the character. Bright orange and gold comic explosions. Bold pop art style.`,
      pin: `enamel pin in a starburst explosion shape. Character in center striking a pose. "TOG SQUAD" across the top, "${heroName}" on a ribbon banner below. Gold metal edges, bright orange and red enamel fills. Bold comic book style.`,
      cap: `brown trucker cap. Large circular patch on front with character in center, "TOG SQUAD" arched above, "${heroName}" arched below. Orange and gold starburst background on patch. Bold embroidered comic style.`,
    },
    {
      label: 'retro vintage',
      tee: `dark grey t-shirt laid flat. Vintage retro poster style design with character in a circular frame, distressed/weathered texture. "THOSE ONE GUYS" in retro 70s curved lettering above, "TOG SQUAD" in a ribbon below, "${heroName}" in small vintage type. Muted orange, brown, cream color palette. Vintage rock poster aesthetic.`,
      mug: `cream/off-white coffee mug. Retro 70s style design with character in a circular medallion. "THOSE ONE GUYS" in groovy retro font, "TOG SQUAD" in a banner, "${heroName}" below. Brown, orange, and cream tones. Vintage band merchandise feel.`,
      pin: `enamel pin in a circular badge shape. Character portrait in center with retro sunburst background. "TOG SQUAD" arched above, "${heroName}" below on a scroll. Antique brass metal edges, muted orange and brown enamel. Vintage collectible style.`,
      cap: `tan/khaki trucker cap. Worn vintage-style oval patch with character portrait, "TOG SQUAD" above and "${heroName}" below in weathered retro lettering. Faded orange and brown colors. Vintage baseball cap aesthetic.`,
    },
    {
      label: 'neon action',
      tee: `black t-shirt laid flat. Dynamic action scene with character leaping/flying surrounded by electric energy effects. "THOSE ONE GUYS" in glowing neon-style letters above, "TOG SQUAD" below with lightning bolts, "${heroName}" in electric blue. Neon orange, electric blue, and hot pink accents on black. High energy street art style.`,
      mug: `black coffee mug. Character in dynamic flying pose with neon energy trails wrapping around the mug. "THOSE ONE GUYS" in glowing letters, "TOG SQUAD" with electric effects, "${heroName}" in neon. Bright neon orange, blue, and pink on black. Electric street art style.`,
      pin: `enamel pin in a lightning bolt shape. Character in action pose at center with electric energy around them. "TOG SQUAD" in angular modern text, "${heroName}" below. Black nickel metal edges, neon orange and electric blue enamel. Modern street art style.`,
      cap: `black trucker cap. Embroidered design with character in action pose, "TOG SQUAD" in angular modern font above, "${heroName}" below. Neon orange and electric blue thread on black. Modern street style cap.`,
    },
  ];

  const styleIndex = Math.min(nextVariation - 1, variationStyles.length - 1);
  const style = variationStyles[styleIndex];
  const basePrompt = (style as any)[product] as string | undefined;

  if (!basePrompt) {
    return new Response(JSON.stringify({ error: 'Invalid product type' }), { status: 400 });
  }

  const prompt = `Product photography on a white background. ${basePrompt} Clean product shot, high detail.`;

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
