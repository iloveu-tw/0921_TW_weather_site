# AIoT DIC-2 專案設計文件

## 1. 專案名稱

**AIoT DIC-2 — CWA Weather GIS**

以中央氣象署（CWA）Open Data 為資料來源，建立一個可儲存氣象資料、在台灣 GIS 地圖上視覺化，並透過 GitHub 與 Vercel 完成自動部署的 Web GIS 專案。

---

## 2. 專案目標

本專案的核心目標是建立一條完整且容易理解的開發流程：

```text
CWA API
   ↓
取得氣象資料
   ↓
資料整理
   ↓
儲存到 Database
   ↓
建立本地 GIS 台灣地圖網站
   ↓
將氣象資料顯示在 GIS 地圖
   ↓
上傳 GitHub
   ↓
連接 Vercel
   ↓
自動部署
```

專案完成後，應具備以下能力：

- 從 CWA Open Data API 取得氣象資料。
- 解析 CWA 回傳的 JSON。
- 將需要的氣象資料儲存到 Database。
- 建立本地 Web GIS 台灣地圖。
- 在地圖上顯示氣象站與天氣資訊。
- 使用 Git 管理程式版本。
- 將專案上傳至 GitHub。
- 將 GitHub Repository 連接 Vercel。
- 在 `git push` 後由 Vercel 自動重新部署。

---

## 3. 專案開發原則

### 3.1 初學者優先

整個專案按照「先資料、再 GIS、最後部署」的順序進行。

不在專案一開始同時加入太多技術，避免一次處理：

- API
- Database
- GIS
- Git
- GitHub
- Cloud Database
- Vercel

而造成學習負擔。

### 3.2 分階段驗證

每個階段都必須先確認成功，再進入下一階段。

例如：

```text
CWA API ✓
JSON ✓
Database ✓
GIS ✓
GitHub ✓
Vercel ✓
```

如果 GIS 沒有資料，就可以快速判斷問題是在 GIS，而不是 API 或 Database。

### 3.3 本地開發與正式環境分離

本地開發優先使用：

```text
SQLite
```

正式部署到 Vercel 時，改用：

```text
Cloud Database
```

原因是 Vercel 不適合把本機 SQLite 檔案當作正式線上持久化資料庫。

---

# 4. 專案整體 Workflow

```text
                  ┌────────────────────┐
                  │      CWA API       │
                  │   Open Data JSON   │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │ Data Processing    │
                  │ 解析 / 清理 / 整理 │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │     Database       │
                  │ Local: SQLite      │
                  │ Cloud: PostgreSQL  │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │   Web GIS App      │
                  │ Taiwan GIS Map     │
                  └─────────┬──────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        Weather Marker    Popup         Table
             │
             ▼
          GitHub
             │
             ▼
           Vercel
             │
             ▼
       Production Website
```

---

# 5. 五大開發階段

## Phase 1 — CWA API

### 5.1 學習目標

了解：

- 什麼是 Open Data
- 什麼是 API
- 什麼是 API Key
- 什麼是 Request
- 什麼是 Response
- 什麼是 JSON
- 如何找到適合的 CWA Dataset

### 5.2 Workflow

```text
申請 CWA API Key
        ↓
選擇 Dataset
        ↓
建立 API URL
        ↓
發送 Request
        ↓
取得 Response
        ↓
查看 JSON
```

## 5.3 目前使用的 CWA API Key

本專案目前使用的 CWA API Key：

```text
YOUR_CWA_API_KEY
```

本機開發時請放在：

```text
.env.local
```

內容：

```env
CWA_API_KEY=YOUR_CWA_API_KEY
```

> **安全提醒**
>
> 這組 API Key 屬於敏感憑證。正式使用時，不要把 `.env.local` 上傳到 GitHub，也不要把真實 API Key 寫進公開程式碼。
>
> 由於本文件目前已包含真實 API Key，如果 `design.md` 會放進公開 GitHub Repository，建議在上傳前把本節改成：
>
> ```env
> CWA_API_KEY=YOUR_CWA_API_KEY
> ```
>
> 並將真正的 Key 只保留在 `.env.local` 與 Vercel Environment Variables。


### 5.4 階段成功標準

必須確認：

```text
CWA API 可以呼叫               ✓
API Key 正常                    ✓
可以取得 JSON                   ✓
知道測站名稱欄位                 ✓
知道溫度欄位                     ✓
知道雨量欄位                     ✓
知道濕度欄位                     ✓
知道經緯度欄位                   ✓
```

---

# 6. Phase 2 — CWA Weather Database

## 6.1 目標

將 CWA API 的氣象資料整理後，儲存到自己的 Database。

### Workflow

```text
CWA API
   ↓
Raw JSON
   ↓
JSON Parsing
   ↓
Data Cleaning
   ↓
Data Normalization
   ↓
SQLite
```

---

## 6.2 不直接儲存全部 JSON

CWA 原始資料可能很複雜。

例如：

```json
{
  "StationName": "臺中",
  "GeoInfo": {
    "...": "..."
  },
  "WeatherElement": {
    "...": "..."
  }
}
```

我們只保留專案需要的欄位，例如：

```text
station_id
station_name
latitude
longitude
temperature
humidity
rainfall
wind_speed
observation_time
```

---

## 6.3 Local Database

第一版使用：

```text
SQLite
```

Database 檔案：

```text
weather.db
```

優點：

- 不需要額外 Database Server。
- 不需要 Username。
- 不需要 Password。
- 不需要 Port。
- 適合初學者。
- 適合本地開發與 SQL 學習。

---

## 6.4 Weather Table

初期可以建立：

```sql
CREATE TABLE weather_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id TEXT,
    station_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    temperature REAL,
    humidity REAL,
    rainfall REAL,
    wind_speed REAL,
    observation_time TEXT NOT NULL
);
```

---

## 6.5 Example Data

| id | station_name | latitude | longitude | temperature | humidity | rainfall |
|---:|---|---:|---:|---:|---:|---:|
| 1 | 臺北 | 25.03 | 121.56 | 27.1 | 78 | 0.0 |
| 2 | 臺中 | 24.15 | 120.67 | 29.2 | 72 | 0.5 |
| 3 | 高雄 | 22.63 | 120.30 | 30.1 | 74 | 1.0 |

---

## 6.6 Database 學習內容

需要理解：

```text
Database
Table
Row
Column
Primary Key
CREATE TABLE
INSERT
SELECT
UPDATE
DELETE
```

第一階段最重要的是：

```sql
INSERT
```

和：

```sql
SELECT
```

---

## 6.7 Database 驗證

確認：

```sql
SELECT * FROM weather_observations;
```

可以看到已經存入的 CWA 資料。

例如：

```text
臺北   27.1
臺中   29.2
高雄   30.1
```

才算 Phase 2 完成。

---

# 7. Phase 3 — Local Taiwan Web GIS

## 7.1 目標

建立一個在本地執行的 Web GIS 網站。

資料來源不再直接從 CWA 畫地圖，而是：

```text
Database
   ↓
Web Application
   ↓
GIS Map
```

---

## 7.2 GIS 基本概念

GIS：

```text
Geographic Information System
```

中文：

```text
地理資訊系統
```

它的核心概念是：

> 把資料和地理位置結合。

例如：

```text
臺中
溫度：29.2°C
```

只是一般資料。

加入：

```text
Latitude  = 24.15
Longitude = 120.67
```

就能把資料放到地圖的正確位置。

---

## 7.3 第一關：台灣底圖

先只完成：

```text
Taiwan Map
```

要求：

- 可以看到台灣。
- 可以放大。
- 可以縮小。
- 可以拖曳。

此時不要先加入氣象資料。

成功標準：

```text
Taiwan Base Map ✓
Zoom            ✓
Pan             ✓
```

---

## 7.4 第二關：測試 Marker

先手動加入一個測試點。

例如：

```text
臺中

Latitude  = 24.15
Longitude = 120.67
```

地圖：

```text
● 臺中
```

如果 Marker 顯示在正確位置：

```text
GIS Coordinate ✓
```

---

## 7.5 第三關：Database → GIS

開始從 Database 讀取氣象資料。

Workflow：

```text
SQLite
   ↓
SELECT
   ↓
Weather Data
   ↓
Latitude / Longitude
   ↓
GIS Marker
```

例如：

```text
        ● 臺北


     ● 臺中


       ● 高雄
```

---

## 7.6 Marker Popup

點擊氣象站：

```text
● 臺中
```

顯示：

```text
臺中

氣溫：29.2°C
濕度：72%
雨量：0.5 mm
風速：2.8 m/s

觀測時間：
2026-09-21 19:00
```

---

## 7.7 GeoJSON

GIS 專案需要理解 GeoJSON。

一般資料：

```json
{
  "name": "臺中",
  "temperature": 29.2
}
```

加入地理資訊後：

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [
      120.67,
      24.15
    ]
  },
  "properties": {
    "name": "臺中",
    "temperature": 29.2
  }
}
```

注意：

```text
GeoJSON Coordinates
=
[Longitude, Latitude]
=
[經度, 緯度]
```

不是：

```text
[緯度, 經度]
```

---

## 7.8 GIS 基本資料型態

### Point

```text
●
```

用途：

```text
氣象站
```

### Line

```text
──────────
```

用途：

```text
道路
河川
路徑
```

本專案第一版不一定需要。

### Polygon

```text
████████
```

用途：

```text
縣市行政區
```

---

## 7.9 Taiwan County Layer

加入台灣行政區 GeoJSON。

建立：

```text
Taiwan Base Map
      +
County Boundary
      +
Weather Stations
```

學生需要理解：

```text
GIS Layer
```

---

## 7.10 GIS Layer Concept

```text
Base Map
   │
   ├── County Layer
   ├── Weather Station Layer
   ├── Temperature Layer
   └── Rainfall Layer
```

---

## 7.11 Weather Visualization

可以讓不同氣象資料產生不同顯示方式。

例如：

```text
Temperature
   ↓
Marker Style
```

或：

```text
Rainfall
   ↓
Marker Style
```

初期重點不是漂亮顏色，而是理解：

> GIS 可以把數值資料轉換為空間視覺資訊。

---

## 7.12 Local Web GIS 第一版功能

本地網站最低需求：

```text
✓ 台灣底圖
✓ 台灣縣市行政區
✓ 氣象站 Marker
✓ 氣溫
✓ 雨量
✓ 濕度
✓ 風速
✓ Popup
✓ 地區選擇
✓ Weather Table
```

第一版不強制加入：

```text
AI
Authentication
Microservices
Docker
Kubernetes
```

---

# 8. Phase 4 — Git / GitHub

## 8.1 Git 與 GitHub 差異

Git：

```text
本機版本管理
```

GitHub：

```text
將 Git Repository 放到網路上
```

Workflow：

```text
Local Project
    ↓
git init
    ↓
git add
    ↓
git commit
    ↓
GitHub Repository
    ↓
git push
```

---

## 8.2 基本 Git Workflow

查看修改：

```bash
git status
```

加入修改：

```bash
git add .
```

建立版本：

```bash
git commit -m "Initial Taiwan Weather GIS"
```

上傳：

```bash
git push
```

---

## 8.3 Commit 建議

每完成一個功能就建立一次 Commit。

例如：

```text
feat: add CWA weather API

feat: add SQLite weather storage

feat: add Taiwan GIS map

feat: add weather markers

feat: add weather popup

feat: add county GeoJSON layer
```

---

## 8.4 Secrets

真正的 API Key 不可以上傳 GitHub。

例如：

```text
.env
.env.local
```

必須加入：

```text
.gitignore
```

GitHub 可以放：

```text
.env.example
```

例如：

```env
CWA_API_KEY=
DATABASE_URL=
```

本機真正的 CWA Key 則放在：

```env
CWA_API_KEY=YOUR_CWA_API_KEY
```

但這一行只應存在於 `.env.local`，不要 Commit 到公開 Repository。

但不能放真正的：

```env
CWA_API_KEY=CWA-XXXXXXXX
```

---

## 8.5 SQLite 與 GitHub

本地開發的：

```text
weather.db
```

原則上不建議當成正式 production database 上傳 GitHub。

正式環境改用：

```text
Cloud Database
```

---

# 9. Phase 4.5 — Cloud Database

## 9.1 為什麼需要 Cloud Database

本地開發：

```text
SQLite
```

正式部署：

```text
Vercel
```

Vercel 不應依賴本地：

```text
weather.db
```

作為正式持久化資料庫。

因此正式環境改成：

```text
Cloud PostgreSQL
```

---

## 9.2 Database Migration Concept

本地：

```text
CWA
 ↓
SQLite
```

正式環境：

```text
CWA
 ↓
Cloud Database
```

網站讀取方式：

```text
Web GIS
   ↓
Database
```

核心 SQL 概念不變。

---

## 9.3 Production Architecture

```text
                  CWA API
                     │
                     ▼
              Data Collector
                     │
                     ▼
            Cloud Database
                     │
                     ▼
             Web GIS App
                     │
                     ▼
                  Vercel
```

---

# 10. Phase 5 — Vercel Deployment

## 10.1 目標

將 GitHub Repository 連接 Vercel。

Workflow：

```text
Local
   ↓
Git Commit
   ↓
GitHub
   ↓
Vercel
   ↓
Build
   ↓
Deploy
   ↓
Production Website
```

---

## 10.2 Vercel Environment Variables

本機：

```text
.env.local
```

Vercel：

```text
Project
↓
Settings
↓
Environment Variables
```

需要設定：

```text
CWA_API_KEY
DATABASE_URL
```

---

## 10.3 Auto Deployment

專案完成後：

```text
修改程式
   ↓
git add .
   ↓
git commit
   ↓
git push
   ↓
GitHub
   ↓
Vercel 自動 Build
   ↓
Vercel 自動 Deploy
```

這就是 Software Deployment Workflow。

---

# 11. 兩條不同的自動化流程

這個專案必須區分兩種「自動」。

## 11.1 Software Auto Deployment

```text
Developer
   ↓
修改程式
   ↓
Git
   ↓
GitHub
   ↓
Vercel
   ↓
Production
```

這屬於：

```text
CI/CD
```

---

## 11.2 Weather Data Update

另一條是：

```text
CWA API
   ↓
定時執行
   ↓
取得最新氣象資料
   ↓
更新 Database
   ↓
GIS Website 顯示新資料
```

例如：

```text
每小時
   ↓
Fetch CWA
   ↓
INSERT / UPDATE Database
```

它和：

```text
git push
```

沒有直接關係。

---

# 12. 最終系統架構

```text
                         ┌────────────────────┐
                         │      CWA API       │
                         │     Open Data      │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │  Data Collector    │
                         │ Fetch / Parse      │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │  Cloud Database    │
                         │    PostgreSQL      │
                         └─────────┬──────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────┐
│                         Vercel                             │
│                                                            │
│                     Web GIS App                            │
│                                                            │
│      ┌──────────────────────────────────────────────┐      │
│      │            Taiwan GIS Map                  │      │
│      │                                              │      │
│      │   County Layer                              │      │
│      │   Weather Marker                           │      │
│      │   Popup                                    │      │
│      │   Weather Table                            │      │
│      └──────────────────────────────────────────────┘      │
│                                                            │
└────────────────────────────────────────────────────────────┘
                                   ▲
                                   │
                              Auto Deploy
                                   │
                            ┌───────┴───────┐
                            │    GitHub     │
                            └───────────────┘
```

---

# 13. 開發與部署架構比較

## Local Development

```text
CWA API
   ↓
Data Processing
   ↓
SQLite
   ↓
Local Web GIS
   ↓
localhost
```

---

## Production

```text
CWA API
   ↓
Data Processing
   ↓
Cloud Database
   ↓
Web GIS
   ↓
Vercel
```

---

# 14. 專案目錄建議

第一版專案可以維持簡單：

```text
taiwan-weather-gis/
│
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   │
│   └── api/
│       └── weather/
│           └── route.ts
│
├── components/
│   ├── WeatherMap.tsx
│   ├── WeatherPopup.tsx
│   └── WeatherTable.tsx
│
├── lib/
│   ├── cwa.ts
│   ├── database.ts
│   └── geojson.ts
│
├── data/
│   └── weather.db
│
├── public/
│   └── geo/
│       └── taiwan-counties.geojson
│
├── scripts/
│   └── fetch-weather.ts
│
├── types/
│   └── weather.ts
│
├── .env.local
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

不要一開始建立過多抽象層，例如：

```text
controllers/
repositories/
services/
microservices/
```

第一版不需要。

---

# 15. 24 堂 DIC-2 課程規劃

| 編號 | 課程主題 | 階段成果 |
|---:|---|---|
| 1 | DIC-2 專案介紹 | 理解整體架構 |
| 2 | CWA Open Data | 找到資料來源 |
| 3 | API 與 API Key | 理解 API 存取 |
| 4 | 取得 CWA JSON | 第一次取得資料 |
| 5 | JSON 結構分析 | 找到資料欄位 |
| 6 | 提取氣象資料 | 取得需要的欄位 |
| 7 | SQLite 入門 | 建立 Local Database |
| 8 | 建立 Weather Table | 建立資料表 |
| 9 | INSERT CWA 資料 | 寫入資料庫 |
| 10 | SQL 查詢 | SELECT Weather Data |
| 11 | GIS 基礎 | 理解 GIS |
| 12 | 經緯度與座標 | 理解 Spatial Data |
| 13 | 建立台灣地圖 | 顯示 Taiwan Map |
| 14 | Weather Marker | 顯示氣象站 |
| 15 | Popup 氣象資訊 | 點擊查看天氣 |
| 16 | GeoJSON | 了解 GIS Data Format |
| 17 | 台灣行政區 Layer | 顯示 County Polygon |
| 18 | 氣象 GIS 視覺化 | Weather + GIS |
| 19 | Weather Dashboard | 整合 Map / Table |
| 20 | 完成本地 Web GIS | Local MVP |
| 21 | Git / GitHub | Repository 上線 |
| 22 | Cloud Database | Production Database |
| 23 | Vercel 自動部署 | Production Deployment |
| 24 | 完整專案展示 | Final Project |

---

# 16. 每階段驗收標準

## Phase 1

```text
CWA API       ✓
API Key       ✓
JSON          ✓
Dataset       ✓
```

## Phase 2

```text
JSON Parsing  ✓
SQLite        ✓
INSERT        ✓
SELECT        ✓
```

## Phase 3

```text
Taiwan Map    ✓
Marker        ✓
Popup         ✓
GeoJSON       ✓
County Layer  ✓
Weather Data  ✓
```

## Phase 4

```text
Git           ✓
Commit        ✓
GitHub        ✓
Secrets Safe  ✓
```

## Phase 5

```text
Cloud DB      ✓
Vercel Build  ✓
Deploy        ✓
Auto Deploy   ✓
Production    ✓
```

---

# 17. 最終完成定義

當以下流程全部成立時，AIoT DIC-2 專案才算完成：

```text
CWA API
   ↓
取得 Weather JSON
   ↓
整理氣象資料
   ↓
寫入 Database
   ↓
查詢 Database
   ↓
GIS 取得資料
   ↓
台灣地圖顯示 Weather Marker
   ↓
點擊 Marker 顯示 Popup
   ↓
Git Commit
   ↓
GitHub
   ↓
Vercel
   ↓
公開網站
```

同時必須確認：

```text
✓ CWA API Key 沒有公開
✓ Database 資料正常
✓ GIS 座標正確
✓ Local Website 正常
✓ GitHub Repository 正常
✓ Vercel Build 成功
✓ Production Website 可使用
✓ git push 可觸發自動部署
```

---

# 18. 後續可擴充功能

以下功能不放入第一版 MVP，等核心專案完成後再增加：

```text
AI 天氣摘要
颱風 GIS
雨量熱區
雷達圖層
歷史氣象查詢
時間序列 Chart
IoT Sensor
自動排程更新 CWA
行動版 Responsive UI
PWA
使用者通知
```

原則：

> 先完成穩定的資料流與 GIS，再擴充 AI 與 IoT。

---

# 19. 專案核心觀念

整個 DIC-2 最重要的不是單一技術，而是理解完整的資料生命週期：

```text
資料從哪裡來
    ↓
如何取得
    ↓
如何整理
    ↓
存在哪裡
    ↓
如何查詢
    ↓
如何轉成 GIS
    ↓
如何顯示
    ↓
如何管理程式碼
    ↓
如何部署
```

最終形成：

```text
CWA Open Data
      ↓
Database
      ↓
GIS
      ↓
GitHub
      ↓
Vercel
```

這就是 **AIoT DIC-2 — CWA Weather GIS** 的核心設計。
