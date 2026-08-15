import os
from datetime import datetime
from collections import deque

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

    print(
        "Soil Health ML model loaded successfully."
    )

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
    version="2.0.0"
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
# RECOMMENDATION HISTORY
# ============================================================

recommendation_history = deque(
    maxlen=100
)


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
    Convert ThingsBoard:

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
    Convert ThingsBoard telemetry into the
    structure expected by the dashboard.
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
# RECOMMENDATION ENGINE
# ============================================================

def generate_recommendation(
    node_data,
    prediction,
    confidence
):

    """
    Hybrid recommendation engine.

    Random Forest provides:
        Healthy
        Moderate
        Needs Attention

    Rule-based analysis provides:
        Specific agricultural action.

    The ML model does NOT invent fertilizer dosage.
    """

    issues = []


    # ========================================================
    # 1. MOISTURE
    # ========================================================

    moisture = float(
        node_data["moisture"]
    )

    if moisture < 35:

        issues.append({

            "parameter": "moisture",

            "value": moisture,

            "unit": "%",

            "severity": "HIGH",

            "priority": 1,

            "action":
                "Irrigation recommended",

            "reason":
                f"Soil moisture is {moisture:.1f}%, "
                f"which is below the target range."

        })

    elif moisture > 65:

        issues.append({

            "parameter": "moisture",

            "value": moisture,

            "unit": "%",

            "severity": "MEDIUM",

            "priority": 2,

            "action":
                "Reduce irrigation",

            "reason":
                f"Soil moisture is {moisture:.1f}%, "
                f"which is above the target range."

        })


    # ========================================================
    # 2. pH
    # ========================================================

    ph = float(
        node_data["pH"]
    )

    if ph < 6.0:

        issues.append({

            "parameter": "pH",

            "value": ph,

            "unit": "",

            "severity": "HIGH",

            "priority": 1,

            "action":
                "Correct soil acidity",

            "reason":
                f"Soil pH is {ph:.2f}, "
                f"which is below the target range."

        })

    elif ph > 7.5:

        issues.append({

            "parameter": "pH",

            "value": ph,

            "unit": "",

            "severity": "HIGH",

            "priority": 1,

            "action":
                "Correct soil alkalinity",

            "reason":
                f"Soil pH is {ph:.2f}, "
                f"which is above the target range."

        })


    # ========================================================
    # 3. NITROGEN
    # ========================================================

    nitrogen = float(
        node_data["nitrogen"]
    )

    if nitrogen < 40:

        issues.append({

            "parameter": "nitrogen",

            "value": nitrogen,

            "unit": "mg/kg",

            "severity": "MEDIUM",

            "priority": 3,

            "action":
                "Consider nitrogen-rich fertilizer",

            "reason":
                f"Nitrogen level is {nitrogen:.0f} mg/kg, "
                f"which is below the target range."

        })


    # ========================================================
    # 4. PHOSPHORUS
    # ========================================================

    phosphorus = float(
        node_data["phosphorus"]
    )

    if phosphorus < 25:

        issues.append({

            "parameter": "phosphorus",

            "value": phosphorus,

            "unit": "mg/kg",

            "severity": "MEDIUM",

            "priority": 3,

            "action":
                "Consider phosphorus-rich fertilizer",

            "reason":
                f"Phosphorus level is "
                f"{phosphorus:.0f} mg/kg, "
                f"which is below the target range."

        })


    # ========================================================
    # 5. POTASSIUM
    # ========================================================

    potassium = float(
        node_data["potassium"]
    )

    if potassium < 35:

        issues.append({

            "parameter": "potassium",

            "value": potassium,

            "unit": "mg/kg",

            "severity": "MEDIUM",

            "priority": 3,

            "action":
                "Consider potassium-rich fertilizer",

            "reason":
                f"Potassium level is "
                f"{potassium:.0f} mg/kg, "
                f"which is below the target range."

        })


    # ========================================================
    # 6. EC
    # ========================================================

    ec = float(
        node_data["ec"]
    )

    if ec < 1.0:

        issues.append({

            "parameter": "EC",

            "value": ec,

            "unit": "dS/m",

            "severity": "LOW",

            "priority": 4,

            "action":
                "Monitor nutrient availability",

            "reason":
                f"EC is {ec:.2f} dS/m, "
                f"which may indicate low nutrient availability."

        })

    elif ec > 2.0:

        issues.append({

            "parameter": "EC",

            "value": ec,

            "unit": "dS/m",

            "severity": "MEDIUM",

            "priority": 4,

            "action":
                "Avoid excessive fertilizer application",

            "reason":
                f"EC is {ec:.2f} dS/m, "
                f"which may indicate excessive salts "
                f"or fertilizer concentration."

        })


    # ========================================================
    # 7. SOIL TEMPERATURE
    # ========================================================

    soil_temperature = float(
        node_data["soilTemperature"]
    )

    soil_temperature_valid = (
        soil_temperature != -127
    )


    if soil_temperature_valid:

        if (
            soil_temperature < 18
            or
            soil_temperature > 30
        ):

            issues.append({

                "parameter":
                    "soilTemperature",

                "value":
                    soil_temperature,

                "unit":
                    "°C",

                "severity":
                    "LOW",

                "priority":
                    5,

                "action":
                    "Monitor soil temperature",

                "reason":
                    f"Soil temperature is "
                    f"{soil_temperature:.1f}°C, "
                    f"outside the target range."

            })


    # ========================================================
    # SORT ISSUES
    # ========================================================

    issues.sort(
        key=lambda issue:
            issue["priority"]
    )


    # ========================================================
    # PRIMARY RECOMMENDATION
    # ========================================================

    if issues:

        primary = issues[0]

        priority = primary["severity"]

        action = primary["action"]

        reason = primary["reason"]

    else:

        priority = "NORMAL"

        action = (
            "Maintain current irrigation "
            "and fertigation schedule"
        )

        reason = (
            "All monitored soil parameters "
            "are within the target range."
        )


    # ========================================================
    # RESULT
    # ========================================================

    return {

        "priority":
            priority,

        "action":
            action,

        "reason":
            reason,

        "issues":
            issues,

        "issueCount":
            len(issues),

        "aiPrediction":
            prediction,

        "aiConfidence":
            confidence

    }


# ============================================================
# SAVE RECOMMENDATION HISTORY
# ============================================================

def save_recommendation_history(
    node_id,
    recommendation
):

    entry = {

        "timestamp":
            datetime.now().isoformat(),

        "node":
            f"Node {node_id}",

        "prediction":
            recommendation["aiPrediction"],

        "confidence":
            recommendation["aiConfidence"],

        "priority":
            recommendation["priority"],

        "action":
            recommendation["action"],

        "reason":
            recommendation["reason"],

        "issueCount":
            recommendation["issueCount"]

    }

    recommendation_history.appendleft(
        entry
    )


# ============================================================
# RUN AI MODEL
# ============================================================

def run_ai_prediction(
    node_data
):

    if soil_health_model is None:

        raise RuntimeError(
            "Soil Health ML model is not loaded."
        )


    # ========================================================
    # HANDLE INVALID DS18B20 READING
    # ========================================================
    #
    # DS18B20 returns -127°C when the sensor is unavailable.
    #
    # We DO NOT treat -127°C as real soil temperature.
    #
    # Since the Random Forest was trained using valid
    # temperature values, use air temperature as a temporary
    # fallback for the ML prediction only.
    #
    # The original soilTemperature remains unchanged in
    # the returned features.
    #
    # ========================================================

    model_soil_temperature = (
        node_data["soilTemperature"]
    )

    soil_temperature_fallback = False


    if (
        model_soil_temperature == -127
    ):

        model_soil_temperature = (
            node_data["airTemperature"]
        )

        soil_temperature_fallback = True


    features = [[

        node_data["moisture"],

        node_data["pH"],

        node_data["ec"],

        node_data["nitrogen"],

        node_data["phosphorus"],

        node_data["potassium"],

        model_soil_temperature,

        node_data["airTemperature"],

        node_data["airHumidity"]

    ]]


    # ========================================================
    # PREDICTION
    # ========================================================

    prediction = (

        soil_health_model
        .predict(features)[0]

    )


    # ========================================================
    # CONFIDENCE
    # ========================================================

    confidence = None


    if hasattr(
        soil_health_model,
        "predict_proba"
    ):

        probabilities = (

            soil_health_model
            .predict_proba(features)[0]

        )

        confidence = (

            float(
                max(probabilities)
            )
            * 100

        )


    return {

        "prediction":
            str(prediction),

        "confidence":
            round(
                confidence,
                2
            )
            if confidence is not None
            else None,

        "model":
            "Random Forest",

        "modelSoilTemperature":
            model_soil_temperature,

        "soilTemperatureFallback":
            soil_temperature_fallback

    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "message":
            "Smart Farm API is running",

        "version":
            "2.0.0"

    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    return {

        "status":
            "ok",

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

        node1_raw = (
            get_latest_telemetry(
                NODE1_DEVICE_ID
            )
        )

        node2_raw = (
            get_latest_telemetry(
                NODE2_DEVICE_ID
            )
        )

        node1 = (
            convert_node_data(
                node1_raw
            )
        )

        node2 = (
            convert_node_data(
                node2_raw
            )
        )

        return {

            "node1":
                node1,

            "node2":
                node2

        }

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )


# ============================================================
# AI PREDICTION — MANUAL DATA
# ============================================================

@app.post("/api/ai/predict")
def predict_soil_health(
    data: SoilPredictionRequest
):

    try:

        node_data = {

            "moisture":
                data.moisture,

            "pH":
                data.pH,

            "ec":
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


        # ====================================================
        # AI
        # ====================================================

        ai_result = (
            run_ai_prediction(
                node_data
            )
        )


        # ====================================================
        # RECOMMENDATION
        # ====================================================

        recommendation = (
            generate_recommendation(

                node_data,

                ai_result[
                    "prediction"
                ],

                ai_result[
                    "confidence"
                ]

            )
        )


        return {

            "prediction":
                ai_result[
                    "prediction"
                ],

            "confidence":
                ai_result[
                    "confidence"
                ],

            "model":
                ai_result[
                    "model"
                ],

            "recommendation":
                recommendation,

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
# AI PREDICTION — LIVE NODE
# ============================================================

@app.get("/api/ai/predict/{node_id}")
def predict_live_node(
    node_id: int
):

    if node_id not in [1, 2]:

        raise HTTPException(

            status_code=400,

            detail=
                "node_id must be 1 or 2."

        )


    try:

        # ====================================================
        # SELECT DEVICE
        # ====================================================

        if node_id == 1:

            device_id = (
                NODE1_DEVICE_ID
            )

        else:

            device_id = (
                NODE2_DEVICE_ID
            )


        # ====================================================
        # GET LIVE DATA
        # ====================================================

        raw = (
            get_latest_telemetry(
                device_id
            )
        )


        node_data = (
            convert_node_data(
                raw
            )
        )


        # ====================================================
        # AI PREDICTION
        # ====================================================

        ai_result = (
            run_ai_prediction(
                node_data
            )
        )


        # ====================================================
        # RECOMMENDATION
        # ====================================================

        recommendation = (
            generate_recommendation(

                node_data,

                ai_result[
                    "prediction"
                ],

                ai_result[
                    "confidence"
                ]

            )
        )


        # ====================================================
        # SAVE HISTORY
        # ====================================================

        save_recommendation_history(

            node_id,

            recommendation

        )


        # ====================================================
        # RETURN COMPLETE RESULT
        # ====================================================

        return {

            "node":
                node_id,

            "prediction":
                ai_result[
                    "prediction"
                ],

            "confidence":
                ai_result[
                    "confidence"
                ],

            "model":
                ai_result[
                    "model"
                ],

            "recommendation":
                recommendation,

            "sensorStatus": {

                "soilTemperatureValid":
                    not ai_result[
                        "soilTemperatureFallback"
                    ]

            },

            "features": {

                "moisture":
                    node_data[
                        "moisture"
                    ],

                "pH":
                    node_data[
                        "pH"
                    ],

                "EC":
                    node_data[
                        "ec"
                    ],

                "nitrogen":
                    node_data[
                        "nitrogen"
                    ],

                "phosphorus":
                    node_data[
                        "phosphorus"
                    ],

                "potassium":
                    node_data[
                        "potassium"
                    ],

                "soilTemperature":
                    node_data[
                        "soilTemperature"
                    ],

                "airTemperature":
                    node_data[
                        "airTemperature"
                    ],

                "airHumidity":
                    node_data[
                        "airHumidity"
                    ]

            }

        }

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )


# ============================================================
# RECOMMENDATION HISTORY
# ============================================================

@app.get("/api/ai/history")
def get_recommendation_history():

    return {

        "count":
            len(
                recommendation_history
            ),

        "history":
            list(
                recommendation_history
            )

    }


# ============================================================
# NODE-SPECIFIC HISTORY
# ============================================================

@app.get(
    "/api/ai/history/{node_id}"
)
def get_node_history(
    node_id: int
):

    if node_id not in [1, 2]:

        raise HTTPException(

            status_code=400,

            detail=
                "node_id must be 1 or 2."

        )


    node_name = (
        f"Node {node_id}"
    )


    history = [

        entry

        for entry
        in recommendation_history

        if entry["node"] ==
           node_name

    ]


    return {

        "node":
            node_name,

        "count":
            len(history),

        "history":
            history

    }