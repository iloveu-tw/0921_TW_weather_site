# AIoT DIC-2 — 台灣即時氣象空間資訊系統 (CWA Weather GIS)

> 以交通部中央氣象署（CWA）Open Data 為資料來源，建立可儲存氣象資料、在台灣 GIS 地圖上空間視覺化，並具備自動部署能力之全端 Web GIS 專案。

> **資料架構更新（2026-09-22）**：網站 Runtime 已改為讀取 Neon PostgreSQL；原始 SQLite 檔案僅保留於本機作為遷移來源與復原依據。自動同步流程將於 P0-03 改為受保護的雲端端點，目前 Live 部署尚未開始。

---

## 🌟 系統亮點與功能

- **台灣 Web GIS 底圖圖台**：以 Leaflet.js 搭配 CartoDB Dark Matter 深色圖資，流暢平移（Pan）與縮放（Zoom），預設以台灣全島為中心視野。
- **全台 800+ 氣象測站即時視覺化**：自 SQLite 讀取 876 座測站經緯度精確定位，支援「**氣溫分布**」與「**降雨分布**」雙模式動態分色。
- **台灣 22 縣市行政區圖層**：疊加台灣縣市界線 GeoJSON 多邊形圖層，支援邊框發光、懸停高亮（Hover Highlight）與縣市名稱標籤。
- **空間彈窗（Glassmorphism Popup）**：點擊任一測站標記即展開氣溫、雨量、相對濕度、風速與觀測時間之卡片。
- **資料檢索與飛入定位（Fly-to Sync）**：
  - 支援關鍵字搜尋（測站名稱、站號）與縣市下拉式即時篩選。
  - 支援氣溫、雨量、濕度升降冪排序。
  - 點擊表格內任一測站定位圖示，地圖將平滑飛至該測站並自動展開空間彈窗。
- **全台氣象概況統計卡**：即時計算並展示在線測站總數、全台最高溫測站、全台最低溫測站、即時最大累積降雨測站與平均相對濕度。
- **一鍵式資料即時同步**：前端介面可一鍵觸發後端 Python 擷取管線，重新向 CWA Open Data API 拉取最新觀測資料並更新至本地 SQLite 資料庫。

---

## 🏗️ 系統架構與資料流

```text
       ┌────────────────────────┐
       │   CWA Open Data API    │
       │   (O-A0001-001 JSON)   │
       └───────────┬────────────┘
                   │
                   ▼ (scripts/fetch_weather.py)
       ┌────────────────────────┐
       │  Data Cleaning / ETL   │
       │   資料清洗與正規化處理   │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │     Local Database     │
       │     SQLite 關聯儲存    │
       │   (data/weather.db)    │
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
- **GIS 地圖引擎**：Leaflet.js + CartoDB Dark Tiles + GeoJSON
- **使用者介面**：原生 Vanilla CSS（現代深色模式、玻璃擬態 Glassmorphism、響應式排版、Google Fonts: Inter & Outfit）
- **後端資料庫**：SQLite (`data/weather.db`) + `better-sqlite3`
- **資料擷取管線**：Python 3 (`scripts/fetch_weather.py`) + `truststore` SSL 憑證保護
- **版本控制與部署**：Git / GitHub / Vercel

---

## 🚀 本地快速啟動

### 1. 環境需求
- Node.js 18+ (建議 v20 或 v24)
- Python 3.10+
- CWA Open Data API Key

### 2. 安裝依賴套件
```bash
npm install
```

### 3. 配置環境變數
在專案根目錄建立 `.env` 檔案並填入您的 CWA API 金鑰：
```env
CWA_API_KEY=your_cwa_api_key_here
```

### 4. 擷取初始氣象資料至 SQLite
```bash
python3 scripts/fetch_weather.py
```

### 5. 啟動 Web GIS 伺服器
```bash
npm run dev
```
瀏覽器開啟 [http://localhost:3000](http://localhost:3000) 即可開始使用！

---

## 📅 專案開發階段里程碑 (Progress)

- [x] **Phase 1 — CWA API**：驗證中央氣象署 Open Data API 連線與資料解析。
- [x] **Phase 2 — Database**：建立 SQLite `weather.db` 資料庫與 `weather_observations` 資料表，完成 876 筆站點入庫與查詢驗證。
- [x] **Phase 3 — Local Taiwan Web GIS**：完成 Next.js + Leaflet 台灣氣象地圖圖台、縣市界線、即時圖表與空間檢索。
- [x] **Phase 4 — Git / GitHub**：版本控制建立，機敏檔案透過 `.gitignore` 嚴格保護，並推送至 GitHub 倉庫。
- [ ] **Phase 5 — Vercel Deployment**：線上雲端部署與自動化 CI/CD 發布。

---

## 📄 授權與宣告
本專案為 AIoT DIC-2 教學專案。氣象原始觀測資料來源為「交通部中央氣象署政府資料開放平台」。
