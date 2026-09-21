import { NextResponse } from 'next/server';
import { getAllObservations } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getAllObservations();
    const updatedAt = data.length > 0 ? data[0].observation_time : new Date().toISOString();

    return NextResponse.json({
      success: true,
      count: data.length,
      updated_at: updatedAt,
      data: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
