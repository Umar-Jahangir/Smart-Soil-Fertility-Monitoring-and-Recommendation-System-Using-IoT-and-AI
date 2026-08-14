import os
import requests

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

THINGSBOARD_URL = os.getenv(
    "THINGSBOARD_URL",
    "https://thingsboard.cloud"
)

THINGSBOARD_API_KEY = os.getenv("THINGSBOARD_API_KEY")

NODE1_DEVICE_ID = os.getenv("NODE1_DEVICE_ID")
NODE2_DEVICE_ID = os.getenv("NODE2_DEVICE_ID")


app = FastAPI(
    title="Smart Farm Soil Monitoring API",
    version="1.0.0"
)


# Allow the HTML dashboard running on localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


TELEMETRY_KEYS = [
    "moisture",
    "airTemperature",
    "airHumidity",
    "soilTemperature",
    "pH",
    "EC",
    "nitrogen",
    "phosphorus",
    "potassium"
]


def get_latest_telemetry(device_id):
    """
    Fetch latest telemetry values from ThingsBoard.
    """

    if not device_id:
        raise RuntimeError("Device ID is missing.")

    if not THINGSBOARD_API_KEY:
        raise RuntimeError("THINGSBOARD_API_KEY is missing.")

    keys = ",".join(TELEMETRY_KEYS)

    url = (
        f"{THINGSBOARD_URL}"
        f"/api/plugins/telemetry/DEVICE/"
        f"{device_id}/values/timeseries"
    )

    headers = {
        "X-Authorization": f"ApiKey {THINGSBOARD_API_KEY}"
    }

    params = {
        "keys": keys
    }

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=10
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"ThingsBoard returned HTTP "
            f"{response.status_code}: {response.text}"
        )

    raw = response.json()

    return raw


def extract_value(data, key):
    """
    Convert ThingsBoard's:
        key -> [{"ts": ..., "value": "..."}]

    into:
        key -> numeric value
    """

    if key not in data:
        raise RuntimeError(
            f"Telemetry key '{key}' was not found."
        )

    values = data[key]

    if not values:
        raise RuntimeError(
            f"No telemetry value available for '{key}'."
        )

    value = values[0]["value"]

    return float(value)


def convert_node_data(raw):
    """
    Convert ThingsBoard telemetry into exactly the
    structure expected by our existing dashboard.
    """

    return {
        "moisture": extract_value(raw, "moisture"),
        "airTemperature": extract_value(raw, "airTemperature"),
        "airHumidity": extract_value(raw, "airHumidity"),
        "soilTemperature": extract_value(raw, "soilTemperature"),
        "pH": extract_value(raw, "pH"),
        "ec": extract_value(raw, "EC"),
        "nitrogen": extract_value(raw, "nitrogen"),
        "phosphorus": extract_value(raw, "phosphorus"),
        "potassium": extract_value(raw, "potassium")
    }


@app.get("/")
def root():
    return {
        "message": "Smart Farm API is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Smart Farm Backend"
    }


@app.get("/api/farm-data")
def farm_data():

    try:

        node1_raw = get_latest_telemetry(
            NODE1_DEVICE_ID
        )

        node2_raw = get_latest_telemetry(
            NODE2_DEVICE_ID
        )

        node1 = convert_node_data(
            node1_raw
        )

        node2 = convert_node_data(
            node2_raw
        )

        return {
            "node1": node1,
            "node2": node2
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )