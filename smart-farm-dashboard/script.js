/* ================================================================
   SMART FARM SOIL MONITORING SYSTEM — script.js

   COMPLETE DASHBOARD VERSION

   DATA FLOW:

   ESP32 Nodes
        ↓
   ESP32 Gateway
        ↓
   ThingsBoard Cloud
        ↓
   FastAPI Backend
        ↓
   ┌───────────────────────────────────────┐
   │                                       │
   │ /api/farm-data                        │
   │ /api/ai/predict/1                     │
   │ /api/ai/predict/2                     │
   │                                       │
   └───────────────────┬───────────────────┘
                       ↓
                  Web Dashboard

   FEATURES:
   1. Live sensor data
   2. Random Forest AI prediction
   3. AI + rule-based recommendations
   4. Node soil-health scores
   5. Farm-level health score
   6. NPK fertilizer recommendations
   7. Alerts
   8. Historical readings using localStorage
   9. Trend display
   10. Robust sensor-error handling
================================================================ */


/* ================================================================
   1. API CONFIGURATION
================================================================ */

const API_BASE_URL =
    "http://127.0.0.1:8000";


/* ================================================================
   2. APPLICATION CONFIGURATION
================================================================ */

const REFRESH_INTERVAL =
    5000;

const HISTORY_STORAGE_KEY =
    "smartFarmHistory";

const MAX_HISTORY_POINTS =
    30;


/*
   Node 2 currently has DS18B20 disconnected.

   -127°C is the standard invalid reading returned
   by the DS18B20 when the sensor is not available.
*/

const INVALID_SOIL_TEMPERATURE =
    -127;


/* ================================================================
   3. LIVE FARM DATA
================================================================ */

async function fetchFarmData() {

    const response =
        await fetch(
            `${API_BASE_URL}/api/farm-data`,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Backend returned ${response.status}`
        );

    }


    return await response.json();

}


/* ================================================================
   4. AI PREDICTION
================================================================ */

async function fetchAIPrediction(
    nodeId
) {

    const response =
        await fetch(
            `${API_BASE_URL}/api/ai/predict/${nodeId}`,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `AI API returned ${response.status}`
        );

    }


    return await response.json();

}


/*
   Fetch predictions for both nodes.

   Promise.allSettled() is used so that if one node
   fails, the other node can still be displayed.
*/

async function fetchAllAIPredictions() {

    const results =
        await Promise.allSettled([

            fetchAIPrediction(1),

            fetchAIPrediction(2)

        ]);


    return {

        node1:
            results[0].status === "fulfilled"
                ? results[0].value
                : null,

        node2:
            results[1].status === "fulfilled"
                ? results[1].value
                : null

    };

}


/* ================================================================
   5. METRIC / THRESHOLD CONFIGURATION
================================================================ */

const METRICS = [

    {
        key: "moisture",
        label: "Soil Moisture",
        unit: "%",
        decimals: 0,
        min: 35,
        max: 65,
        icon: "droplet"
    },

    {
        key: "airTemperature",
        label: "Air Temp",
        unit: "°C",
        decimals: 1,
        min: 18,
        max: 32,
        icon: "thermometer"
    },

    {
        key: "airHumidity",
        label: "Air Humidity",
        unit: "%",
        decimals: 1,
        min: 50,
        max: 90,
        icon: "cloud"
    },

    {
        key: "soilTemperature",
        label: "Soil Temp",
        unit: "°C",
        decimals: 1,
        min: 18,
        max: 30,
        icon: "thermometer-soil"
    },

    {
        key: "pH",
        label: "Soil pH",
        unit: "",
        decimals: 1,
        min: 6.0,
        max: 7.5,
        icon: "flask"
    },

    {
        key: "ec",
        label: "EC",
        unit: "dS/m",
        decimals: 2,
        min: 1.0,
        max: 2.0,
        icon: "bolt"
    },

    {
        key: "nitrogen",
        label: "Nitrogen (N)",
        unit: "mg/kg",
        decimals: 0,
        min: 40,
        max: 80,
        icon: "leaf"
    },

    {
        key: "phosphorus",
        label: "Phosphorus (P)",
        unit: "mg/kg",
        decimals: 0,
        min: 25,
        max: 60,
        icon: "leaf"
    },

    {
        key: "potassium",
        label: "Potassium (K)",
        unit: "mg/kg",
        decimals: 0,
        min: 35,
        max: 70,
        icon: "leaf"
    }

];


const NPK_SCALE_MAX =
    100;


const NODE_LABELS = {

    node1: "Node 1",

    node2: "Node 2"

};


/* ================================================================
   6. ICONS
================================================================ */

const ICONS = {

    droplet:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13Z"/>' +
        '</svg>',

    thermometer:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M12 14.5V4a2 2 0 1 0-4 0v10.5a4 4 0 1 0 4 0Z"/>' +
        '</svg>',

    cloud:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.7-1.6A4 4 0 0 0 7 18Z"/>' +
        '</svg>',

    "thermometer-soil":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M12 14.5V4a2 2 0 1 0-4 0v10.5a4 4 0 1 0 4 0Z"/>' +
        '<path d="M2 21h20"/>' +
        '</svg>',

    flask:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M9 2v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-11V2"/>' +
        '<path d="M8.5 2h7"/>' +
        '</svg>',

    bolt:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>' +
        '</svg>',

    leaf:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<path d="M5 21c9 0 14-5 14-14V5h-2C8 5 5 12 5 21Z"/>' +
        '<path d="M5 21c0-4 3-8 8-10"/>' +
        '</svg>'

};


/* ================================================================
   7. UTILITY FUNCTIONS
================================================================ */

function safeNumber(
    value,
    fallback = null
) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : fallback;

}


function isValidSoilTemperature(
    value
) {

    const temperature =
        safeNumber(value);


    return (
        temperature !== null &&
        temperature !== INVALID_SOIL_TEMPERATURE
    );

}


/* ================================================================
   8. SOIL HEALTH SCORE
================================================================ */

function computeSoilHealthScore(
    nodeData
) {

    /*
       pH is intentionally excluded from the numerical
       soil-condition score because Node 1's pH probe
       is currently being tested in buffer solution.

       pH is still used for recommendations and alerts.
    */

    const parameters = [

        {
            key: "moisture",
            min: 35,
            max: 65,
            weight: 15
        },

        {
            key: "ec",
            min: 1.0,
            max: 2.0,
            weight: 10
        },

        {
            key: "nitrogen",
            min: 40,
            max: 80,
            weight: 15
        },

        {
            key: "phosphorus",
            min: 25,
            max: 60,
            weight: 10
        },

        {
            key: "potassium",
            min: 35,
            max: 70,
            weight: 15
        },

        {
            key: "soilTemperature",
            min: 18,
            max: 30,
            weight: 10
        },

        {
            key: "airTemperature",
            min: 18,
            max: 32,
            weight: 2.5
        },

        {
            key: "airHumidity",
            min: 50,
            max: 90,
            weight: 2.5
        }

    ];


    let weightedScore = 0;

    let totalWeight = 0;


    parameters.forEach(
        parameter => {

            const value =
                safeNumber(
                    nodeData[
                        parameter.key
                    ]
                );


            if (value === null) {

                return;

            }


            /*
               Ignore disconnected DS18B20.
            */

            if (

                parameter.key ===
                "soilTemperature" &&

                value ===
                INVALID_SOIL_TEMPERATURE

            ) {

                return;

            }


            const range =
                parameter.max -
                parameter.min;


            let parameterScore =
                100;


            if (
                value <
                parameter.min
            ) {

                const distance =
                    parameter.min -
                    value;


                parameterScore =
                    Math.max(
                        0,
                        100 -
                        (
                            distance /
                            range
                        ) *
                        100
                    );

            }


            else if (
                value >
                parameter.max
            ) {

                const distance =
                    value -
                    parameter.max;


                parameterScore =
                    Math.max(
                        0,
                        100 -
                        (
                            distance /
                            range
                        ) *
                        100
                    );

            }


            weightedScore +=
                parameterScore *
                parameter.weight;


            totalWeight +=
                parameter.weight;

        }
    );


    if (
        totalWeight === 0
    ) {

        return 0;

    }


    return Math.round(

        Math.max(
            0,
            Math.min(
                100,
                weightedScore /
                totalWeight
            )
        )

    );

}


function scoreToStatus(
    score
) {

    if (
        score >= 75
    ) {

        return "healthy";

    }


    if (
        score >= 50
    ) {

        return "moderate";

    }


    return "attention";

}


/* ================================================================
   9. AI STATUS HELPERS
================================================================ */

function getAIStatusClass(
    prediction
) {

    if (!prediction) {

        return "attention";

    }


    const value =
        String(
            prediction
        ).toLowerCase();


    if (
        value === "healthy"
    ) {

        return "healthy";

    }


    if (
        value === "moderate"
    ) {

        return "moderate";

    }


    return "attention";

}


function getAIStatusText(
    prediction
) {

    if (!prediction) {

        return "AI Unavailable";

    }


    return String(
        prediction
    );

}


function formatAIConfidence(
    confidence
) {

    const value =
        safeNumber(
            confidence
        );


    if (
        value === null
    ) {

        return "--";

    }


    return `${value.toFixed(1)}%`;

}


/* ================================================================
   10. NPK FERTILIZER ANALYSIS
================================================================ */

function analyzeNPK(
    nodeData
) {

    const nitrogen =
        safeNumber(
            nodeData.nitrogen
        );

    const phosphorus =
        safeNumber(
            nodeData.phosphorus
        );

    const potassium =
        safeNumber(
            nodeData.potassium
        );


    const deficiencies = [];


    if (
        nitrogen !== null &&
        nitrogen < 40
    ) {

        deficiencies.push({
            nutrient: "Nitrogen",
            value: nitrogen,
            priority: 1
        });

    }


    if (
        phosphorus !== null &&
        phosphorus < 25
    ) {

        deficiencies.push({
            nutrient: "Phosphorus",
            value: phosphorus,
            priority: 2
        });

    }


    if (
        potassium !== null &&
        potassium < 35
    ) {

        deficiencies.push({
            nutrient: "Potassium",
            value: potassium,
            priority: 3
        });

    }


    deficiencies.sort(
        (a, b) =>
            a.priority -
            b.priority
    );


    return deficiencies;

}


/* ================================================================
   11. COMBINED RECOMMENDATION ENGINE
================================================================ */

function generateRecommendation(
    nodeData,
    aiPrediction
) {

    const recommendations = [];


    const prediction =
        aiPrediction?.prediction ||
        null;


    const confidence =
        safeNumber(
            aiPrediction?.confidence
        );


    /*
       -------------------------------------------------------------
       PH
       -------------------------------------------------------------
    */

    const ph =
        safeNumber(
            nodeData.pH
        );


    if (
        ph !== null &&
        ph < 6.0
    ) {

        recommendations.push({

            priority: 1,

            text:
                `Soil pH is low (${ph.toFixed(2)}). ` +
                `Correct soil acidity before increasing fertilizer application.`

        });

    }


    else if (
        ph !== null &&
        ph > 7.5
    ) {

        recommendations.push({

            priority: 1,

            text:
                `Soil pH is high (${ph.toFixed(2)}). ` +
                `Focus on correcting soil alkalinity and improving nutrient availability.`

        });

    }


    /*
       -------------------------------------------------------------
       MOISTURE
       -------------------------------------------------------------
    */

    const moisture =
        safeNumber(
            nodeData.moisture
        );


    if (
        moisture !== null &&
        moisture < 35
    ) {

        recommendations.push({

            priority: 2,

            text:
                `Soil moisture is low (${moisture.toFixed(1)}%). ` +
                `Irrigation is recommended before fertilizer application.`

        });

    }


    else if (
        moisture !== null &&
        moisture > 65
    ) {

        recommendations.push({

            priority: 2,

            text:
                `Soil moisture is high (${moisture.toFixed(1)}%). ` +
                `Avoid additional irrigation and check soil drainage.`

        });

    }


    /*
       -------------------------------------------------------------
       NPK
       -------------------------------------------------------------
    */

    const npkDeficiencies =
        analyzeNPK(
            nodeData
        );


    if (
        npkDeficiencies.length > 0
    ) {

        const deficiency =
            npkDeficiencies[0];


        let fertilizerText;


        if (
            deficiency.nutrient ===
            "Nitrogen"
        ) {

            fertilizerText =
                "Consider a nitrogen-rich fertilizer according to crop requirements.";

        }


        else if (
            deficiency.nutrient ===
            "Phosphorus"
        ) {

            fertilizerText =
                "Consider a phosphorus-rich fertilizer according to crop requirements.";

        }


        else {

            fertilizerText =
                "Consider a potassium-rich fertilizer according to crop requirements.";

        }


        recommendations.push({

            priority: 3,

            text:
                `${deficiency.nutrient} is low ` +
                `(${deficiency.value.toFixed(0)} mg/kg). ` +
                fertilizerText

        });

    }


    /*
       -------------------------------------------------------------
       EC
       -------------------------------------------------------------
    */

    const ec =
        safeNumber(
            nodeData.ec
        );


    if (
        ec !== null &&
        ec < 1.0
    ) {

        recommendations.push({

            priority: 4,

            text:
                `EC is low (${ec.toFixed(2)} dS/m). ` +
                `Nutrient availability may be insufficient.`

        });

    }


    else if (
        ec !== null &&
        ec > 2.0
    ) {

        recommendations.push({

            priority: 4,

            text:
                `EC is high (${ec.toFixed(2)} dS/m). ` +
                `Avoid excessive fertilizer application and monitor salt accumulation.`

        });

    }


    /*
       -------------------------------------------------------------
       AI CONTEXT
       -------------------------------------------------------------
    */

    let aiContext = "";


    if (
        prediction &&
        confidence !== null
    ) {

        aiContext =
            `AI model classifies the soil as ${prediction} ` +
            `with ${confidence.toFixed(1)}% confidence.`;

    }


    /*
       -------------------------------------------------------------
       IMPORTANT:
       If moisture is extremely low, irrigation takes precedence
       over fertilizer application.
       -------------------------------------------------------------
    */

    if (
        moisture !== null &&
        moisture < 20
    ) {

        return {

            text:
                `Soil moisture is critically low ` +
                `(${moisture.toFixed(1)}%). ` +
                `Irrigate before applying fertilizer.`,

            aiContext,

            priority: 1

        };

    }


    /*
       -------------------------------------------------------------
       ACTIONABLE RECOMMENDATION
       -------------------------------------------------------------
    */

    recommendations.sort(
        (a, b) =>
            a.priority -
            b.priority
    );


    if (
        recommendations.length > 0
    ) {

        return {

            text:
                recommendations[0].text,

            aiContext,

            priority:
                recommendations[0].priority

        };

    }


    /*
       -------------------------------------------------------------
       NO ISSUES
       -------------------------------------------------------------
    */

    return {

        text:
            "All monitored soil parameters are within the target range. Maintain the current irrigation and fertigation schedule.",

        aiContext,

        priority: 5

    };

}


/* ================================================================
   12. FARM-LEVEL HEALTH SCORE
================================================================ */

function computeFarmHealthScore(
    nodeResults
) {

    const validScores =
        nodeResults
            .filter(
                result =>
                    result &&
                    Number.isFinite(
                        result.score
                    )
            )
            .map(
                result =>
                    result.score
            );


    if (
        validScores.length === 0
    ) {

        return 0;

    }


    const total =
        validScores.reduce(
            (sum, score) =>
                sum + score,
            0
        );


    return Math.round(
        total /
        validScores.length
    );

}


/* ================================================================
   13. FARM STATUS
================================================================ */

function getFarmStatus(
    score
) {

    if (
        score >= 75
    ) {

        return "Healthy";

    }


    if (
        score >= 50
    ) {

        return "Moderate";

    }


    return "Needs Attention";

}


/* ================================================================
   14. ALERT GENERATION
================================================================ */

function generateAlerts(
    data
) {

    const alerts = [];


    Object.keys(data).forEach(
        nodeKey => {

            const nodeData =
                data[nodeKey];


            const label =
                NODE_LABELS[nodeKey];


            let warningCount = 0;


            /*
               MOISTURE
            */

            const moisture =
                safeNumber(
                    nodeData.moisture
                );


            if (
                moisture !== null &&
                moisture < 35
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Soil moisture is low (${moisture.toFixed(1)}%). ` +
                        `Irrigation may be required.`

                });


                warningCount++;

            }


            else if (
                moisture !== null &&
                moisture > 65
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Soil moisture is high (${moisture.toFixed(1)}%). ` +
                        `Check for over-irrigation.`

                });


                warningCount++;

            }


            /*
               PH
            */

            const ph =
                safeNumber(
                    nodeData.pH
                );


            if (
                ph !== null &&
                ph < 6.0
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Soil pH is too low (${ph.toFixed(2)}). ` +
                        `Consider measures to increase soil pH.`

                });


                warningCount++;

            }


            else if (
                ph !== null &&
                ph > 7.5
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Soil pH is too high (${ph.toFixed(2)}). ` +
                        `Consider measures to reduce soil pH.`

                });


                warningCount++;

            }


            /*
               EC
            */

            const ec =
                safeNumber(
                    nodeData.ec
                );


            if (
                ec !== null &&
                ec < 1.0
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `EC is low (${ec.toFixed(2)} dS/m). ` +
                        `Nutrient availability may be low.`

                });


                warningCount++;

            }


            else if (
                ec !== null &&
                ec > 2.0
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `EC is high (${ec.toFixed(2)} dS/m). ` +
                        `Possible excess salts or fertilizer concentration.`

                });


                warningCount++;

            }


            /*
               NITROGEN
            */

            const nitrogen =
                safeNumber(
                    nodeData.nitrogen
                );


            if (
                nitrogen !== null &&
                nitrogen < 40
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Nitrogen level is low (${nitrogen.toFixed(0)} mg/kg).`

                });


                warningCount++;

            }


            /*
               PHOSPHORUS
            */

            const phosphorus =
                safeNumber(
                    nodeData.phosphorus
                );


            if (
                phosphorus !== null &&
                phosphorus < 25
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Phosphorus level is low (${phosphorus.toFixed(0)} mg/kg).`

                });


                warningCount++;

            }


            /*
               POTASSIUM
            */

            const potassium =
                safeNumber(
                    nodeData.potassium
                );


            if (
                potassium !== null &&
                potassium < 35
            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Potassium level is low (${potassium.toFixed(0)} mg/kg).`

                });


                warningCount++;

            }


            /*
               SOIL TEMPERATURE
            */

            const soilTemperature =
                safeNumber(
                    nodeData.soilTemperature
                );


            /*
               Ignore -127°C.
            */

            if (

                soilTemperature !== null &&

                soilTemperature !==
                INVALID_SOIL_TEMPERATURE &&

                (
                    soilTemperature < 18 ||
                    soilTemperature > 30
                )

            ) {

                alerts.push({

                    node: label,

                    type: "warning",

                    message:
                        `Soil temperature is outside the target range ` +
                        `(${soilTemperature.toFixed(1)} °C).`

                });


                warningCount++;

            }


            /*
               NORMAL
            */

            if (
                warningCount === 0
            ) {

                alerts.push({

                    node: label,

                    type: "ok",

                    message:
                        "All monitored soil parameters are within the recommended range."

                });

            }

        }
    );


    return alerts;

}


/* ================================================================
   15. VALUE FORMATTER
================================================================ */

function formatValue(
    metric,
    rawValue
) {

    const value =
        safeNumber(
            rawValue
        );


    if (
        value === null
    ) {

        return "--";

    }


    /*
       Do not display -127 as an actual soil temperature.
    */

    if (

        metric.key ===
        "soilTemperature" &&

        value ===
        INVALID_SOIL_TEMPERATURE

    ) {

        return "N/A";

    }


    return value.toFixed(
        metric.decimals
    );

}


/* ================================================================
   16. NODE CARD
================================================================ */

function renderNodeCard(
    nodeKey,
    nodeData,
    aiPrediction
) {

    const card =
        document.getElementById(
            nodeKey === "node1"
                ? "node1Card"
                : "node2Card"
        );


    if (!card) {

        console.error(
            `Could not find card for ${nodeKey}`
        );


        return {

            score: 0,

            status: "attention"

        };

    }


    const label =
        NODE_LABELS[nodeKey];


    const score =
        computeSoilHealthScore(
            nodeData
        );


    const status =
        scoreToStatus(
            score
        );


    const statusText = {

        healthy: "Healthy",

        moderate: "Moderate",

        attention: "Needs Attention"

    }[status];


    /*
       AI
    */

    const aiStatus =
        aiPrediction?.prediction ||
        "Unavailable";


    const aiConfidence =
        safeNumber(
            aiPrediction?.confidence
        );


    const aiStatusClass =
        getAIStatusClass(
            aiStatus
        );


    /*
       SENSOR TILES
    */

    const sensorTiles =
        METRICS.map(
            metric => {

                return `

                    <div class="sensor-tile">

                        <span class="icon">
                            ${ICONS[metric.icon]}
                        </span>

                        <span class="sensor-label">
                            ${metric.label}
                        </span>

                        <span class="sensor-value">

                            ${formatValue(
                                metric,
                                nodeData[
                                    metric.key
                                ]
                            )}

                            <span class="unit">
                                ${metric.unit}
                            </span>

                        </span>

                    </div>

                `;

            }
        ).join("");


    card.innerHTML = `

        <div class="node-card-head">

            <h3>

                <span class="node-tag"></span>

                ${label}

            </h3>

            <span class="node-badge status-${status}">
                ${statusText}
            </span>

        </div>


        <div class="sensor-grid">

            ${sensorTiles}

        </div>


        <!-- AI SOIL HEALTH -->

        <div class="ai-health-card">

            <div class="ai-health-header">

                <div>

                    <span class="ai-health-label">
                        AI Soil Health
                    </span>

                    <span class="ai-model-label">
                        Random Forest
                    </span>

                </div>


                <span class="
                    ai-health-status
                    ai-status-${aiStatusClass}
                ">

                    ${aiStatus}

                </span>

            </div>


            <div class="ai-confidence">

                <span>
                    AI Confidence
                </span>

                <strong>
                    ${
                        aiConfidence !== null
                            ? `${aiConfidence.toFixed(1)}%`
                            : "N/A"
                    }
                </strong>

            </div>


            ${
                aiConfidence !== null
                    ? `

                        <div class="ai-confidence-track">

                            <div
                                class="ai-confidence-fill"
                                style="
                                    width:${Math.min(
                                        Math.max(
                                            aiConfidence,
                                            0
                                        ),
                                        100
                                    )}%
                                "
                            ></div>

                        </div>

                    `
                    : ""
            }

        </div>


        <!-- SOIL CONDITION SCORE -->

        <div class="soil-core">

            <div class="soil-core-head">

                <span class="label">
                    Soil Condition Score
                </span>

                <span class="score">

                    ${score}

                    <span class="of100">
                        /100
                    </span>

                </span>

            </div>


            <div class="soil-core-track">

                <div
                    class="soil-core-marker"
                    style="left:${score}%"
                >

                    <span class="flag">
                        ${score}
                    </span>

                    <span class="pin"></span>

                </div>

            </div>


            <div class="soil-core-scale">

                <span>0</span>

                <span>50</span>

                <span>100</span>

            </div>

        </div>

    `;


    return {

        score,

        status,

        aiPrediction: aiStatus,

        aiConfidence

    };

}


/* ================================================================
   17. RECOMMENDATION RENDERER
================================================================ */

function renderRecommendation(

    nodeKey,

    nodeData,

    status,

    aiResult

) {

    const label =
        NODE_LABELS[nodeKey];


    /*
       IMPORTANT:
       aiResult is passed correctly here.
       This fixes the previous bug where
       aiPrediction was referenced before declaration.
    */

    const recommendation =
        generateRecommendation(
            nodeData,
            aiResult
        );


    const aiPrediction =
        aiResult
            ? aiResult.prediction
            : null;


    const aiConfidence =
        aiResult
            ? safeNumber(
                aiResult.confidence
            )
            : null;


    const aiStatusClass =
        getAIStatusClass(
            aiPrediction
        );


    const aiStatusText =
        getAIStatusText(
            aiPrediction
        );


    const npkDeficiencies =
        analyzeNPK(
            nodeData
        );


    let fertilizerSection =
        "";


    if (
        npkDeficiencies.length > 0
    ) {

        fertilizerSection = `

            <p class="rc-action">

                <strong>
                    Fertilizer focus:
                </strong>

                ${npkDeficiencies
                    .map(
                        deficiency =>
                            `${deficiency.nutrient} ` +
                            `(${deficiency.value.toFixed(0)} mg/kg)`
                    )
                    .join(", ")
                }

            </p>

        `;

    }


    return `

        <div class="recommend-card status-${status}">

            <span class="rc-icon">
                ${ICONS.leaf}
            </span>


            <div>

                <p class="rc-node">
                    ${label}
                </p>


                <p class="rc-action">

                    <strong>
                        AI Soil Health:
                    </strong>

                    <span
                        class="node-badge status-${aiStatusClass}"
                    >

                        ${aiStatusText}

                    </span>

                </p>


                <p class="rc-action">

                    <strong>
                        AI Confidence:
                    </strong>

                    ${formatAIConfidence(
                        aiConfidence
                    )}

                </p>


                <p class="rc-action">

                    <strong>
                        Recommendation:
                    </strong>

                    ${recommendation.text}

                </p>


                ${
                    recommendation.aiContext
                        ? `

                            <p class="rc-action">

                                <strong>
                                    AI Analysis:
                                </strong>

                                ${recommendation.aiContext}

                            </p>

                        `
                        : ""
                }


                ${fertilizerSection}


                <span class="rc-status">

                    ${
                        aiResult
                            ? "AI Analysis Available"
                            : "AI Analysis Unavailable"
                    }

                </span>

            </div>

        </div>

    `;

}


/* ================================================================
   18. NPK RENDERER
================================================================ */

function renderNPK(
    data
) {

    const nutrients = [

        {
            key: "nitrogen",
            label: "Nitrogen (N)"
        },

        {
            key: "phosphorus",
            label: "Phosphorus (P)"
        },

        {
            key: "potassium",
            label: "Potassium (K)"
        }

    ];


    const panel =
        document.getElementById(
            "npkPanel"
        );


    if (!panel) {

        return;

    }


    panel.innerHTML =
        nutrients.map(
            nutrient => {

                const v1 =
                    safeNumber(
                        data.node1[
                            nutrient.key
                        ],
                        0
                    );


                const v2 =
                    safeNumber(
                        data.node2[
                            nutrient.key
                        ],
                        0
                    );


                const w1 =
                    Math.min(
                        100,
                        (
                            v1 /
                            NPK_SCALE_MAX
                        ) *
                        100
                    );


                const w2 =
                    Math.min(
                        100,
                        (
                            v2 /
                            NPK_SCALE_MAX
                        ) *
                        100
                    );


                return `

                    <div class="npk-row">

                        <div class="npk-row-head">

                            <span class="nutrient-name">
                                ${nutrient.label}
                            </span>

                            <span>
                                mg/kg
                            </span>

                        </div>


                        <div class="npk-bars">

                            <div class="npk-bar-line">

                                <span class="node-key">
                                    Node 1
                                </span>

                                <span class="npk-bar-track">

                                    <span
                                        class="npk-bar-fill n1"
                                        style="width:${w1}%"
                                    ></span>

                                </span>

                                <span class="npk-bar-value">
                                    ${v1.toFixed(0)}
                                </span>

                            </div>


                            <div class="npk-bar-line">

                                <span class="node-key">
                                    Node 2
                                </span>

                                <span class="npk-bar-track">

                                    <span
                                        class="npk-bar-fill n2"
                                        style="width:${w2}%"
                                    ></span>

                                </span>

                                <span class="npk-bar-value">
                                    ${v2.toFixed(0)}
                                </span>

                            </div>

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* ================================================================
   19. ALERT RENDERER
================================================================ */

function renderAlerts(
    data
) {

    const alerts =
        generateAlerts(
            data
        );


    const list =
        document.getElementById(
            "alertsList"
        );


    if (!list) {

        return;

    }


    list.innerHTML =
        alerts.map(
            alert => {

                return `

                    <li
                        class="alert-item ${alert.type}"
                    >

                        <span class="a-icon">

                            ${
                                alert.type ===
                                "warning"
                                    ? "⚠"
                                    : "✓"
                            }

                        </span>


                        <span>

                            <span class="a-node">
                                ${alert.node}:
                            </span>

                            ${alert.message}

                        </span>

                    </li>

                `;

            }
        ).join("");

}


/* ================================================================
   20. NODE COMPARISON TABLE
================================================================ */

function renderComparison(
    data
) {

    const rows = [

        {
            label: "Moisture",
            key: "moisture",
            unit: "%",
            decimals: 0
        },

        {
            label: "Air Temp",
            key: "airTemperature",
            unit: "°C",
            decimals: 1
        },

        {
            label: "Air Humidity",
            key: "airHumidity",
            unit: "%",
            decimals: 1
        },

        {
            label: "Soil Temp",
            key: "soilTemperature",
            unit: "°C",
            decimals: 1
        },

        {
            label: "pH",
            key: "pH",
            unit: "",
            decimals: 1
        },

        {
            label: "EC",
            key: "ec",
            unit: " dS/m",
            decimals: 2
        },

        {
            label: "Nitrogen",
            key: "nitrogen",
            unit: " mg/kg",
            decimals: 0
        },

        {
            label: "Phosphorus",
            key: "phosphorus",
            unit: " mg/kg",
            decimals: 0
        },

        {
            label: "Potassium",
            key: "potassium",
            unit: " mg/kg",
            decimals: 0
        }

    ];


    const body =
        document.getElementById(
            "comparisonBody"
        );


    if (!body) {

        return;

    }


    body.innerHTML =
        rows.map(
            row => {

                const node1Value =
                    safeNumber(
                        data.node1[
                            row.key
                        ]
                    );


                const node2Value =
                    safeNumber(
                        data.node2[
                            row.key
                        ]
                    );


                const formatComparisonValue =
                    value => {

                        if (
                            value === null
                        ) {

                            return "--";

                        }


                        if (

                            row.key ===
                            "soilTemperature" &&

                            value ===
                            INVALID_SOIL_TEMPERATURE

                        ) {

                            return "N/A";

                        }


                        return (
                            value.toFixed(
                                row.decimals
                            ) +
                            row.unit
                        );

                    };


                return `

                    <tr>

                        <td>
                            ${row.label}
                        </td>

                        <td>
                            ${formatComparisonValue(
                                node1Value
                            )}
                        </td>

                        <td>
                            ${formatComparisonValue(
                                node2Value
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* ================================================================
   21. FARM SUMMARY
================================================================ */

function renderFarmSummary(
    node1Result,
    node2Result
) {

    const farmScore =
        computeFarmHealthScore([

            node1Result,

            node2Result

        ]);


    const farmStatus =
        getFarmStatus(
            farmScore
        );


    /*
       If an existing farm-summary element exists,
       update it.

       Otherwise we don't modify the existing HTML.
    */

    const element =
        document.getElementById(
            "farmHealthSummary"
        );


    if (!element) {

        return {

            score: farmScore,

            status: farmStatus

        };

    }


    element.innerHTML = `

        <div class="farm-health-summary">

            <span>
                Farm Health
            </span>

            <strong>
                ${farmScore}/100
            </strong>

            <span>
                ${farmStatus}
            </span>

        </div>

    `;


    return {

        score: farmScore,

        status: farmStatus

    };

}


/* ================================================================
   22. LOCAL HISTORY
================================================================ */

function loadHistory() {

    try {

        const stored =
            localStorage.getItem(
                HISTORY_STORAGE_KEY
            );


        if (!stored) {

            return [];

        }


        const history =
            JSON.parse(
                stored
            );


        return Array.isArray(
            history
        )
            ? history
            : [];

    }

    catch (error) {

        console.error(
            "Could not load history:",
            error
        );


        return [];

    }

}


function saveHistory(
    history
) {

    try {

        localStorage.setItem(

            HISTORY_STORAGE_KEY,

            JSON.stringify(
                history
            )

        );

    }

    catch (error) {

        console.error(
            "Could not save history:",
            error
        );

    }

}


function addHistoryPoint(
    data,
    node1Result,
    node2Result
) {

    const history =
        loadHistory();


    const point = {

        timestamp:
            new Date().toISOString(),

        node1: {

            moisture:
                safeNumber(
                    data.node1.moisture
                ),

            pH:
                safeNumber(
                    data.node1.pH
                ),

            nitrogen:
                safeNumber(
                    data.node1.nitrogen
                ),

            phosphorus:
                safeNumber(
                    data.node1.phosphorus
                ),

            potassium:
                safeNumber(
                    data.node1.potassium
                ),

            score:
                node1Result.score

        },

        node2: {

            moisture:
                safeNumber(
                    data.node2.moisture
                ),

            pH:
                safeNumber(
                    data.node2.pH
                ),

            nitrogen:
                safeNumber(
                    data.node2.nitrogen
                ),

            phosphorus:
                safeNumber(
                    data.node2.phosphorus
                ),

            potassium:
                safeNumber(
                    data.node2.potassium
                ),

            score:
                node2Result.score

        }

    };


    /*
       Don't add another history point if the previous
       point was created less than 30 seconds ago.
    */

    const last =
        history[
            history.length - 1
        ];


    if (last) {

        const elapsed =
            Date.now() -
            new Date(
                last.timestamp
            ).getTime();


        if (
            elapsed < 30000
        ) {

            return history;

        }

    }


    history.push(
        point
    );


    /*
       Keep only the most recent points.
    */

    while (
        history.length >
        MAX_HISTORY_POINTS
    ) {

        history.shift();

    }


    saveHistory(
        history
    );


    return history;

}


/* ================================================================
   23. TREND ANALYSIS
================================================================ */

function calculateTrend(
    history,
    nodeKey,
    parameter
) {

    if (
        history.length < 2
    ) {

        return "Not enough data";

    }


    const values =
        history
            .map(
                point =>
                    point[
                        nodeKey
                    ]?.[
                        parameter
                    ]
            )
            .filter(
                value =>
                    Number.isFinite(
                        value
                    )
            );


    if (
        values.length < 2
    ) {

        return "Not enough data";

    }


    const first =
        values[0];


    const last =
        values[
            values.length - 1
        ];


    const difference =
        last -
        first;


    if (
        Math.abs(
            difference
        ) < 1
    ) {

        return "Stable";

    }


    return difference > 0
        ? "Increasing"
        : "Decreasing";

}


/* ================================================================
   24. TREND DISPLAY
================================================================ */

function renderTrends(
    history
) {

    const container =
        document.getElementById(
            "trendPanel"
        );


    /*
       If the HTML doesn't currently contain trendPanel,
       don't break the dashboard.
    */

    if (!container) {

        return;

    }


    const node1MoistureTrend =
        calculateTrend(
            history,
            "node1",
            "moisture"
        );


    const node2MoistureTrend =
        calculateTrend(
            history,
            "node2",
            "moisture"
        );


    const node1ScoreTrend =
        calculateTrend(
            history,
            "node1",
            "score"
        );


    const node2ScoreTrend =
        calculateTrend(
            history,
            "node2",
            "score"
        );


    container.innerHTML = `

        <div class="trend-grid">

            <div class="trend-card">

                <strong>
                    Node 1 Moisture
                </strong>

                <span>
                    ${node1MoistureTrend}
                </span>

            </div>


            <div class="trend-card">

                <strong>
                    Node 2 Moisture
                </strong>

                <span>
                    ${node2MoistureTrend}
                </span>

            </div>


            <div class="trend-card">

                <strong>
                    Node 1 Health
                </strong>

                <span>
                    ${node1ScoreTrend}
                </span>

            </div>


            <div class="trend-card">

                <strong>
                    Node 2 Health
                </strong>

                <span>
                    ${node2ScoreTrend}
                </span>

            </div>

        </div>

        <small>
            Based on ${history.length} stored readings.
        </small>

    `;

}


/* ================================================================
   25. GATEWAY CONNECTION STATUS
================================================================ */

function setGatewayStatus(
    connected
) {

    const pill =
        document.getElementById(
            "gatewayStatus"
        );


    if (!pill) {

        return;

    }


    pill.classList.toggle(
        "is-connected",
        connected
    );


    pill.classList.toggle(
        "is-offline",
        !connected
    );


    const text =
        pill.querySelector(
            ".status-text"
        );


    if (text) {

        text.textContent =
            connected
                ? "Gateway Connected"
                : "Gateway Offline";

    }

}


/* ================================================================
   26. CONNECTION STATUS
================================================================ */

function updateConnectionStatus(
    isConnected
) {

    const statusElement =
        document.getElementById(
            "connection-status"
        );


    const timeElement =
        document.getElementById(
            "last-updated"
        );


    if (!statusElement) {

        return;

    }


    if (isConnected) {

        statusElement.textContent =
            "● LIVE";


        statusElement.className =
            "connection-live";


        if (timeElement) {

            timeElement.textContent =
                "Last updated: " +
                new Date()
                    .toLocaleTimeString();

        }

    }

    else {

        statusElement.textContent =
            "● OFFLINE";


        statusElement.className =
            "connection-offline";

    }

}


/* ================================================================
   27. LAST UPDATED
================================================================ */

function updateLastUpdatedTime() {

    const element =
        document.getElementById(
            "lastUpdated"
        );


    if (!element) {

        return;

    }


    element.textContent =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

}


/* ================================================================
   28. MAIN DASHBOARD UPDATE
================================================================ */

async function updateDashboard() {

    try {

        /*
           =========================================================
           STEP 1
           GET LIVE SENSOR DATA
           =========================================================
        */

        const data =
            await fetchFarmData();


        console.log(
            "Live farm data:",
            data
        );


        /*
           =========================================================
           VALIDATE DATA
           =========================================================
        */

        if (
            !data ||
            !data.node1 ||
            !data.node2
        ) {

            throw new Error(
                "Backend did not return both node1 and node2 data."
            );

        }


        /*
           =========================================================
           STEP 2
           GET BOTH AI PREDICTIONS

           This replaces the previous duplicate API calls.
           =========================================================
        */

        const aiResults =
            await fetchAllAIPredictions();


        console.log(
            "AI predictions:",
            aiResults
        );


        /*
           =========================================================
           STEP 3
           RENDER NODE 1
           =========================================================
        */

        const node1Result =
            renderNodeCard(

                "node1",

                data.node1,

                aiResults.node1

            );


        /*
           =========================================================
           STEP 4
           RENDER NODE 2
           =========================================================
        */

        const node2Result =
            renderNodeCard(

                "node2",

                data.node2,

                aiResults.node2

            );


        /*
           =========================================================
           STEP 5
           FARM HEALTH
           =========================================================
        */

        const farmResult =
            renderFarmSummary(

                node1Result,

                node2Result

            );


        console.log(
            "Farm health:",
            farmResult
        );


        /*
           =========================================================
           STEP 6
           RECOMMENDATIONS
           =========================================================
        */

        const recommendations =
            document.getElementById(
                "recommendGrid"
            );


        if (
            recommendations
        ) {

            recommendations.innerHTML =

                renderRecommendation(

                    "node1",

                    data.node1,

                    node1Result.status,

                    aiResults.node1

                )

                +

                renderRecommendation(

                    "node2",

                    data.node2,

                    node2Result.status,

                    aiResults.node2

                );

        }


        /*
           =========================================================
           STEP 7
           NPK
           =========================================================
        */

        renderNPK(
            data
        );


        /*
           =========================================================
           STEP 8
           ALERTS
           =========================================================
        */

        renderAlerts(
            data
        );


        /*
           =========================================================
           STEP 9
           COMPARISON
           =========================================================
        */

        renderComparison(
            data
        );


        /*
           =========================================================
           STEP 10
           HISTORY
           =========================================================
        */

        const history =
            addHistoryPoint(

                data,

                node1Result,

                node2Result

            );


        renderTrends(
            history
        );


        /*
           =========================================================
           STEP 11
           CONNECTION STATUS
           =========================================================
        */

        setGatewayStatus(
            true
        );


        updateConnectionStatus(
            true
        );


        updateLastUpdatedTime();


        console.log(
            "Dashboard updated successfully."
        );

    }


    catch (error) {

        console.error(
            "Dashboard update failed:",
            error
        );


        setGatewayStatus(
            false
        );


        updateConnectionStatus(
            false
        );

    }

}


/* ================================================================
   29. INITIALIZATION
================================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Smart Farm Dashboard initialized."
        );


        /*
           Initial update.
        */

        updateDashboard();


        /*
           Automatic refresh.
        */

        setInterval(
            updateDashboard,
            REFRESH_INTERVAL
        );

    }
);