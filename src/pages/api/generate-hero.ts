export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const { name, superpower, favoriteMember } = await request.json();

  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  const memberStyle: Record<string, string> = {
    'Darby (Bass & Vocals)': 'Irish themed with shamrocks and green accents, holding a bass guitar',
    'Dano (Guitar & Vocals)': 'dad rock themed with hamburgers and coffee floating around, holding an electric guitar',
    'P (Drums & Vocals)': 'intellectual themed with mathematical equations floating around, holding drumsticks',
    "Can't Pick - Love 'Em All": 'rock and roll themed with musical notes and lightning bolts',
  };

  const allyVibe = memberStyle[favoriteMember] || memberStyle["Can't Pick - Love 'Em All"];

  const prompt = `1970s Hanna-Barbera cartoon style superhero character, like Scooby-Doo or Josie and the Pussycats art style. A unique superhero rock band fan with a colorful cape and mask, striking a fun heroic pose. Their superpower is ${superpower} - show visual effects of this power around them. ${allyVibe}. Retro cartoon style, bold outlines, flat colors, white background, full body, single character, no text, no labels, no words.`;

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1.5',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      }),
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
