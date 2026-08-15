import os
import requests
import joblib

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


THINGSBOARD_URL = os.getenv(
    "THINGSBOARD_URL",
    "https://thingsboard.cloud"
)

THINGSBOARD_API_KEY = os.getenv(
    "THINGSBOARD_API_KEY"
)

NODE1_DEVICE_ID = os.getenv(
    "NODE1_DEVICE_ID"
)

NODE2_DEVICE_ID = os.getenv(
    "NODE2_DEVICE_ID"
)


# ============================================================
# ML MODEL
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "soil_health_model.pkl"
)


try:

    soil_health_model = joblib.load(
        MODEL_PATH
    )

    print("Soil Health ML model loaded successfully.")

except Exception as e:

    soil_health_model = None

    print(
        f"Warning: Could not load ML model: {e}"
    )


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Smart Farm Soil Monitoring API",
    version="1.1.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TELEMETRY KEYS
# ============================================================

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


# ============================================================
# ML FEATURES
# ============================================================

ML_FEATURES = [
    "moisture",
    "pH",
    "EC",
    "nitrogen",
    "phosphorus",
    "potassium",
    "soilTemperature",
    "airTemperature",
    "airHumidity"
]


# ============================================================
# AI REQUEST MODEL
# ============================================================

class SoilPredictionRequest(BaseModel):

    moisture: float
    pH: float
    EC: float
    nitrogen: float
    phosphorus: float
    potassium: float
    soilTemperature: float
    airTemperature: float
    airHumidity: float


# ============================================================
# THINGSBOARD
# ============================================================

def get_latest_telemetry(device_id):

    """
    Fetch latest telemetry values from ThingsBoard.
    """

    if not device_id:

        raise RuntimeError(
            "Device ID is missing."
        )

    if not THINGSBOARD_API_KEY:

        raise RuntimeError(
            "THINGSBOARD_API_KEY is missing."
        )

    keys = ",".join(
        TELEMETRY_KEYS
    )

    url = (
        f"{THINGSBOARD_URL}"
        f"/api/plugins/telemetry/DEVICE/"
        f"{device_id}/values/timeseries"
    )

    headers = {
        "X-Authorization":
            f"ApiKey {THINGSBOARD_API_KEY}"
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
            f"{response.status_code}: "
            f"{response.text}"
        )

    return response.json()


# ============================================================
# TELEMETRY VALUE EXTRACTION
# ============================================================

def extract_value(data, key):

    """
    Convert ThingsBoard's:

        key -> [{"ts": ..., "value": "..."}]

    into:

        key -> numeric value
    """

    if key not in data:

        raise RuntimeError(
            f"Telemetry key '{key}' "
            f"was not found."
        )

    values = data[key]

    if not values:

        raise RuntimeError(
            f"No telemetry value available "
            f"for '{key}'."
        )

    value = values[0]["value"]

    return float(value)


# ============================================================
# CONVERT NODE DATA
# ============================================================

def convert_node_data(raw):

    """
    Convert ThingsBoard telemetry into exactly
    the structure expected by our dashboard.
    """

    return {

        "moisture":
            extract_value(
                raw,
                "moisture"
            ),

        "airTemperature":
            extract_value(
                raw,
                "airTemperature"
            ),

        "airHumidity":
            extract_value(
                raw,
                "airHumidity"
            ),

        "soilTemperature":
            extract_value(
                raw,
                "soilTemperature"
            ),

        "pH":
            extract_value(
                raw,
                "pH"
            ),

        "ec":
            extract_value(
                raw,
                "EC"
            ),

        "nitrogen":
            extract_value(
                raw,
                "nitrogen"
            ),

        "phosphorus":
            extract_value(
                raw,
                "phosphorus"
            ),

        "potassium":
            extract_value(
                raw,
                "potassium"
            )
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message":
            "Smart Farm API is running"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    return {

        "status": "ok",

        "service":
            "Smart Farm Backend",

        "ml_model":
            "loaded"
            if soil_health_model
            else "not loaded"
    }


# ============================================================
# FARM DATA
# ============================================================

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


# ============================================================
# AI PREDICTION
# ============================================================

@app.post("/api/ai/predict")
def predict_soil_health(
    data: SoilPredictionRequest
):

    if soil_health_model is None:

        raise HTTPException(
            status_code=500,
            detail="Soil Health ML model is not loaded."
        )

    try:

        # Keep feature order EXACTLY the same
        # as used during model training.

        features = [[

            data.moisture,

            data.pH,

            data.EC,

            data.nitrogen,

            data.phosphorus,

            data.potassium,

            data.soilTemperature,

            data.airTemperature,

            data.airHumidity

        ]]


        # Prediction

        prediction = (
            soil_health_model
            .predict(features)[0]
        )


        # Confidence

        confidence = None

        if hasattr(
            soil_health_model,
            "predict_proba"
        ):

            probabilities = (
                soil_health_model
                .predict_proba(features)[0]
            )

            confidence = float(
                max(probabilities)
            )


        return {

            "prediction":
                str(prediction),

            "confidence":
                round(
                    confidence * 100,
                    2
                )
                if confidence is not None
                else None,

            "model":
                "Random Forest",

            "features": {

                "moisture":
                    data.moisture,

                "pH":
                    data.pH,

                "EC":
                    data.EC,

                "nitrogen":
                    data.nitrogen,

                "phosphorus":
                    data.phosphorus,

                "potassium":
                    data.potassium,

                "soilTemperature":
                    data.soilTemperature,

                "airTemperature":
                    data.airTemperature,

                "airHumidity":
                    data.airHumidity
            }
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# AI PREDICTION USING LIVE NODE DATA
# ============================================================

@app.get("/api/ai/predict/{node_id}")
def predict_live_node(node_id: int):

    if node_id not in [1, 2]:

        raise HTTPException(
            status_code=400,
            detail="node_id must be 1 or 2."
        )

    try:

        if node_id == 1:

            device_id = NODE1_DEVICE_ID

        else:

            device_id = NODE2_DEVICE_ID


        raw = get_latest_telemetry(
            device_id
        )

        node_data = convert_node_data(
            raw
        )


        request_data = SoilPredictionRequest(

            moisture=node_data["moisture"],

            pH=node_data["pH"],

            EC=node_data["ec"],

            nitrogen=node_data["nitrogen"],

            phosphorus=node_data["phosphorus"],

            potassium=node_data["potassium"],

            soilTemperature=
                node_data["soilTemperature"],

            airTemperature=
                node_data["airTemperature"],

            airHumidity=
                node_data["airHumidity"]
        )


        return predict_soil_health(
            request_data
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )