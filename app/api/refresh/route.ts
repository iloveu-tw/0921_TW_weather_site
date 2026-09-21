import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { getAllObservations } from '@/lib/database';

const execPromise = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_weather.py');
    const { stdout, stderr } = await execPromise(`python3 "${scriptPath}"`);
    console.log('Python fetch output:', stdout);
    if (stderr) console.warn('Python fetch stderr:', stderr);

    const refreshedData = getAllObservations();

    return NextResponse.json({
      success: true,
      message: '氣象資料已成功從 CWA 擷取並更新至 SQLite 資料庫',
      count: refreshedData.length,
      updated_at: refreshedData.length > 0 ? refreshedData[0].observation_time : new Date().toISOString(),
      data: refreshedData,
    });
  } catch (error) {
    console.error('Failed to refresh weather data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新氣象資料失敗',
      },
      { status: 500 }
    );
  }
}
