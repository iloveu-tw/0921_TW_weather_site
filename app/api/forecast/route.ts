import { NextResponse } from 'next/server';
import { parseCwaForecast } from '@/lib/cwa-forecast';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.CWA_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: { message: '目前無法提供天氣預報' } },
      { status: 503 }
    );
  }

  try {
    const url = new URL(
      'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001'
    );
    url.searchParams.set('Authorization', apiKey);
    url.searchParams.set('format', 'JSON');
    const response = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('CWA forecast unavailable');

    const data = parseCwaForecast(await response.json());
    if (data.length === 0) throw new Error('CWA forecast empty');

    return NextResponse.json(
      { success: true, fetched_at: new Date().toISOString(), data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { message: '預報暫時無法讀取，請稍後再試' } },
      { status: 502 }
    );
  }
}
