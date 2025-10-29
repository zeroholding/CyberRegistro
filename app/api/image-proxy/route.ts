import { NextRequest, NextResponse } from 'next/server';

// Allowlist of remote hosts to proxy images from
const ALLOWED_HOSTS = [
  // Mercado Livre CDN domains commonly used for product pictures
  'mlstatic.com',
  'mercadolibre.com',
  'mercadolivre.com',
  'mercadolivre.com.br',
  'mercadolibre.com.ar',
  'mercadolibre.com.mx',
  'mercadolibre.cl',
  'mercadolibre.com.co',
  'mercadolibre.com.pe',
];

function isAllowedHost(url: URL) {
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('url');
    if (!target) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let remote: URL;
    try {
      remote = new URL(target);
    } catch {
      return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(remote.protocol)) {
      return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
    }

    if (!isAllowedHost(remote)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    }

    // Ask the upstream to prefer JPEG/PNG to avoid WEBP/AVIF unsupported by pdf-lib
    const upstream = await fetch(remote.toString(), {
      // Avoid passing through cookies/auth headers
      headers: {
        // Prefer jpeg/png and avoid webp/avif so embedding succeeds
        Accept: 'image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'CyberRegistroImageProxy/1.0',
      },
      cache: 'no-store',
      // A short timeout guard via AbortSignal (optional)
      // Note: Edge runtime ignores AbortSignal.timeout; Node runtime supports in recent versions
    } as RequestInit);

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache in the CDN for a day; safe for immutable product images
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        // Allow client-side fetch usage in the app
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('image-proxy error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

