export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const { heroImage, product, heroName } = await request.json();

  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  if (!heroImage || !product) {
    return new Response(JSON.stringify({ error: 'Missing hero image or product type' }), { status: 400 });
  }

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
    // Extract raw base64 from data URL
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

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });

    const data = await res.json();
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), { status: 500 });
    }

    const base64 = data.data[0].b64_json;
    return new Response(JSON.stringify({ image: `data:image/png;base64,${base64}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
