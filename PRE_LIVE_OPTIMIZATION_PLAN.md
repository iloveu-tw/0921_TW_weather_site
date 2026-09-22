# 台灣即時氣象 GIS — Live 上線前改善與進度追蹤

> 文件建立日期：2026-09-21  
> 適用專案：AIoT DIC-2 — CWA Weather GIS  
> 目前階段：Vercel Production 已上線；P1-05 與 GitHub Actions 每小時 CWA 排程已完成，P1-06 待續
> 文件目的：追蹤正式公開網站前的必要改善、驗證證據與上線決策。

## 1. 上線目標

將目前以本地 SQLite 與手動 Python 同步為主的展示系統，改善為具備下列條件的 Live 網站：

- 不在程式碼、文件或 Git 歷史中暴露敏感憑證。
- 使用適合正式環境的持久化資料來源。
- 氣象資料更新具備認證、交易保護與失敗復原能力。
- 使用者能辨識資料的觀測時間、同步時間與新鮮度。
- 地圖、統計、搜尋、排序、分頁與測站定位在桌面及手機均可正常使用。
- 靜態檢查、Production Build 與部署後 Smoke Test 全部通過。

本階段以安全、可靠性及可部署性為優先，不將歷史趨勢、雷達回波、AI 摘要等擴充功能列為首次上線阻擋條件。

## 2. 狀態定義與更新規則

| 狀態 | 說明 |
|---|---|
| `待辦` | 尚未開始執行 |
| `進行中` | 已開始修改或驗證，但尚未達成全部驗收條件 |
| `受阻` | 已知阻擋原因，需取得決策、權限或外部資源後才能繼續 |
| `完成` | 所有驗收條件均通過，且已留下驗證證據 |
| `不適用` | 經確認不屬於本次部署範圍，需記錄原因 |

進度更新原則：

1. 不以「已修改程式碼」作為完成依據，必須通過對應驗收。
2. 每次更新狀態時，同步填寫「完成日期／驗證證據」與文件末尾的變更紀錄。
3. 若驗證失敗，狀態維持 `進行中` 或改為 `受阻`，不可標示為 `完成`。
4. 驗證證據可包含指令結果摘要、測試名稱、部署網址或相關 Commit SHA，但不得包含 API Key、Token、密碼或私鑰。

## 3. 目前基準狀態

本表記錄 2026-09-21 的唯讀盤點結果，後續應以重新執行的驗證結果為準。

| 檢查項目 | 基準結果 |
|---|---|
| 本地 SQLite 測站紀錄 | 876 筆 |
| 唯一測站 ID | 876 個 |
| 有效氣溫 | 845 筆 |
| 有效濕度 | 844 筆 |
| 有效雨量 | 855 筆 |
| 有效風速 | 847 筆 |
| 資料保存方式 | 僅保存最新快照，更新時先刪除再寫入 |
| 縣市資料 | 資料庫沒有 `county` 欄位，前端以測站名稱推測 |
| 更新方式 | 使用者呼叫 `POST /api/refresh` 後啟動 Python 程序 |
| 更新端點保護 | 尚無認證、頻率限制及重複執行鎖 |
| ESLint | 6 errors、4 warnings，尚未通過 |
| Production Build | 本次尚未驗證 |
| Live 資料庫 | 尚未建立 |
| Live 部署 | 尚未開始 |
| 敏感資訊 | 已追蹤文件中偵測到 CWA API Key，需視為已曝光並輪替 |

## 4. 總進度摘要

| ID | 優先級 | 改善項目 | 狀態 | 完成日期／驗證證據 |
|---|:---:|---|:---:|---|
| P0-01 | P0 | 輪替憑證並移除版本控制中的敏感資訊 | 完成 | CWA 後台更新授權碼、歷史清理與新 Key 驗證通過 |
| P0-02 | P0 | 決定並建立正式環境資料架構 | 完成 | Neon 遷移、持久性、Build 與 Neon-only API 驗證通過 |
| P0-03 | P0 | 保護資料更新端點與排程入口 | 完成 | `CRON_SECRET`、Neon 租約鎖、60 秒上限與 HTTP 行為驗證通過 |
| P0-04 | P0 | 實作原子更新、資料驗證與失敗復原 | 完成 | CWA 876 筆原子同步、驗證拒絕與 Transaction 回滾測試通過 |
| P0-05 | P0 | 修正 API 錯誤語意與前端錯誤狀態 | 完成 | 200／503 Schema 與 Loading／Empty／Error／Retry 驗證通過 |
| P0-06 | P0 | 排除 ESLint／TypeScript／Build 問題 | 完成 | ESLint 0、TypeScript 與 Production Build 通過，首頁與 API 回歸正常 |
| P1-01 | P1 | 建立正確的縣市資料欄位與篩選 | 完成 | 876 筆 county／town 零缺失、22 縣市與離島抽查、前端精確篩選通過 |
| P1-02 | P1 | 加入觀測時間、同步時間與資料新鮮度 | 完成 | API 與 Header 分離兩種時間，120 分鐘 stale 邊界與 876 筆回歸通過 |
| P1-03 | P1 | 改善地圖效能與大量測站呈現 | 完成 | Canvas 原地更新、桌面／375px E2E、Popup 安全與前後量測通過 |
| P1-04 | P1 | 完成行動版、無障礙與狀態畫面 | 完成 | 375／768／1440 px、鍵盤、ARIA、狀態畫面及手機表格捲動驗證通過 |
| P1-05 | P1 | 補齊測試、監控、紀錄與復原程序 | 完成 | 6／6 核心測試、受控失敗保留、成功回復、UI 7／7、Build 與健康查詢通過 |
| P1-06 | P1 | 建立 Staging 並完成端對端驗收 | 待辦 | — |
| P2-01 | P2 | 歷史資料與趨勢圖表 | 待辦 | 首次上線非必要 |
| P2-02 | P2 | 雷達、紫外線、風向與進階圖層 | 待辦 | 首次上線非必要 |

## 5. P0 — Live 上線阻擋項目

### P0-01 輪替憑證並移除敏感資訊

**狀態：** `完成`

**問題**

已追蹤的專案文件含有真實 CWA API Key。即使只修改目前版本，舊值仍可能存在於 Git 歷史或已推送的遠端倉庫。

**執行步驟**

1. 於 CWA 管理平台撤銷或輪替舊 Key。
2. 將所有文件中的實際值改為 `CWA_API_KEY=YOUR_CWA_API_KEY`。
3. 檢查工作樹、Git 歷史、標籤及部署設定是否仍含舊值。
4. 依遠端公開狀態決定是否清理 Git 歷史及強制更新遠端。
5. 將新 Key 僅設於本機 `.env` 與部署平台的加密環境變數。

**驗收標準**

- 舊 Key 已失效，新 Key 可成功呼叫 CWA API。
- 工作樹與完整 Git 歷史掃描均找不到真實憑證。
- 公開文件、Build Log 與 API 回應不會輸出憑證。
- `.env*` 忽略規則維持有效，僅允許提交不含真實值的範本。

**目前進度／驗證證據：**

- 2026-09-21：目前工作樹中的實際 CWA API Key 已改為 `YOUR_CWA_API_KEY`。
- 2026-09-21：新 Key 已存入受 `.gitignore` 保護的本機 `.env`，並以 CWA 單筆唯讀 API 查詢驗證成功。
- 2026-09-21：已改寫 6 個 commits，並以 `--force-with-lease` 安全更新 GitHub `main`。
- 2026-09-21：本地與遠端 `main` 完全一致；所有可達 commits 的憑證掃描命中數為 0，本機無殘留可回復物件。
- 2026-09-22：使用者提供 CWA 後台規則佐證，透過「更新授權碼」產生新值後，舊授權碼永久失效。先前僅依 HTTP 成功狀態所做的判斷不足，已撤回該阻擋判定。

### P0-02 決定並建立正式環境資料架構

**狀態：** `完成`

**問題**

目前依賴可寫入的本地 SQLite 與 Python 子程序，不適合作為一般 Serverless Live 環境的持久化架構。

**建議方向**

正式環境使用 Managed PostgreSQL；資料更新工作負責寫入，Next.js API 只負責讀取。若本次僅為短期課堂展示，可改採預先產生的靜態 JSON，但必須明確標示資料更新方式與限制。

**目前架構評估**

- 2026-09-21：確認 Vercel 已不再提供新的第一方 Vercel Postgres，應由 Marketplace 接入 PostgreSQL 供應商。
- 2026-09-21：建議採用 Vercel Marketplace 的 Neon PostgreSQL，使用 `@neondatabase/serverless` 透過 `DATABASE_URL` 連線。
- 建議 Development、Staging、Production 使用分離的資料庫或 Neon branches，避免測試資料寫入 Production。
- 保留 Next.js Node.js Runtime；移除正式環境對 Python 子程序與可寫入本地 SQLite 的依賴。
- P0-01 已依 CWA 後台的授權碼輪替規則完成，不再列為 Live 上線阻擋項目。
- 2026-09-21：使用者確認採用 Neon PostgreSQL。
- 2026-09-21：已加入 `@neondatabase/serverless`、PostgreSQL Schema、`DATABASE_URL` 範本、SQLite／Neon 雙後端資料層及一次性原子遷移工具。
- 2026-09-21：針對性 ESLint 與 TypeScript 檢查通過，Production Build 通過；SQLite 回退模式 `/api/weather` 成功回傳 876 筆資料。
- 2026-09-21：遷移工具在未設定 `DATABASE_URL` 時會安全停止，沒有執行任何遠端寫入。
- 2026-09-22：Development `DATABASE_URL` 已設於受 `.gitignore` 保護的本機 `.env`。
- 2026-09-22：SQLite → Neon 原子遷移成功，來源與目標均為 876 筆、876 個唯一站號。
- 2026-09-22：Neon 模式 Production Build、API 欄位與時間格式驗證通過；Server 重啟後仍可讀取 876 筆資料。
- 2026-09-22：已移除 Runtime 的 `better-sqlite3`、SQLite 回退路徑與 Next.js 外部套件設定；本機原始 `data/weather.db` 保留且未刪除。
- 2026-09-22：Neon-only `/api/weather` 回歸通過；舊 `/api/refresh` 在 PostgreSQL 模式正確回覆 HTTP 503，等待 P0-03 安全同步實作。
- Development 使用獨立的 `taiwan-weather-dev` Neon Project；Staging 與 Production 仍須在部署階段建立獨立 branch 或 project，不得共用 Development 連線字串。

**執行步驟**

1. 確認部署平台與資料保存需求。
2. 在「Managed PostgreSQL」與「靜態 JSON 展示」之間做出明確決策。
3. 建立獨立的 Development、Staging、Production 設定。
4. 建立 Schema Migration 與環境變數設定方式。
5. 將資料讀取層與本地 SQLite 實作解耦。
6. 驗證部署環境重新啟動後資料仍存在。

**驗收標準**

- Live 環境不依賴可寫入的本地 SQLite。
- Production 資料在重新部署及執行個體重啟後仍存在。
- Development、Staging、Production 不共用正式憑證或誤寫同一資料庫。
- 架構決策、回復方式及必要環境變數已寫入維運文件。

**完成日期／驗證證據：** 2026-09-22

### P0-03 保護資料更新端點與排程入口

**狀態：** `完成`

**問題**

目前任何可存取網站的人都可能呼叫 `POST /api/refresh`，造成 API 配額、主機資源及資料完整性風險。

**執行步驟**

1. 將正式環境更新改由受保護的排程工作執行。
2. 若保留手動同步功能，限制為管理員或具有效簽章的 Server-to-Server 請求。
3. 加入 Rate Limit、重複執行鎖與執行逾時。
4. 避免將 Python stdout、系統路徑或內部例外直接回傳給瀏覽器。
5. 記錄更新開始、結束、結果、資料筆數與失敗原因，但遮蔽所有機密資訊。

**驗收標準**

- 未授權更新請求得到 `401` 或 `403`。
- 短時間內重複呼叫不會產生平行更新。
- 更新逾時可安全終止，且不影響目前可用資料。
- 一般使用者無法從前端或 API 取得內部錯誤與憑證。

**完成日期／驗證證據：** 2026-09-22

- 2026-09-22：公開首頁已移除未經認證的手動同步按鈕；一般使用者僅能讀取 Neon 快照。
- 2026-09-22：`GET`／`POST /api/refresh` 共用 Server-to-Server Bearer 驗證，密鑰缺失時安全停止，內部例外不回傳瀏覽器。
- 2026-09-22：本機 `.env` 已設定隨機 64 字元 `CRON_SECRET`，版本控制僅保存無機密範例。
- 2026-09-22：Neon `weather_sync_locks` 租約鎖建立完成，鎖定最多 5 分鐘；Route 的平台執行上限為 60 秒。
- 2026-09-22：實測無授權與錯誤密鑰均回覆 HTTP 401；正確密鑰的 GET／POST 均回覆 HTTP 200；預置有效鎖後回覆 HTTP 409，測試鎖已清除。
- 2026-09-22：針對性 ESLint、TypeScript、Production Build 與 `git diff --check` 通過。自動排程頻率待 P0-04 完成真實同步後於部署設定啟用，避免空排程誤報成功。

### P0-04 實作原子更新、資料驗證與失敗復原

**狀態：** `完成`

**問題**

現行流程先刪除舊資料再寫入新資料。若 CWA 回傳異常、清洗失敗或寫入中斷，可能留下空資料庫或不完整快照。

**執行步驟**

1. 完整取得並清洗新資料後，再開始更新正式資料。
2. 驗證測站筆數、唯一鍵、座標、時間與指標合理範圍。
3. 使用 Transaction、暫存表或版本化 Snapshot 完成原子切換。
4. CWA 回傳空陣列或資料量異常下降時，拒絕覆蓋既有快照。
5. 保留最近一次成功更新時間與失敗紀錄。

**驗收標準**

- 模擬網路中斷、空回應與資料庫寫入失敗時，舊資料仍可讀取。
- `station_id` 具備唯一性約束或等效驗證。
- 無效座標或必要欄位缺失的資料不會污染正式快照。
- 同一輪更新要麼完整成功，要麼完全回復。

**完成日期／驗證證據：** 2026-09-22

- 2026-09-22：CWA `O-A0001-001` 實際回應結構與 876 筆測站已驗證，擷取逾時設為 45 秒。
- 2026-09-22：同步前會檢查最低 500 筆、不得低於既有快照 80%、站號唯一、必要欄位、台灣與外島座標範圍，以及觀測時間新鮮度；缺測代碼與超出合理範圍的氣象數值轉為 `null`。
- 2026-09-22：空陣列、重複站號與無效座標測試分別以 `STATION_COUNT_TOO_LOW`、`DUPLICATE_STATION_ID`、`COORDINATE_INVALID` 正確拒絕。
- 2026-09-22：Neon 非互動式 Transaction 以 `DELETE + INSERT + success log` 原子提交；強制製造唯一鍵錯誤 `23505` 後，資料仍為 876 筆且無測試殘值。
- 2026-09-22：受保護端點完成一次真實 CWA → Neon 同步；資料庫及 `/api/weather` 均為 876 筆、876 個唯一站號，同步紀錄為 `success`。
- 2026-09-22：以無效 CWA 憑證模擬外部服務失敗，端點安全回覆 HTTP 502，Neon 仍保留 876 筆，並留下 `CWA_HTTP_ERROR` 失敗紀錄。
- 2026-09-22：針對性 ESLint、TypeScript 與 Production Build 通過；實際排程頻率待 Vercel 方案確認後設定。

### P0-05 修正 API 錯誤語意與前端錯誤狀態

**狀態：** `完成`

**問題**

資料庫查詢失敗時，目前可能轉成空陣列，使 `/api/weather` 誤回 `success: true`，前端無法區分零筆資料與系統錯誤。

**執行步驟**

1. 讓資料庫例外向 API 層傳遞。
2. 統一 Success 與 Error Response Schema。
3. 為資料庫不可用、CWA 失敗、驗證失敗及過期資料定義錯誤代碼。
4. 前端分別處理 Loading、Empty、Stale、Error 與正常狀態。
5. Server Log 保留詳細原因，使用者畫面只顯示安全且可理解的訊息。

**驗收標準**

- 資料庫不可用時 API 回覆正確的非 2xx 狀態。
- 空資料與系統錯誤在 API 與 UI 上可明確區分。
- API Response Schema 具備型別定義與測試。
- 前端錯誤畫面提供可操作的重試或返回方式。

**完成日期／驗證證據：** 2026-09-22

- 2026-09-22：建立 `WeatherApiResponse` 判別聯集；成功回應包含 `count`、可為 `null` 的 `updated_at` 與資料陣列，錯誤回應包含固定 `code` 與安全訊息。
- 2026-09-22：正常 Neon 讀取實測 HTTP 200、876 筆；以無效 `DATABASE_URL` 啟動隔離 Server 後實測 HTTP 503 與 `DATABASE_UNAVAILABLE`，回應未包含連線字串或內部例外。
- 2026-09-22：首頁已分離 Loading、Empty、Error 與正常資料畫面，Empty／Error 均提供重新讀取操作。
- 2026-09-22：移除首頁多餘的 Mounted state，改由 Dynamic Import loading 畫面處理地圖初始化；該頁 ESLint、TypeScript 與 Production Build 通過。
- 2026-09-22：全專案 ESLint 從 6 errors、4 warnings 降至 4 errors、1 warning，剩餘項目移交 P0-06。

### P0-06 排除 ESLint、TypeScript 與 Production Build 問題

**狀態：** `完成`

**目前基準**

- ESLint：原始基準為 6 errors、4 warnings；P0-05 後為 4 errors、1 warning。
- 已知類型包含 React Effect、函式宣告順序、未使用變數、明確 `any` 與 `prefer-const`。
- Production Build 尚未於本階段驗證。

**執行步驟**

1. 逐項修正 ESLint errors，避免使用全域停用規則掩蓋問題。
2. 清除或實際使用未使用的 state、props 與 imports。
3. 為 Leaflet 擴充欄位建立明確型別。
4. 執行 TypeScript 與 Production Build 驗證。
5. 將檢查納入 CI，避免後續提交重新引入錯誤。

**驗收標準**

```text
npm run lint   → 0 errors
npm run build  → exit code 0
```

- 不以忽略整個檔案或關閉核心規則作為主要解法。
- Build 完成後首頁與兩個 API 路由仍可正常使用。

**完成日期／驗證證據：** 2026-09-22

- 全專案 `npm run lint`：0 errors、0 warnings。
- `npx tsc --noEmit`：exit code 0。
- `npm run build`：Next.js 16.3.5 Production Build 成功。
- 依專案內建 Next.js 字型文件改用 `next/font/google`，Inter／Outfit 在 Build 階段下載並自託管，瀏覽器不再直接請求 Google Fonts。
- Leaflet 容器擴充欄位已改為明確 TypeScript 型別；排序區域的 `prefer-const` 問題已修正。
- Production Server 回歸：首頁 HTTP 200、`/api/weather` HTTP 200 且為 876 筆／876 個唯一站號、未授權 `/api/refresh` 維持 HTTP 401。

## 6. P1 — 建議於首次上線前完成

### P1-01 建立正確的縣市資料欄位與篩選

**狀態：** `完成`

**目前進度／安全停點：**

- 2026-09-22：唯讀檢查 CWA `O-A0001-001` 共 876 筆；`GeoInfo.CountyName` 與 `GeoInfo.TownName` 缺失筆數均為 0。
- 2026-09-22：資料涵蓋完整 22 縣市；離島抽查為澎湖縣 9 筆、金門縣 6 筆、連江縣 4 筆。
- 2026-09-22：Neon、Schema、CWA 正規化、TypeScript 型別與 API 已加入必填 `county`／`town`；完成 876 筆原子同步後，兩欄零缺失並設為 `NOT NULL`。
- 2026-09-22：資料庫與 `/api/weather` 均為 876 筆、876 個唯一站號及 22 縣市；離島回歸為澎湖縣 9 筆、金門縣 6 筆、連江縣 4 筆。
- 2026-09-22：前端縣市選單改由 API 資料動態建立，篩選使用 `station.county === selectedCounty` 精確比對，不再從測站名稱推測。
- 2026-09-22：缺少縣市或鄉鎮的驗證測試均以 `REQUIRED_FIELD_MISSING` 拒絕。

**執行步驟**

1. 確認 CWA 回傳的縣市與鄉鎮欄位來源。
2. 在 ETL、資料表、TypeScript 型別及 API Response 中加入 `county`，必要時加入 `town`。
3. 前端改用明確欄位比對，不再從測站名稱猜測。
4. 統計 22 縣市測站數並抽查離島及名稱不含縣市的測站。

**驗收標準**

- 每個可定位測站都有正規化縣市值或明確的未知狀態。
- 22 縣市篩選結果可由資料庫查詢重現。
- 「臺／台」等字形差異已統一處理。

**完成日期／驗證證據：** 2026-09-22；Lint、TypeScript、Production Build、Neon Schema、API 與 22 縣市統計驗證通過。

### P1-02 加入觀測時間、同步時間與資料新鮮度

**狀態：** `完成`

**執行步驟**

1. 區分 `observation_time` 與 `fetched_at`。
2. 定義資料過期門檻與 `is_stale` 判定規則。
3. 在 Header 或狀態列顯示觀測時間、同步時間與資料狀態。
4. 超過門檻時顯示明確警告，不再宣稱為即時資料。

**驗收標準**

- 時間統一使用可解析格式，並以 Asia/Taipei 正確呈現。
- 使用者能分辨「觀測發生時間」與「網站同步時間」。
- 模擬過期資料時，UI 顯示 Stale 狀態。

**完成日期／驗證證據：** 2026-09-22

- API 成功回應已分離 `observation_time`、`synced_at`、`is_stale` 與 `stale_after_minutes`，不再以單一 `updated_at` 混用觀測及同步時間。
- 最近成功同步時間來自 Neon `weather_sync_runs`，觀測時間取目前快照的最大 CWA 時間。
- 過期門檻設為 120 分鐘；測試 119 分鐘為正常、120 分鐘邊界仍正常、121 分鐘為過期，缺失與無效時間均為過期。
- Header 同時顯示 CWA 觀測時間與 Neon 同步時間；正常時顯示「資料為最新狀態」，過期時改為琥珀色「資料已過期」。
- Production 回歸：首頁 HTTP 200，API HTTP 200、876 筆，兩個時間欄位皆為 ISO UTC，當次 `is_stale=false`。
- 全專案 Lint、TypeScript 與 Production Build 通過。

### P1-03 改善地圖效能與大量測站呈現

**狀態：** `完成`

**執行步驟**

1. 量測約 876～1,000 個測站的初始繪製與指標切換時間。
2. 評估 Canvas Renderer、Marker Clustering 或視窗範圍繪製。
3. 避免指標切換時不必要地刪除並重建所有 Marker。
4. 確認 Popup 內容安全處理外部資料。
5. 快取固定 GeoJSON 與適當的唯讀 API 回應。

**驗收標準**

- 桌面及目標手機裝置縮放、平移與切換圖層無明顯卡頓。
- Marker、表格選取與 Popup 維持同步。
- 效能優化前後具備可比較的量測結果。

**完成日期／驗證證據：** 2026-09-22

- 876 個 CircleMarker 共用單一 Leaflet Canvas Renderer；氣溫／雨量切換改為 `setStyle` 原地更新，不再刪除、重建及重新綁定全部 Marker。
- 測站 Marker 改由獨立 LayerGroup 管理，顯示／隱藏只增減整層；固定縣市 GeoJSON 使用瀏覽器快取，`/api/weather` 使用 60 秒 CDN 快取及 300 秒 stale-while-revalidate。
- 使用相同 876 筆資料的控制量測：舊式 SVG 重建切換的 JavaScript 操作平均 5.1 ms，新式 Canvas 原地更新平均 0.8 ms，降低約 84%；初始建立操作由 7.1 ms 降至 5.7 ms。
- Production E2E：桌面 1440×1000 初始可操作約 2.50 秒、切換平均 77.4 ms；375×812 行動視窗初始可操作約 0.86 秒、切換平均 82.8 ms；最大切換約 150 ms，兩者皆無 Page Error。
- 桌面與行動視窗皆維持單一 Canvas，表格定位、Fly-to 與 Popup 顯示正常。
- CWA 測站文字已先做 HTML escaping；惡意 HTML 探針測試為 0 個注入元素、0 個 Dialog，Popup 僅顯示轉義後文字。
- 全專案 Lint、TypeScript 與 Production Build 通過。

### P1-04 完成行動版、無障礙與狀態畫面

**狀態：** `完成`

**驗收範圍**

- 375 px、768 px 與桌面寬度。
- 鍵盤操作與可見的 Focus 狀態。
- 控制按鈕的名稱與 `aria-label`。
- 不只依賴顏色傳達氣溫、雨量或錯誤狀態。
- Loading、Empty、Stale、Error 與正常狀態。
- 表格橫向捲動或手機版替代呈現。

**驗收標準**

- 主要功能可在鍵盤與觸控操作下完成。
- 行動版沒有主要控制項被遮蔽或溢出畫面。
- 色彩對比與文字資訊足以辨識狀態。

**完成日期／驗證證據：** 2026-09-22

- 修正 Grid 子項最小寬度與行動版欄寬；375、768、1440 px 的頁面寬度均等於 viewport，主要區塊與控制項不再被右側裁切。
- 手機表格改為容器內橫向捲動；375 px 測試中容器寬 299 px、表格寬 650 px，可由 `scrollLeft=0` 捲至 `200`，不造成整頁橫向溢出。
- 排序欄位改為原生按鈕並提供 `aria-sort`；鍵盤 Enter 可將排序狀態由 `none` 改為 `descending`。
- 地圖區域、搜尋、縣市篩選、定位、底圖、指標與圖層控制均補齊可存取名稱或狀態；稽核結果為 0 個未命名互動元件、0 個缺少按鈕的排序欄位。
- 鍵盤 Space 可將測站圖層的 `aria-pressed` 由 `true` 切換為 `false`；Focus outline 為可見的 `solid` 樣式。
- Loading、Empty、Stale、Error、Retry 與正常狀態均完成受控測試；Stale 狀態同時以「CWA 資料已過期」文字呈現，不只依賴顏色。
- 加入 `prefers-reduced-motion` 降低動態效果，並完成 375／768 px 實際截圖檢視。
- 全專案 Lint、TypeScript、Production Build 與 `git diff --check` 通過。

### P1-05 補齊測試、監控、紀錄與復原程序

**狀態：** `完成`

**目前已完成（2026-09-22）**

- 新增 `npm test`，6 組核心測試涵蓋 CWA 缺測值、空回應、低筆數、重複站號、異常座標、過期時間、120 分鐘時效邊界、統計、搜尋、精確縣市篩選、排序與分頁；當次 6／6 通過。
- 將統計與表格資料處理抽成可測試的 `lib/weather-view.ts`；當次 ESLint 與 TypeScript 檢查通過。
- 新增 `npm run ops:status`；Development Neon 實測為健康、876 筆、最近同步成功，查詢不輸出憑證。
- 新增 `OPERATIONS.md`，包含同步錯誤碼、人工觸發、健康查詢及 Neon Point-in-Time Restore 程序。
- 目前進度已保存於 `codex/p1-05-testing-ops`／`edf1711`，Vercel Preview Build 狀態為 Ready。

**最終驗證（2026-09-22）**

- `npm test` 6／6、ESLint、TypeScript、Production Build 與 `git diff --check` 全部通過。
- 無效 `DATABASE_URL` 時 `/api/weather` 正確回覆 503／`DATABASE_UNAVAILABLE`。
- 無效 CWA Key 時 `/api/refresh` 回覆 502；失敗前後均為 876 筆且完整站號雜湊一致，證明上一份有效快照未被覆蓋。
- 改回有效設定後同步回覆 200／876 筆；最新同步紀錄恢復 `success`、`error_code=null`。
- Chromium 回歸 7／7：搜尋、排序、分頁、地圖定位 Popup、Stale、Error、Retry 全部通過。
- 縣市 SVG 遮擋測站 Canvas 點擊問題已修正；縣市邊界開啟／關閉時皆可直接點擊測站顯示完整 Popup，並經使用者本機手動驗證通過。
- `npm run ops:status` 回覆 healthy、876 筆、最新同步 success；README／HANDOVER／OPERATIONS 已完成現況一致性核對。

**最低測試範圍**

- CWA 資料清洗與缺測值轉換。
- 空回應、重複測站與異常座標。
- API 成功、資料庫失敗與過期資料回應。
- 統計卡極值與平均值。
- 搜尋、排序、分頁、縣市篩選與地圖定位。

**維運需求**

- 更新成功率、資料筆數與最後成功時間可被查詢。
- 失敗事件可被記錄或通知，但 Log 不得包含機密資訊。
- 具備回復上一份有效資料的操作說明。

**驗收標準**

- 核心測試可重複執行且全部通過。
- 模擬 CWA 失敗時，網站仍提供最近一次有效資料與適當提示。
- 維運者可依文件判斷問題位於 CWA、更新工作、資料庫或前端。

**完成日期／驗證證據：** 2026-09-22；以上自動化、受控失敗、成功回復、UI 與健康查詢均通過。

### P1-06 建立 Staging 並完成端對端驗收

**狀態：** `待辦`

> 2026-09-22：依使用者指示先略過完整驗證，已將已驗證 Commit `1dab462` 部署至 Vercel Production。首頁 HTTP 200、`/api/weather` HTTP 200／876 筆、未授權 `/api/refresh` HTTP 401；Staging、跨瀏覽器與 Rollback 演練仍未完成，因此本項維持待辦。

**執行步驟**

1. 建立與 Production 相同架構的 Staging 環境。
2. 使用獨立資料庫與憑證。
3. 執行完整資料更新與失敗測試。
4. 進行桌面、手機及至少兩種瀏覽器的 Smoke Test。
5. 驗證 CWA、Esri、OpenStreetMap 與行政區圖資 attribution。
6. 完成 Rollback 演練後再決定是否上線。

**驗收標準**

- Staging 可完整走通 CWA → ETL → Database → API → GIS。
- 未授權更新、資料過期與外部服務失敗均有預期行為。
- 地圖、搜尋、排序、分頁、Popup、底圖切換與同步狀態通過測試。
- Rollback 步驟已驗證，不只是文件描述。

**完成日期／驗證證據：** —

## 7. P2 — 首次上線後擴充

以下項目不阻擋首次 Live 發布，應在核心架構穩定後另行規劃：

- 保存歷史觀測並提供 24 小時／7 日趨勢圖。
- 雷達回波、紫外線與風向指針圖層。
- 天氣告警與通知。
- AI 氣象摘要或自然語言查詢。
- 使用者帳號、個人化地區與收藏測站。

導入歷史資料前，需先定義保存週期、資料量、查詢索引與資料使用目的，避免在最新快照資料表上直接堆疊未規劃的時間序列資料。

## 8. Live 上線總驗收清單

### 安全

- [ ] 已撤銷並輪替曝光的 API Key。
- [ ] 工作樹、Git 歷史及遠端不含真實憑證。
- [ ] Production Secret 僅存在於受保護的環境變數。
- [ ] 更新入口具備認證、Rate Limit、互斥與逾時。
- [ ] API、UI 及 Log 不會洩漏憑證或內部系統資訊。

### 資料與後端

- [x] Production Runtime 不依賴可寫入的本地 SQLite。
- [ ] 更新流程具備資料驗證與原子交易。
- [ ] 空資料或異常資料不會覆蓋上一份有效快照。
- [ ] `station_id` 唯一性與必要索引已建立。
- [x] 縣市欄位來自明確資料源，不再從測站名稱猜測。
- [ ] API 正確區分成功、空資料、過期資料與系統錯誤。
- [ ] 觀測時間與同步時間可被追蹤。

### 程式品質

- [ ] `npm run lint` 通過。
- [ ] `npm run build` 通過。
- [ ] 核心自動化測試通過。
- [ ] 不以關閉檢查規則掩蓋錯誤。

### 前端與 GIS

- [ ] 地圖、三種底圖、縣市圖層與測站圖層可正常顯示。
- [ ] 氣溫／雨量分色與圖例一致。
- [ ] 搜尋、縣市篩選、排序、分頁與 Fly-to 正常。
- [ ] Loading、Empty、Stale、Error 狀態已驗證。
- [ ] 桌面與行動裝置操作正常。
- [ ] 圖資 attribution 完整且可見。

### 部署與維運

- [ ] Staging 端對端測試通過。
- [ ] Production 環境變數與 Staging 隔離。
- [ ] 更新失敗、資料庫失敗與外部圖磚失敗已有處理方式。
- [ ] 最後成功更新時間、資料筆數與錯誤紀錄可供查詢。
- [ ] Rollback 流程已實際演練。
- [ ] Live URL 完成部署後 Smoke Test。

## 9. 建議執行順序

```text
P0-01 憑證安全
   ↓
P0-02 正式資料架構
   ↓
P0-03 更新入口保護
   ↓
P0-04 原子更新與資料驗證
   ↓
P0-05 API 與錯誤處理
   ↓
P1-01 縣市資料模型
   ↓
P0-06 Lint／TypeScript／Build
   ↓
P1-02～P1-05 前端、效能、測試與維運
   ↓
P1-06 Staging 驗收與 Rollback 演練
   ↓
Live 發布
```

## 10. 變更紀錄

| 日期 | 變更內容 | 進度影響 |
|---|---|---|
| 2026-09-22 | 新增 GitHub Actions 每小時 CWA → Neon 排程、單工 concurrency、HTTP 與筆數成功條件；GitHub `CRON_SECRET` 已安全設定；[首次手動執行](https://github.com/iloveu-tw/0921_TW_weather_site/actions/runs/35695727766) 成功同步 876 筆 | 排程端到端驗證完成；Neon 健康狀態正常，Vercel Production 部署成功 |
| 2026-09-22 | 修正縣市邊界圖層攔截測站點擊；加入 12 px 鄰近測站判定並移除空白焦點框，Test／Lint／TypeScript／Build 與使用者手動測試均通過 | 使用者授權合併 `main` 並推送 GitHub |
| 2026-09-22 | 完成 P1-05 最終 Test／Lint／TypeScript／Build、資料庫與 CWA 受控失敗保留、成功回復、UI 7／7、健康查詢及文件一致性驗證 | P1-05 完成；等待 Preview 確認與合併決策後進入 P1-06 |
| 2026-09-22 | 安裝 Vercel GitHub App 並連結 `iloveu-tw/0921_TW_weather_site`；Production Branch 為 `main`，自動建立 Deployment 已啟用 | 後續 `main` Push 將自動部署 Production，其他分支／PR 建立 Preview |
| 2026-09-22 | 將 P1-05 測試、健康查詢與維運文件備份至 `codex/p1-05-testing-ops`／`edf1711`；Preview Build Ready | P1-05 維持進行中，尚未合併至 `main` |
| 2026-09-22 | 建立 Vercel 專案並設定 Preview／Production 機密環境變數；首次部署自動成為 Production，基本 Smoke Check 通過 | Live 網站已可存取；P1-05、P1-06 完整驗收及 GitHub 自動部署仍待完成 |
| 2026-09-22 | 修正 375 px 版面裁切與表格捲動，補齊排序、地圖控制、表單標籤、Focus、ARIA 狀態及 Reduced Motion；完成各狀態受控驗證 | P1-04 完成，可以進入 P1-05 |
| 2026-09-22 | Marker 改用單一 Canvas、指標原地更新與 LayerGroup；完成桌面／375px 效能、Fly-to／Popup 及 HTML 注入測試 | P1-03 完成，可以進入 P1-04 |
| 2026-09-22 | 分離 CWA 觀測時間與 Neon 同步時間，加入 120 分鐘 stale 判定及 Header 最新／過期狀態 | P1-02 完成，可以進入 P1-03 |
| 2026-09-22 | 完成 county／town Schema、CWA 解析、876 筆原子同步、NOT NULL、22 縣市與離島回歸，前端改為精確欄位篩選 | P1-01 完成，可以進入 P1-02 |
| 2026-09-22 | P1-01 完成 CWA 縣市／鄉鎮完整率與離島筆數唯讀盤點；尚未變更資料模型 | 依使用者指示暫停，等待「繼續」後由安全停點恢復 |
| 2026-09-22 | 修正 Leaflet 型別、排序變數與 Next.js 字型載入；Lint、TypeScript、Build、首頁及 API 回歸全部通過 | P0-06 完成，所有可由程式碼處理的 P0 項目已完成 |
| 2026-09-22 | 統一 `/api/weather` 成功／錯誤 Schema，資料庫失敗安全回覆 503，首頁加入 Loading／Empty／Error／Retry 狀態 | P0-05 完成；ESLint 降至 4 errors、1 warning，可以進入 P0-06 |
| 2026-09-22 | 完成 CWA Node.js 擷取、快照驗證、Neon Transaction 原子替換、同步紀錄及成功／失敗復原測試 | P0-04 完成，可以進入 P0-05 |
| 2026-09-22 | 依 CWA 後台明文規則確認更新授權碼後舊值永久失效，撤回先前 HTTP 狀態碼造成的過度保守判定 | P0-01 完成，不再列為 Live 阻擋項目 |
| 2026-09-22 | 移除公開同步按鈕，完成 `CRON_SECRET` 驗證、Neon 租約鎖、60 秒上限及 401／200／409 HTTP 測試 | P0-03 完成，可以進入 P0-04 |
| 2026-09-22 | 完成 876 筆 Neon 原子遷移、API 與重啟持久性驗證；移除 Runtime SQLite 依賴並保留原始 DB | P0-02 完成，可以進入 P0-03 |
| 2026-09-21 | 完成 Neon 過渡資料層、Schema 與原子遷移工具；本地 SQLite 回歸與 Build 通過，等待 Development `DATABASE_URL` | P0-02 改為受阻，尚未移除 SQLite 或進入 P0-03 |
| 2026-09-21 | 依使用者指示進入 P0-02；完成 Vercel 正式資料架構評估，建議使用 Marketplace Neon PostgreSQL | P0-02 改為進行中，等待供應商決策；P0-01 仍為上線阻擋風險 |
| 2026-09-21 | 完成 6 個 commits 的 Git 歷史改寫及 `--force-with-lease` 推送；本地與遠端掃描通過，但舊 Key 仍可使用 | P0-01 改為受阻，等待 CWA 停用舊 Key |
| 2026-09-21 | 新 CWA Key 已存入本機 `.env`，單筆唯讀 API 驗證成功；未將實際值寫入追蹤文件 | P0-01 維持進行中，等待舊 Key 停用及歷史清理 |
| 2026-09-21 | P0-01 目前版本去敏完成；確認 Git 歷史仍含舊值，等待 Key 輪替與歷史清理 | P0-01 改為進行中，尚未進入 P0-02 |
| 2026-09-21 | 建立 Live 上線前改善與進度追蹤文件，填入唯讀盤點基準、P0／P1／P2 任務及驗收條件 | 建立追蹤基準，尚未修改程式碼 |

## 11. Token Reset 後續作交接

### 安全停點

- 目前工作分支：`main`
- Production 功能基準 Commit：`ff9bcbb`，網址：<https://taiwan-weather-site.vercel.app>
- 備份分支：`codex/p1-05-testing-ops`，遠端 HEAD 為 `ff9bcbb`。
- 使用者已手動確認地圖修正；Vercel Production Deployment 與 GitHub Actions 每小時同步均已驗證成功。
- Vercel 已連結 GitHub Repository `iloveu-tw/0921_TW_weather_site`，Production Branch 為 `main`；Preview／Production 已設定 `DATABASE_URL`、`CWA_API_KEY`、`CRON_SECRET`，文件不保存實際值。
- GitHub Actions `CRON_SECRET` 已設定；每小時整點排程已啟用，首次手動執行成功同步 876 筆。

### 續作順序

1. 下一階段為 P1-06 Staging、跨瀏覽器、attribution 與 Rollback 演練。
2. 每小時排程異常時，先查看 GitHub Actions Run，再依 `OPERATIONS.md` 判讀 Neon 與 CWA 錯誤。
3. 修改正式功能前建立 `codex/` 分支；未經使用者確認不要再次直接 Push `main`。
