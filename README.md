# AIoT DIC-2 — 台灣即時氣象空間資訊系統 (CWA Weather GIS)

> 以交通部中央氣象署（CWA）Open Data 為資料來源，建立可儲存氣象資料、在台灣 GIS 地圖上空間視覺化，並具備自動部署能力之全端 Web GIS 專案。

| 項目 | 目前狀態 |
|---|---|
| **服務狀態** | 🟢 [Vercel Production](https://taiwan-weather-site.vercel.app) |
| **資料來源** | CWA Open Data |
| **更新頻率** | GitHub Actions 每小時整點同步 |
| **正式資料庫** | Neon Serverless PostgreSQL |
| **Web GIS** | Next.js + Leaflet + GeoJSON |
| **部署流程** | GitHub `main` → Vercel Production |

> 原始 SQLite 僅保留於本機作為遷移來源，Live Runtime 不再讀取 SQLite。

---

## 🖥️ Live Demo 與介面預覽

### [▶ 開啟 Taiwan Weather GIS Live Demo](https://taiwan-weather-site.vercel.app)

[![台灣即時氣象 GIS 觀測圖台預覽，包含全台測站地圖、氣象統計卡與詳細資料表](./public/taiwan-weather-dashboard.png)](https://taiwan-weather-site.vercel.app)

進入網站後可以：

- 在地圖上縮放台灣、切換底圖與縣市邊界，並點擊測站查看即時氣象資訊。
- 搜尋測站名稱或站號、依縣市篩選，並排序氣溫、雨量、濕度與風速。
- 從右側資料表定位測站，地圖會移動至該位置並開啟詳細資訊視窗。

> **資料更新狀態**：Live 網站從 Neon PostgreSQL 讀取最新成功同步的 CWA 快照；GitHub Actions 每小時整點觸發更新，同步失敗時會保留前一份有效快照。

---

## 🌟 系統亮點與功能

- **台灣 Web GIS 底圖圖台**：以 Leaflet.js 搭配 Esri 深色／衛星底圖及 OpenStreetMap，支援流暢平移、縮放與全島視野復位。
- **全台 800+ 氣象測站即時視覺化**：從 Neon PostgreSQL 讀取 876 座測站並精確定位，支援「**氣溫分布**」與「**降雨分布**」雙模式動態分色。
- **台灣 22 縣市行政區圖層**：疊加台灣縣市界線 GeoJSON 多邊形圖層，支援邊框發光、懸停高亮（Hover Highlight）與縣市名稱標籤。
- **空間彈窗（Glassmorphism Popup）**：點擊任一測站標記即展開氣溫、雨量、相對濕度、風速與觀測時間之卡片。
- **資料檢索與飛入定位（Fly-to Sync）**：
  - 支援關鍵字搜尋（測站名稱、站號）與縣市下拉式即時篩選。
  - 支援氣溫、雨量、濕度升降冪排序。
  - 點擊表格內任一測站定位圖示，地圖將平滑飛至該測站並自動展開空間彈窗。
- **全台氣象概況統計卡**：即時計算並展示在線測站總數、全台最高溫測站、全台最低溫測站、即時最大累積降雨測站與平均相對濕度。
- **受保護的資料同步**：Server-to-Server `/api/refresh` 以 `CRON_SECRET`、Neon 租約鎖、資料驗證與 PostgreSQL Transaction 安全更新最新快照；前端不公開同步控制。
- **每小時自動更新**：GitHub Actions 每小時整點呼叫正式站同步入口，並在 HTTP 或資料筆數異常時將工作標記為失敗。

---

## 🏗️ 系統架構與資料流

[![台灣即時氣象 GIS 資料同步、服務與部署流程圖](./public/taiwan-weather-project-flow.png)](https://taiwan-weather-site.vercel.app/taiwan-weather-project-flow.html)

> 點擊流程圖可開啟互動版本，支援亮／暗主題、搜尋、節點聚焦、路徑追蹤、縮放與匯出。

- **綠色主線**：CWA 觀測資料經安全入口、驗證管線與 PostgreSQL Transaction 寫入 Neon，再由 Web GIS 查詢最新有效快照。
- **紅色安全線**：GitHub Actions 每小時使用 `CRON_SECRET` 呼叫 `/api/refresh`，Neon 租約鎖避免重複同步。
- **紫色維運／發布線**：同步健康狀態可獨立檢查；`main` Push 會觸發 Vercel Production 自動部署。

---

## 🔄 自動化工作流程與資料新鮮度

### 氣象資料同步

```text
CWA Open Data → GitHub Actions → /api/refresh → 資料驗證 → Neon PostgreSQL → Web GIS
```

- GitHub Actions 每小時整點使用 `CRON_SECRET` 呼叫受保護的同步入口。
- 系統驗證測站數量、站號唯一性、座標及觀測時間後，才以 Transaction 更新快照。
- 同步失敗不會覆蓋既有資料，Live 網站會繼續提供上一份有效快照。

### 程式部署

```text
Developer → Git Push → GitHub main → Vercel Build → Production
```

資料同步與程式部署是兩條獨立流程；每小時更新氣象資料不會重新部署網站。

### Data Freshness

- **同步頻率**：每小時整點觸發一次。
- **前端資料**：顯示 Neon 中最新成功同步的完整快照。
- **失敗策略**：保留上一份有效資料，避免不完整資料取代正式快照。
- **時間定義**：觀測時間以 CWA 回傳值為準，因此可能與目前時間不同。

---

## 🛠️ 技術堆疊

- **前端框架**：Next.js 16 (Turbopack, App Router) + TypeScript + React 19
- **GIS 地圖引擎**：Leaflet.js + Esri／OpenStreetMap + GeoJSON
- **使用者介面**：原生 Vanilla CSS（現代深色模式、玻璃擬態 Glassmorphism、響應式排版、Google Fonts: Inter & Outfit）
- **後端資料庫**：Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **資料擷取管線**：Next.js Route Handler + CWA JSON 正規化、資料驗證與原子 Transaction
- **版本控制與部署**：Git / GitHub / Vercel

---

## 🔌 API Routes

| Route | Method | 用途 | 存取方式 |
|---|---|---|---|
| `/api/weather` | `GET` | 取得最新成功同步的氣象快照與新鮮度資訊 | Public |
| `/api/refresh` | `GET` / `POST` | 從 CWA 同步、驗證並更新 Neon 快照 | Bearer `CRON_SECRET` |

`/api/refresh` 僅供 Server-to-Server 排程使用，不應從瀏覽器前端呼叫或公開 Secret。

---

## 📁 專案結構

```text
app/                  # Next.js 頁面與 API Route Handlers
components/           # 地圖、統計卡、資料表與頁首元件
lib/                  # CWA 同步、驗證、資料庫與畫面資料邏輯
database/             # PostgreSQL Schema 與 Migration
tests/                # Node.js 核心行為測試
public/geo/            # 台灣縣市邊界 GeoJSON
scripts/              # 維運狀態檢查與本機輔助工具
docs/architecture/    # 可驗證的系統流程圖規格
```

---

## 🚀 本地快速啟動

### 環境需求

- Node.js 24（Production Build 與原生 TypeScript 測試已驗證）
- CWA Open Data API Key
- Neon PostgreSQL 連線字串與至少 32 字元的排程 Secret

### 1. Clone Repository

```bash
git clone https://github.com/iloveu-tw/0921_TW_weather_site.git
cd 0921_TW_weather_site
```

### 2. 安裝依賴套件

```bash
npm install
```

### 3. 配置環境變數

從安全範本建立本機 `.env`，再填入自己的機密值：

```bash
cp .env.example .env
```

```env
CWA_API_KEY=your_cwa_api_key_here
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
CRON_SECRET=replace_with_a_random_secret_at_least_32_characters
```

`.env.example` 可提交至版本庫；`.env` 包含真實機密資訊，已由 `.gitignore` 排除，請勿 Commit。

### 4. 啟動 Web GIS 伺服器
```bash
npm run dev
```
瀏覽器開啟 [http://localhost:3000](http://localhost:3000) 即可開始使用！

### 5. 測試與維運狀態

```bash
npm test
npm run ops:status
```

`npm test` 主要驗證：

- CWA Payload 正規化與缺測值轉換。
- 測站數量、站號唯一性、座標及觀測時間驗證。
- 120 分鐘資料新鮮度邊界。
- 氣象統計、搜尋、縣市篩選、排序與分頁。

同步故障判讀與 Neon 還原程序請見 [`OPERATIONS.md`](./OPERATIONS.md)。

---

## 📅 專案實作里程碑

- [x] **Phase 1 — CWA API**：驗證中央氣象署 Open Data API 連線與資料解析。
- [x] **Phase 2 — Database**：完成 876 筆 SQLite 原始資料驗證，並遷移至 Neon PostgreSQL 作為正式 Runtime 資料庫。
- [x] **Phase 3 — Local Taiwan Web GIS**：完成 Next.js + Leaflet 台灣氣象地圖圖台、縣市界線、即時圖表與空間檢索。
- [x] **Phase 4 — Git / GitHub**：版本控制建立，機敏檔案透過 `.gitignore` 嚴格保護，並推送至 GitHub 倉庫。
- [x] **Phase 5 — Vercel Deployment**：Production 上線並連結 GitHub 自動部署；GitHub Actions 每小時更新 CWA Live 資料。

---

## 🌦️ 資料來源與使用宣告

- 本專案為 AIoT DIC-2 教學專案。
- 氣象原始觀測資料來源：[交通部中央氣象署政府資料開放平台](https://opendata.cwa.gov.tw/)。
- 本專案為第三方教學實作，並非交通部中央氣象署官方產品。
- Repository 目前未提供獨立的開源授權檔；程式碼使用與再散布條件應由專案維護者另行決定。
