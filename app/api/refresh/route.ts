import { timingSafeEqual, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  acquireWeatherSyncLock,
  createWeatherSyncRun,
  markWeatherSyncFailure,
  releaseWeatherSyncLock,
} from '@/lib/database';
import {
  synchronizeWeatherFromCwa,
  WeatherSyncError,
} from '@/lib/weather-sync';

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
  let runCreated = false;

  try {
    const lockAcquired = await acquireWeatherSyncLock(runId);

    if (!lockAcquired) {
      return NextResponse.json(
        { success: false, error: '資料同步工作正在執行中' },
        { status: 409 }
      );
    }

    await createWeatherSyncRun(runId);
    runCreated = true;
    console.info('Weather synchronization started', { runId });

    const result = await synchronizeWeatherFromCwa(runId);
    console.info('Weather synchronization completed', {
      runId,
      count: result.count,
    });

    return NextResponse.json({
      success: true,
      message: '氣象資料已完成同步',
      count: result.count,
      updated_at: result.updatedAt,
    });
  } catch (error) {
    const errorCode =
      error instanceof WeatherSyncError ? error.code : 'UNEXPECTED_ERROR';

    if (runCreated) {
      await markWeatherSyncFailure(runId, errorCode).catch((logError) => {
        console.error('Failed to record weather synchronization failure', {
          runId,
          error: logError instanceof Error ? logError.message : 'unknown',
        });
      });
    }

    console.error('Weather synchronization failed', { runId, errorCode });
    return NextResponse.json(
      { success: false, error: '資料同步服務暫時無法使用' },
      { status: 502 }
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
