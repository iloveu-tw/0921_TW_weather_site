# AIoT DIC-2 — CWA Weather GIS 專案進度與工作交接文件 (HANDOVER.md)

> **專案全稱**：AIoT DIC-2 — 台灣即時氣象空間資訊系統 (CWA Weather GIS)  
> **建立日期**：2026-09-21  
> **GitHub 倉庫**：[https://github.com/iloveu-tw/0921_TW_weather_site](https://github.com/iloveu-tw/0921_TW_weather_site)  
> **目前分支**：`main`
> **本地開發伺服器**：`http://localhost:3000`  
> **Production**：<https://taiwan-weather-site.vercel.app>（`main` 自動部署）

> **資料架構更新（2026-09-22）**：網站 Runtime 已完成 Neon PostgreSQL 遷移並移除 SQLite 程式依賴；`data/weather.db` 僅保留為未追蹤的原始遷移來源。`/api/refresh` 已使用 `CRON_SECRET` 與 Neon 租約鎖保護，並完成 CWA 資料驗證、Transaction 原子更新及同步結果紀錄。GitHub Actions 每小時整點觸發 Live 同步，手動端到端驗證已成功更新 876 筆測站。

---

## 1. 專案定位與架構概述

本專案依據 [design.md](design.md) 設計規範建置，以交通部中央氣象署（CWA）Open Data 為資料源，落實「**API 擷取 $\rightarrow$ 資料庫存儲 $\rightarrow$ Web GIS 空間視覺化 $\rightarrow$ Git 版本管理 $\rightarrow$ Vercel 自動化部署**」之完整資料生命週期。

### 系統資料流向圖

```text
       ┌────────────────────────┐
       │   CWA Open Data API    │
       │   (O-A0001-001 JSON)   │
       └───────────┬────────────┘
                   │
                   ▼ (受保護的 /api/refresh)
       ┌────────────────────────┐
       │  Data Cleaning / ETL   │
       │  座標提取、異常值(-99)清洗│
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │    Neon PostgreSQL     │
       │ 快照、同步紀錄、租約鎖 │
       └───────────┬────────────┘
                   │
                   ▼ (Next.js Route Handlers: /api/weather)
       ┌────────────────────────┐
       │   Next.js 16 Web App   │
       │    (App Router 架構)    │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │   Taiwan Web GIS GUI   │
       │ Leaflet + Dark Theme   │
       │ 876 測站標記 / 縣市界線 │
       └────────────────────────┘
```

---

## 2. 已完成階段進度檢核（Milestones Done）

| 階段編號 | 階段名稱 | 核心實作內容與成果 | 驗收狀態 |
|---|---|---|:---:|
| **Phase 1** | **CWA API 資料串接** | • 串接氣象署自動氣象站資料集 `O-A0001-001`。<br>• 整合 Python `truststore` 機制，解決 macOS 環境下 Python 3.13 連線 CWA 憑證鏈問題。<br>• 成功解析全台測站、WGS84 經緯度、氣溫、雨量、濕度與風速，並妥善處理 `-99` 缺測異常值。 | ✅ 驗收通過 |
| **Phase 2** | **CWA Weather Database** | • 以本地 SQLite 完成原始 876 筆資料驗證。<br>• 遷移至 Neon PostgreSQL，正式 Runtime 不再依賴可寫入的本地檔案。<br>• 加入原子 Transaction、同步紀錄與租約鎖。 | ✅ 驗收通過 |
| **Phase 3** | **Local Taiwan Web GIS** | • 基於 **Next.js 16 (App Router) + TypeScript + Leaflet** 建置。<br>• **底圖圖台**：預設採用 Esri Dark Gray 深色畫布，無任何浮水印，支援放大、縮小、平移與一鍵全島復位。<br>• **三合一免 Key 底圖切換**：深色畫布、標準街道圖（OSM）、高解析度衛星影像。<br>• **台灣縣市圖層**：載入 22 縣市 GeoJSON 邊界，具備發光藍框、Hover 高亮與縣市名稱 Tooltip。<br>• **876 測站空間視覺化**：支援「氣溫分布」與「雨量分布」動態色階標記切換。<br>• **空間彈窗（Popup）**：點擊 Marker 呈現高質感深色玻璃擬態氣象卡片。<br>• **連動檢索表格**：即時關鍵字搜尋、縣市篩選、指標排序，點擊「定位」按鈕地圖即平滑飛入（Fly-to）該站並自動彈窗。<br>• **即時統計概況**：5 大即時 KPI 統計卡（在線測站、極值氣溫、最大降雨、平均濕度）。 | ✅ 驗收通過（瀏覽器預覽已確認） |
| **Phase 4** | **Git / GitHub 版本控制** | • 初始化 Git 並綁定遠端倉庫 `https://github.com/iloveu-tw/0921_TW_weather_site`。<br>• 嚴格配置 `.gitignore`，隔絕真實金鑰 `.env` 與本地 SQLite 檔案。<br>• 設置 GitHub 匿名電子郵件避免隱私阻擋，各階段變更均已推送至 `origin/main`。 | ✅ 驗收通過 |

---

## 3. 專案核心目錄與模組職責說明

```text
taiwan-weather-site/
├── .github/workflows/
│   └── sync-cwa.yml           # 每小時觸發 Production CWA → Neon 同步
├── .env                       # 機敏環境變數 (含 CWA_API_KEY，受 .gitignore 保護)
├── .env.example               # 開源環境變數範本
├── .gitignore                 # 版本控制忽略清單 (排除 node_modules, data/, *.db, .env 等)
├── HANDOVER.md                # 本專案交接與進度備忘記錄檔
├── README.md                  # 專案官方說明文件
├── design.md                  # 24 堂課 AIoT DIC-2 完整專案設計規範
├── next.config.ts             # Next.js 設定
├── package.json               # 專案依賴與執行腳本 (Next.js 16, React 19, Leaflet, Lucide)
├── tsconfig.json              # TypeScript 編譯設定檔
│
├── app/                       # Next.js App Router
│   ├── globals.css            # 全域深色玻璃擬態 (Glassmorphism) 現代設計系統樣式表
│   ├── layout.tsx             # 根版面配置 (SEO 中繼資料、Google Fonts: Inter & Outfit)
│   ├── page.tsx               # Web GIS 核心主儀表板頁面
│   └── api/
│       ├── weather/route.ts   # 氣象資料讀取 API (從 Neon PostgreSQL 回傳觀測值)
│       └── refresh/route.ts   # 受保護的 CWA → Neon 原子同步入口
│
├── components/                # 前端核心 React UI 元件
│   ├── Header.tsx             # 頂部標題列與資料連線狀態指示
│   ├── WeatherMap.tsx         # Leaflet Web GIS 圖台 (底圖切換、縣市圖層、876 站點、Popup、Fly-to)
│   ├── WeatherStats.tsx       # 5 大氣象關鍵統計指標卡片 (最高溫、最低溫、最大降雨等)
│   └── WeatherTable.tsx       # 測站數據清單 (搜尋、縣市篩選、排序、分頁與地圖飛入連動)
│
├── data/
│   └── weather.db             # 本地 SQLite 資料庫 (存放 weather_observations 資料表，已 .gitignore)
│
├── lib/
│   ├── database.ts            # Neon PostgreSQL 查詢、Transaction 與同步紀錄
│   ├── weather-sync.ts        # CWA 擷取與同步流程
│   ├── weather-validation.ts  # 快照欄位、筆數、唯一性與合理範圍驗證
│   └── weather-view.ts        # 統計、搜尋、排序與分頁純函式
│
├── public/
│   └── geo/
│       └── taiwan-counties.geojson # 台灣 22 縣市行政區邊界向量圖資
│
├── scripts/
│   ├── check_sync_status.mjs  # Neon 快照與最近同步健康檢查
│   └── fetch_weather.py       # 舊版 SQLite 擷取工具，僅供原始資料追溯
│
├── tests/
│   └── weather-core.test.mjs  # 驗證、時效、統計、搜尋、排序與分頁測試
│
└── types/
    └── weather.ts             # 氣象資料結構 TypeScript 型別定義
```

---

## 4. 本地開發與快速啟動指引

### 4.1 環境依賴
* **Node.js**：v24（目前環境為 Node.js v24.21.0）
* **中央氣象署 API 金鑰**：需已取得 CWA API Key
* **Neon PostgreSQL**：需設定 `DATABASE_URL`
* **同步驗證**：需設定至少 32 字元的 `CRON_SECRET`

### 4.2 本地啟動三步驟
1. **安裝前端依賴**：
   ```bash
   npm install
   ```
2. **執行測試與 Neon 健康檢查**：
   ```bash
   npm test
   npm run ops:status
   ```
3. **啟動 Web GIS 伺服器**：
   ```bash
   npm run dev
   ```
   瀏覽器造訪 **`http://localhost:3000`** 即可預覽。

---

## 5. 重要技術細節與避坑備忘（Gotchas & Best Practices）

1. **CARTO 底圖 API Key 浮水印問題**：
   * **問題**：CARTO 官方於 2026 年 8 月底變更光柵圖磚政策，未帶 key 之請求會被強制覆蓋「API Key required」滿版浮水印。
   * **解法**：已全面切換為免 Key、零浮水印的 **Esri World Dark Gray Canvas** 與 **OpenStreetMap**，並提供三合一底圖切換功能。
2. **React 19 / 18 StrictMode 下 Leaflet 重複初始化**：
   * **問題**：開發模式下 `useEffect` 會執行兩次，非同步 `import('leaflet')` 會導致 `Error: Map container is already initialized`。
   * **解法**：在 `components/WeatherMap.tsx` 內加入 `isCancelled` 旗標與 DOM 節點 `_leaflet_id` 防禦判斷，確保容器生命週期唯一。
3. **同步與復原**：
   * 前端沒有手動同步按鈕；`/api/refresh` 僅接受帶 `CRON_SECRET` 的 Server-to-Server 請求。
   * 同步失敗會保留上一份有效資料；故障判讀與 Neon Point-in-Time Restore 步驟見 `OPERATIONS.md`。
4. **機敏資訊保護**：
   * 本機真實金鑰存於 `.env`，已由 `.gitignore` 隔離；推送到 GitHub 的僅有範本檔 `.env.example`。

---

## 6. 後續待處理事項與推展方向（Next Steps）

交接後可依專案需求選擇以下任一方向繼續推進：

### 🎯 方向 A：完成 Live 維運驗收
* **目前狀態**：Vercel Production、Neon PostgreSQL、GitHub 自動部署及機密環境變數均已完成設定。
* **待處理工作**：
  1. 完成 P1-05 受控失敗、API／UI 回歸與維運文件驗收。
  2. 完成 P1-06 Staging、跨瀏覽器、圖資 attribution 與 Rollback 演練。
  3. 確認 Vercel 方案與更新頻率後，建立受 `CRON_SECRET` 保護的 CWA Live 排程。

---

### 🎨 方向 B：深化 Phase 3 空間資訊圖層與功能擴充（GIS 視覺化升級）
* **目標**：依據設計文件第 18 節「後續可擴充功能」，讓 GIS 圖台更加專業豐富。
* **待處理工作**：
  1. **中央氣象署雷達回波圖層（Radar Layer）**：
     * 串接氣象署即時雷達回波圖（WMS 或透明 PNG 覆蓋圖層），提供「即時降雨雲系」圖層開關。
  2. **測站氣象趨勢圖表（Charts / Time-series）**：
     * 點擊測站彈窗或抽屜視窗，以折線圖展示該站 24 小時溫度變化或降雨趨勢。
  3. **紫外線與風向指針**：
     * 將測站風速風向轉化為旋轉指針標記，並標示紫外線指數（UV Index）。
  4. **行動裝置 Responsive UI 體驗優化**：
     * 針對手機與平板螢幕，支援地圖與表格滑動抽屜（Bottom Sheet）切換模式。
