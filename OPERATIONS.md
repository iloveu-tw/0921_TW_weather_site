# 氣象資料同步維運與復原手冊

## 1. 日常健康檢查

在已設定 `DATABASE_URL` 的環境執行：

```bash
npm run ops:status
```

輸出只包含目前快照筆數、最新觀測時間、最近同步狀態、錯誤碼、最後成功時間與最近 24 小時成功率，不會輸出連線字串或 API Key。

| Exit Code | 意義 | 處理方式 |
|---:|---|---|
| `0` | 快照至少 500 筆、曾成功同步且最近一次同步未失敗 | 無須處理 |
| `1` | 資料筆數不足、沒有成功紀錄或最近一次同步失敗 | 依第 4 節判讀 |
| `2` | `DATABASE_URL` 缺失或 Neon 無法查詢 | 檢查環境變數、Neon 狀態與網路 |

## 2. GitHub Actions 每小時排程

正式排程定義於 `.github/workflows/sync-cwa.yml`，每小時整點呼叫 Production `/api/refresh`。GitHub Repository Actions Secret `CRON_SECRET` 必須與 Vercel Production 的同名環境變數一致。

- GitHub Actions 頁面可使用 **Run workflow** 手動驗證。
- 成功條件為 HTTP `200`、`success: true` 且同步筆數至少 500 筆。
- HTTP 或回應內容異常時工作會失敗；GitHub 排程本身不會自動重試。
- `concurrency` 只允許一個工作執行，後端 Neon 租約鎖則防止其他來源重複同步。
- 維護或資料還原前，可在 GitHub Actions 停用 `Sync CWA weather snapshot` 工作流程；完成檢查後再啟用。

首次正式驗證於 2026-09-22 完成：[GitHub Actions Run 35695727766](https://github.com/iloveu-tw/0921_TW_weather_site/actions/runs/35695727766) 成功同步 876 筆測站，Neon 最新同步狀態為 `success` 且無錯誤碼。

## 3. 手動觸發受保護同步

正式網站沒有公開手動更新按鈕。維運者可從受信任終端呼叫：

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://YOUR_DEPLOYMENT.example/api/refresh
```

- HTTP `200`：同步成功。
- HTTP `401`：`CRON_SECRET` 缺失或不一致。
- HTTP `409`：已有同步工作執行中，等待後再檢查，不要連續重送。
- HTTP `502`：CWA、資料驗證或 Neon 寫入失敗；網站仍應提供前一份有效快照。
- HTTP `503`：部署端尚未設定 `CRON_SECRET`。

請勿把真實 Secret 寫入指令文件、Issue、Commit 或聊天記錄。

## 4. 同步錯誤碼判讀

| 錯誤碼 | 可能位置 | 優先檢查 |
|---|---|---|
| `CWA_API_KEY_MISSING` | 部署設定 | `CWA_API_KEY` 是否存在 |
| `CWA_TIMEOUT`、`CWA_NETWORK_ERROR` | CWA／網路 | CWA 服務狀態與部署網路 |
| `CWA_HTTP_ERROR` | CWA 授權或配額 | Key 是否有效、CWA 回應狀態 |
| `CWA_RESPONSE_INVALID`、`CWA_SCHEMA_INVALID` | CWA 格式 | CWA Schema 是否改版 |
| `STATION_COUNT_TOO_LOW` | CWA 資料完整性 | 回傳筆數是否異常下降 |
| `REQUIRED_FIELD_MISSING` | CWA 資料完整性 | 站號、站名、縣市、鄉鎮 |
| `DUPLICATE_STATION_ID` | CWA 資料完整性 | 重複站號 |
| `COORDINATE_INVALID` | CWA 資料完整性 | 經緯度欄位與座標系統 |
| `OBSERVATION_TIME_INVALID`、`OBSERVATION_TIME_STALE` | CWA 資料時效 | 時區、時間格式、資料是否停更 |
| `UNEXPECTED_ERROR` | Neon／程式 | 部署 Log 的同一個 `runId`，不得公開內部錯誤內容 |

同步採用 PostgreSQL Transaction；任一驗證或寫入步驟失敗時，`weather_observations` 不會先被清空，前一份有效快照會繼續供網站讀取。

## 5. 回復上一份有效資料

若一次「成功」同步後才發現資料內容不正確，使用 Neon Point-in-Time Restore：

1. 先停用 Live 排程，避免還原期間再次同步。
2. 記錄異常同步時間與 `npm run ops:status` 結果。
3. 進入 Neon Console 的 **Backup & Restore／Restore**，選擇 `production` branch。
4. 選擇異常同步發生前的時間點，先用 Time Travel Assist 執行唯讀檢查：

   ```sql
   SELECT
     COUNT(*) AS rows,
     COUNT(DISTINCT station_id) AS unique_stations,
     MAX(observation_time) AS latest_observation_time
   FROM weather_observations;
   ```

5. 確認筆數與時間正確後才執行 Restore。Neon 會保留原 branch，並把既有連線切換到還原後的 branch；短暫重新連線屬預期行為。
6. 執行 `npm run ops:status`，再檢查 `/api/weather` 是否為 HTTP `200`、至少 500 筆且站號唯一。
7. 找出異常來源並完成受控同步後，才重新啟用排程。

Neon 的可還原時間範圍依專案方案與 retention 設定而定；正式上線前必須在 Staging 演練一次並記錄可用範圍。操作依據：[Neon Point-in-Time Restore](https://neon.com/blog/announcing-point-in-time-restore)。

## 6. 發布前固定檢查

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run ops:status
```

任一項失敗皆不可進入下一部署階段。排程變更合併至 `main` 後，必須手動執行一次 GitHub Action，並確認 Neon 同步紀錄與 Live 網站同步時間更新。
