import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('同步狀態檢查失敗：DATABASE_URL 未設定');
  process.exit(2);
}

try {
  const sql = neon(databaseUrl);
  const [snapshot] = await sql`
    SELECT
      COUNT(*)::int AS record_count,
      MAX(observation_time) AS latest_observation_time
    FROM weather_observations
  `;
  const [runs] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '24 hours')::int AS runs_24h,
      COUNT(*) FILTER (
        WHERE started_at >= NOW() - INTERVAL '24 hours' AND status = 'success'
      )::int AS successes_24h,
      MAX(completed_at) FILTER (WHERE status = 'success') AS last_success_at,
      (ARRAY_AGG(status ORDER BY started_at DESC))[1] AS latest_status,
      (ARRAY_AGG(error_code ORDER BY started_at DESC))[1] AS latest_error_code
    FROM weather_sync_runs
  `;

  const totalRuns = Number(runs.runs_24h ?? 0);
  const successfulRuns = Number(runs.successes_24h ?? 0);
  const report = {
    healthy:
      Number(snapshot.record_count ?? 0) >= 500 &&
      runs.last_success_at !== null &&
      runs.latest_status !== 'failed',
    snapshot: {
      record_count: Number(snapshot.record_count ?? 0),
      latest_observation_time: snapshot.latest_observation_time,
    },
    sync: {
      latest_status: runs.latest_status ?? null,
      latest_error_code: runs.latest_error_code ?? null,
      last_success_at: runs.last_success_at ?? null,
      runs_24h: totalRuns,
      successes_24h: successfulRuns,
      success_rate_24h:
        totalRuns === 0 ? null : Number((successfulRuns / totalRuns).toFixed(3)),
    },
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.healthy ? 0 : 1;
} catch {
  console.error('同步狀態檢查失敗：無法查詢 Neon PostgreSQL');
  process.exitCode = 2;
}
