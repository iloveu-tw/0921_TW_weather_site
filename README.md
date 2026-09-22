# AIoT DIC-2 — 台灣即時氣象空間資訊系統 (CWA Weather GIS)

> 以交通部中央氣象署（CWA）Open Data 為資料來源，建立可儲存氣象資料、在台灣 GIS 地圖上空間視覺化，並具備自動部署能力之全端 Web GIS 專案。

> **Live 狀態（2026-09-22）**：網站已部署至 [Vercel Production](https://taiwan-weather-site.vercel.app)，Runtime 使用 Neon PostgreSQL；原始 SQLite 僅保留於本機作為遷移來源。同步入口具備 `CRON_SECRET`、Neon 租約鎖、資料驗證及 Transaction，Live 排程尚未啟用。

---

## 🖥️ Live Demo 與介面預覽

### [▶ 開啟 Taiwan Weather GIS Live Demo](https://taiwan-weather-site.vercel.app)

[![台灣即時氣象 GIS 觀測圖台預覽，包含全台測站地圖、氣象統計卡與詳細資料表](./public/taiwan-weather-dashboard.png)](https://taiwan-weather-site.vercel.app)

進入網站後可以：

- 在地圖上縮放台灣、切換底圖與縣市邊界，並點擊測站查看即時氣象資訊。
- 搜尋測站名稱或站號、依縣市篩選，並排序氣溫、雨量、濕度與風速。
- 從右側資料表定位測站，地圖會移動至該位置並開啟詳細資訊視窗。

> **資料更新狀態**：Live 網站目前從 Neon PostgreSQL 讀取最新成功同步的 CWA 快照；受保護的手動同步與失敗復原已驗證，Vercel 定時自動更新排程尚未啟用。

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

---

## 🏗️ 系統架構與資料流

```text
       ┌────────────────────────┐
       │   CWA Open Data API    │
       │   (O-A0001-001 JSON)   │
       └───────────┬────────────┘
                   │
                   ▼ (受保護的 /api/refresh)
       ┌────────────────────────┐
       │  Data Cleaning / ETL   │
       │   資料清洗與正規化處理   │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │  Neon PostgreSQL       │
       │  原子快照與同步紀錄     │
       └───────────┬────────────┘
                   │
                   ▼ (Next.js Route Handlers: /api/weather)
       ┌────────────────────────┐
       │   Next.js 16 Web App   │
       │    App Router 架構     │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │   Taiwan Web GIS GUI   │
       │ Leaflet + Dark Theme   │
       │  Marker / Popup / Tab  │
       └────────────────────────┘
```

---

## 🛠️ 技術堆疊

- **前端框架**：Next.js 16 (Turbopack, App Router) + TypeScript + React 19
- **GIS 地圖引擎**：Leaflet.js + Esri／OpenStreetMap + GeoJSON
- **使用者介面**：原生 Vanilla CSS（現代深色模式、玻璃擬態 Glassmorphism、響應式排版、Google Fonts: Inter & Outfit）
- **後端資料庫**：Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **資料擷取管線**：Next.js Route Handler + CWA JSON 正規化、資料驗證與原子 Transaction
- **版本控制與部署**：Git / GitHub / Vercel

---

## 🚀 本地快速啟動

### 1. 環境需求
- Node.js 24（Production Build 與原生 TypeScript 測試已驗證）
- CWA Open Data API Key
- Neon PostgreSQL 連線字串與至少 32 字元的排程 Secret

### 2. 安裝依賴套件
```bash
npm install
```

### 3. 配置環境變數
在專案根目錄建立 `.env` 檔案：
```env
CWA_API_KEY=your_cwa_api_key_here
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
CRON_SECRET=replace_with_a_random_secret_at_least_32_characters
```

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

同步故障判讀與 Neon 還原程序請見 [`OPERATIONS.md`](./OPERATIONS.md)。

---

## 📅 專案開發階段里程碑 (Progress)

- [x] **Phase 1 — CWA API**：驗證中央氣象署 Open Data API 連線與資料解析。
- [x] **Phase 2 — Database**：完成 876 筆 SQLite 原始資料驗證，並遷移至 Neon PostgreSQL 作為正式 Runtime 資料庫。
- [x] **Phase 3 — Local Taiwan Web GIS**：完成 Next.js + Leaflet 台灣氣象地圖圖台、縣市界線、即時圖表與空間檢索。
- [x] **Phase 4 — Git / GitHub**：版本控制建立，機敏檔案透過 `.gitignore` 嚴格保護，並推送至 GitHub 倉庫。
- [x] **Phase 5 — Vercel Deployment**：Production 上線並連結 GitHub 自動部署；CWA Live 排程仍待設定。

---

## 📄 授權與宣告
本專案為 AIoT DIC-2 教學專案。氣象原始觀測資料來源為「交通部中央氣象署政府資料開放平台」。
