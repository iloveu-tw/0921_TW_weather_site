import { NextResponse } from 'next/server';
import { getAllObservations } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAllObservations();
    const updatedAt = data.length > 0 ? data[0].observation_time : null;

    return NextResponse.json({
      success: true,
      count: data.length,
      updated_at: updatedAt,
      data,
    });
  } catch (error) {
    console.error('Weather database query failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: '目前無法讀取氣象資料，請稍後再試',
        },
      },
      { status: 503 }
    );
  }
}
