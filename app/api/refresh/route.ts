import { timingSafeEqual, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  acquireWeatherSyncLock,
  releaseWeatherSyncLock,
} from '@/lib/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest, secret: string): boolean {
  const authorization = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;

  if (!authorization) return false;

  const actualBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

async function handleRefresh(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      {
        success: false,
        error: '資料同步服務尚未完成設定',
      },
      { status: 503 }
    );
  }

  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json(
      { success: false, error: '未授權的同步請求' },
      { status: 401 }
    );
  }

  const runId = randomUUID();

  try {
    const lockAcquired = await acquireWeatherSyncLock(runId);

    if (!lockAcquired) {
      return NextResponse.json(
        { success: false, error: '資料同步工作正在執行中' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '受保護的同步入口已就緒；資料更新將於下一階段啟用',
      status: 'ready',
    });
  } catch (error) {
    console.error('Weather refresh endpoint failed:', error);
    return NextResponse.json(
      { success: false, error: '資料同步服務暫時無法使用' },
      { status: 500 }
    );
  } finally {
    await releaseWeatherSyncLock(runId).catch((error) => {
      console.error('Failed to release weather sync lock:', error);
    });
  }
}

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
