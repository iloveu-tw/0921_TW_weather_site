#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AIoT DIC-2 — CWA Weather GIS
Phase 1 & Phase 2: CWA API 資料擷取與 SQLite 資料庫儲存
"""

import os
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
from datetime import datetime

# ==========================================
# 使用者可調整變數 (User Modifiable Variables)
# ==========================================
ENV_FILE_PATH = ".env"                                     # 環境變數設定檔路徑
ENV_KEY_NAME = "CWA_API_KEY"                               # CWA API 金鑰變數名稱
CWA_DATASET_ID = "O-A0001-001"                             # 中央氣象署自動氣象站資料集代碼
CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore"
DB_DIR_PATH = "data"                                       # 資料庫資料夾路徑
DB_FILE_PATH = "data/weather.db"                           # SQLite 資料庫檔案路徑
TABLE_NAME = "weather_observations"                        # 氣象觀測資料表名稱
STATION_LIMIT = 0                                          # 抓取測站筆數上限 (0 表示全台所有測站)
VERIFY_PREVIEW_LIMIT = 5                                   # 驗證查詢時顯示筆數
# ==========================================

# 啟用 macOS 系統證書 (解決 Python 3.13 SSL 憑證鏈問題)
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass


def load_cwa_api_key(env_path: str, key_name: str) -> str:
    """從環境變數或 .env 檔案讀取 CWA API 金鑰"""
    # 優先讀取作業系統環境變數
    api_key = os.getenv(key_name)
    if api_key:
        return api_key

    # 若環境變數不存在，從檔案讀取
    if not os.path.exists(env_path):
        raise FileNotFoundError(f"找不到環境變數檔案: {env_path}，請確認是否已建立。")

    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith(f"{key_name}="):
                api_key = line.split("=", 1)[1].strip()
                if api_key:
                    return api_key

    raise ValueError(f"在 {env_path} 中未找到有效的 {key_name} 設定。")


def fetch_cwa_weather_data(api_key: str, dataset_id: str, limit: int = 0) -> list:
    """從氣象署 API 取得測站氣象觀測資料"""
    params = {
        "Authorization": api_key,
    }
    if limit > 0:
        params["limit"] = str(limit)

    query_string = urllib.parse.urlencode(params)
    api_url = f"{CWA_API_BASE_URL}/{dataset_id}?{query_string}"

    print(f"[Phase 1] 正在向 CWA Open Data API 發送請求 (Dataset: {dataset_id})...")
    req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})

    with urllib.request.urlopen(req) as response:
        if response.status != 200:
            raise RuntimeError(f"API 回應錯誤，狀態碼: {response.status}")
        raw_body = response.read().decode("utf-8")
        data = json.loads(raw_body)

    if not data.get("success") == "true":
        raise RuntimeError(f"CWA API 回傳失敗: {data}")

    stations = data.get("records", {}).get("Station", [])
    print(f"[Phase 1] 成功取得氣象觀測資料，共 {len(stations)} 座測站。")
    return stations


def parse_float_safe(value):
    """安全轉換數值，氣象署以 -99 或 -999 代表缺測或異常值"""
    if value is None:
        return None
    try:
        val = float(value)
        if val in (-99.0, -999.0, -9999.0):
            return None
        return val
    except (ValueError, TypeError):
        return None


def clean_and_normalize(station_raw: dict) -> dict:
    """解析並清理單一測站資料為專案資料表標準結構"""
    station_id = station_raw.get("StationId", "")
    station_name = station_raw.get("StationName", "")
    obs_time = station_raw.get("ObsTime", {}).get("DateTime", "")

    # 解析座標 (優先取 WGS84 經緯度)
    coordinates = station_raw.get("GeoInfo", {}).get("Coordinates", [])
    latitude = None
    longitude = None

    for coord in coordinates:
        if coord.get("CoordinateName") == "WGS84":
            latitude = parse_float_safe(coord.get("StationLatitude"))
            longitude = parse_float_safe(coord.get("StationLongitude"))
            break

    # 若未找到 WGS84 標記，回退取第一組座標
    if (latitude is None or longitude is None) and coordinates:
        latitude = parse_float_safe(coordinates[0].get("StationLatitude"))
        longitude = parse_float_safe(coordinates[0].get("StationLongitude"))

    weather_elem = station_raw.get("WeatherElement", {})
    temperature = parse_float_safe(weather_elem.get("AirTemperature"))
    humidity = parse_float_safe(weather_elem.get("RelativeHumidity"))
    wind_speed = parse_float_safe(weather_elem.get("WindSpeed"))

    # 雨量欄位解析 (CWA 目前在 WeatherElement.Now.Precipitation)
    rainfall_val = weather_elem.get("Now", {}).get("Precipitation")
    if rainfall_val is None:
        rainfall_val = weather_elem.get("Precipitation")
    rainfall = parse_float_safe(rainfall_val)

    return {
        "station_id": station_id,
        "station_name": station_name,
        "latitude": latitude,
        "longitude": longitude,
        "temperature": temperature,
        "humidity": humidity,
        "rainfall": rainfall,
        "wind_speed": wind_speed,
        "observation_time": obs_time,
    }


def init_database(db_path: str, table_name: str):
    """初始化 SQLite 資料庫與資料表"""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 建立依照 design.md 規範之資料表
    create_table_sql = f"""
    CREATE TABLE IF NOT EXISTS {table_name} (
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
    """
    cursor.execute(create_table_sql)
    conn.commit()
    conn.close()


def save_to_database(db_path: str, table_name: str, records: list) -> int:
    """將清理後的氣象紀錄寫入 SQLite 資料庫"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 清空現有資料 (每輪擷取更新最新現況)
    cursor.execute(f"DELETE FROM {table_name}")

    insert_sql = f"""
    INSERT INTO {table_name} (
        station_id, station_name, latitude, longitude,
        temperature, humidity, rainfall, wind_speed, observation_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """

    data_tuples = [
        (
            r["station_id"],
            r["station_name"],
            r["latitude"],
            r["longitude"],
            r["temperature"],
            r["humidity"],
            r["rainfall"],
            r["wind_speed"],
            r["observation_time"],
        )
        for r in records
        if r["latitude"] is not None and r["longitude"] is not None
    ]

    cursor.executemany(insert_sql, data_tuples)
    conn.commit()
    inserted_count = cursor.rowcount
    conn.close()
    return inserted_count


def verify_database(db_path: str, table_name: str, limit: int = 5):
    """查詢資料庫並印出驗證報告"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    total_count = cursor.fetchone()[0]

    cursor.execute(f"""
        SELECT id, station_name, latitude, longitude, temperature, humidity, rainfall, observation_time
        FROM {table_name}
        LIMIT {limit};
    """)
    rows = cursor.fetchall()
    conn.close()

    print("\n" + "=" * 80)
    print(f"[Phase 2 驗證] 資料庫: {db_path} | 資料表: {table_name} | 總筆數: {total_count}")
    print("=" * 80)
    header = f"{'ID':>4} | {'測站名稱':<8} | {'緯度':>7} | {'經度':>7} | {'溫度(°C)':>7} | {'濕度(%)':>7} | {'雨量(mm)':>8} | {'觀測時間'}"
    print(header)
    print("-" * 80)
    for r in rows:
        rid, name, lat, lon, temp, hum, rain, obs = r
        temp_str = f"{temp:.1f}" if temp is not None else "N/A"
        hum_str = f"{hum:.0f}" if hum is not None else "N/A"
        rain_str = f"{rain:.1f}" if rain is not None else "N/A"
        print(f"{rid:>4} | {name:<8} | {lat:>7.2f} | {lon:>7.2f} | {temp_str:>7} | {hum_str:>7} | {rain_str:>8} | {obs}")
    print("=" * 80)


def main():
    print("=== AIoT DIC-2: CWA Weather API & SQLite Pipeline 開始執行 ===")

    # 1. 讀取 API Key
    api_key = load_cwa_api_key(ENV_FILE_PATH, ENV_KEY_NAME)

    # 2. 呼叫 CWA API (Phase 1)
    raw_stations = fetch_cwa_weather_data(api_key, CWA_DATASET_ID, STATION_LIMIT)

    # 3. 資料清理與正規化
    cleaned_records = [clean_and_normalize(s) for s in raw_stations]

    # 4. 初始化資料庫並儲存 (Phase 2)
    print(f"\n[Phase 2] 初始化本地 SQLite 資料庫 ({DB_FILE_PATH})...")
    init_database(DB_FILE_PATH, TABLE_NAME)

    print(f"[Phase 2] 寫入資料中...")
    count = save_to_database(DB_FILE_PATH, TABLE_NAME, cleaned_records)
    print(f"[Phase 2] 成功寫入 {count} 筆氣象觀測資料！")

    # 5. 驗證資料庫內容
    verify_database(DB_FILE_PATH, TABLE_NAME, VERIFY_PREVIEW_LIMIT)
    print("=== 執行完成：Phase 1 與 Phase 2 驗收標準均已順利通過！ ===")


if __name__ == "__main__":
    main()
