export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const { name, superpower, favoriteMember, email, signalCode, turnstileToken, website } = await request.json();

  // === PROTECTION 1: Honeypot ===
  if (website) {
    // Bot filled the hidden field — silently return a fake success
    return new Response(JSON.stringify({ image: null }), { status: 200 });
  }

  // === PROTECTION 2: Cloudflare Turnstile ===
  const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: 'Verification required' }), { status: 403 });
    }
    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: turnstileSecret, response: turnstileToken }),
    });
    const tsData = await tsRes.json();
    if (!tsData.success) {
      return new Response(JSON.stringify({ error: 'Verification failed' }), { status: 403 });
    }
  }

  // === Supabase config (used for rate limiting + fan verification) ===
  const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseKey) {
    const sbHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };

    // === PROTECTION 3: Rate limiting (3 per hour per IP) ===
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const countRes = await fetch(
      `${supabaseUrl}/rest/v1/rate_limits?ip_address=eq.${encodeURIComponent(ip)}&endpoint=eq.generate-hero&created_at=gte.${encodeURIComponent(oneHourAgo)}&select=id`,
      { headers: sbHeaders }
    );
    const recentRequests = await countRes.json();
    if (Array.isArray(recentRequests) && recentRequests.length >= 3) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), { status: 429 });
    }

    // === PROTECTION 4: Verify fan exists in Supabase ===
    if (email && signalCode) {
      const fanRes = await fetch(
        `${supabaseUrl}/rest/v1/fans?email=eq.${encodeURIComponent(email)}&signal_code=eq.${encodeURIComponent(signalCode)}&select=id&limit=1`,
        { headers: sbHeaders }
      );
      const fans = await fanRes.json();
      if (!Array.isArray(fans) || fans.length === 0) {
        return new Response(JSON.stringify({ error: 'Signup verification failed' }), { status: 403 });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Missing signup credentials' }), { status: 403 });
    }

    // Log request for rate limiting
    await fetch(`${supabaseUrl}/rest/v1/rate_limits`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({ ip_address: ip, endpoint: 'generate-hero' }),
    });
  }

  // === Generate image ===
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

  const prompt = `Detailed comic book illustration style superhero character. A unique superhero rock band fan with a colorful cape and mask, striking a dynamic heroic pose. Their superpower is ${superpower} - show visual effects of this power around them. ${allyVibe}. Rich shading, detailed linework, dynamic pose, transparent background, full body, single character, no text, no labels, no words.`;

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
