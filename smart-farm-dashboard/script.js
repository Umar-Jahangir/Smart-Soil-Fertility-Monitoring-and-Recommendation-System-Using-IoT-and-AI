/* ================================================================
   SMART FARM SOIL MONITORING SYSTEM — script.js

   DATA FLOW:
   ESP32 Nodes
        ↓
   ESP32 Gateway
        ↓
   ThingsBoard Cloud
        ↓
   FastAPI Backend
        ↓
   This Dashboard

   The dashboard receives LIVE data from:
   http://127.0.0.1:8000/api/farm-data
================================================================ */


/* ================================================================
   1. LIVE DATA LAYER
================================================================ */

async function fetchFarmData() {

    const response = await fetch(
        "http://127.0.0.1:8000/api/farm-data",
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
   2. METRIC / THRESHOLD CONFIG
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


const NPK_SCALE_MAX = 100;

const NODE_LABELS = {
    node1: "Node 1",
    node2: "Node 2"
};


/* ================================================================
   3. ICONS
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
   4. SOIL HEALTH CALCULATION
================================================================ */

function computeSoilHealthScore(nodeData) {

    const parameters = [

        {
            key: "moisture",
            min: 35,
            max: 65,
            weight: 15
        },

        // pH temporarily excluded while the probe
        // is being tested in buffer solution.
        /*
        {
            key: "pH",
            min: 6.0,
            max: 7.5,
            weight: 20
        },
        */

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


    let totalScore = 0;
    let totalWeight = 0;


    parameters.forEach(parameter => {

        const value = Number(nodeData[parameter.key]);

        if (Number.isNaN(value)) {
            return;
        }


        // Ignore invalid DS18B20 reading
        if (
            parameter.key === "soilTemperature" &&
            value === -127
        ) {
            return;
        }


        let parameterScore = 100;

        const range =
            parameter.max - parameter.min;


        if (value < parameter.min) {

            const distance =
                parameter.min - value;

            parameterScore =
                Math.max(
                    0,
                    100 - ((distance / range) * 100)
                );

        }

        else if (value > parameter.max) {

            const distance =
                value - parameter.max;

            parameterScore =
                Math.max(
                    0,
                    100 - ((distance / range) * 100)
                );
        }


        totalScore +=
            parameterScore *
            (parameter.weight / 100);

        totalWeight +=
            parameter.weight;
    });


    /*
     * Since pH is temporarily excluded,
     * normalize the score back to 100%.
     */

    if (totalWeight === 0) {
        return 0;
    }


    const normalizedScore =
        (totalScore / (totalWeight / 100));


    return Math.round(
        Math.max(
            0,
            Math.min(
                100,
                normalizedScore
            )
        )
    );
}


function scoreToStatus(score) {

    if (score >= 75) {
        return "healthy";
    }

    if (score >= 50) {
        return "moderate";
    }

    return "attention";
}


/* ================================================================
   5. FERTILIZER RECOMMENDATION
================================================================ */

function generateRecommendation(nodeData, status) {

    const recommendations = [];

    /* =========================================================
       1. pH ANALYSIS
    ========================================================= */

    const ph = Number(nodeData.pH);

    if (ph < 6.0) {

        recommendations.push({
            priority: 1,
            text:
                `Soil pH is low (${ph.toFixed(2)}). ` +
                `Focus on correcting soil acidity before increasing fertilizer application.`
        });

    } else if (ph > 7.5) {

        recommendations.push({
            priority: 1,
            text:
                `Soil pH is high (${ph.toFixed(2)}). ` +
                `Focus on correcting soil alkalinity and improving nutrient availability.`
        });
    }


    /* =========================================================
       2. MOISTURE ANALYSIS
    ========================================================= */

    const moisture =
        Number(nodeData.moisture);

    if (moisture < 35) {

        recommendations.push({
            priority: 2,
            text:
                `Soil moisture is low (${moisture.toFixed(1)}%). ` +
                `Irrigation is recommended before fertilizer application.`
        });

    } else if (moisture > 65) {

        recommendations.push({
            priority: 2,
            text:
                `Soil moisture is high (${moisture.toFixed(1)}%). ` +
                `Avoid additional irrigation and check soil drainage.`
        });
    }


    /* =========================================================
       3. NITROGEN
    ========================================================= */

    const nitrogen =
        Number(nodeData.nitrogen);

    if (nitrogen < 40) {

        recommendations.push({
            priority: 3,
            text:
                `Nitrogen is low (${nitrogen.toFixed(0)} mg/kg). ` +
                `Consider a nitrogen-rich fertilizer according to crop requirements.`
        });
    }


    /* =========================================================
       4. PHOSPHORUS
    ========================================================= */

    const phosphorus =
        Number(nodeData.phosphorus);

    if (phosphorus < 25) {

        recommendations.push({
            priority: 3,
            text:
                `Phosphorus is low (${phosphorus.toFixed(0)} mg/kg). ` +
                `Consider a phosphorus-rich fertilizer according to crop requirements.`
        });
    }


    /* =========================================================
       5. POTASSIUM
    ========================================================= */

    const potassium =
        Number(nodeData.potassium);

    if (potassium < 35) {

        recommendations.push({
            priority: 3,
            text:
                `Potassium is low (${potassium.toFixed(0)} mg/kg). ` +
                `Consider a potassium-rich fertilizer according to crop requirements.`
        });
    }


    /* =========================================================
       6. EC ANALYSIS
    ========================================================= */

    const ec =
        Number(nodeData.ec);

    if (ec < 1.0) {

        recommendations.push({
            priority: 4,
            text:
                `EC is low (${ec.toFixed(2)} dS/m). ` +
                `Nutrient availability may be insufficient.`
        });

    } else if (ec > 2.0) {

        recommendations.push({
            priority: 4,
            text:
                `EC is high (${ec.toFixed(2)} dS/m). ` +
                `Avoid excessive fertilizer application and monitor salt accumulation.`
        });
    }


    /* =========================================================
       7. SELECT MOST IMPORTANT RECOMMENDATION
    ========================================================= */

    if (recommendations.length === 0) {

        return (
            "All monitored soil parameters are within " +
            "the target range. Maintain the current " +
            "fertigation and irrigation schedule."
        );
    }


    recommendations.sort(
        (a, b) => a.priority - b.priority
    );


    return recommendations[0].text;
}


/* ================================================================
   6. ALERT GENERATION
================================================================ */

function generateAlerts(data) {

    const alerts = [];

    Object.keys(data).forEach(nodeKey => {

        const nodeData = data[nodeKey];
        const label = NODE_LABELS[nodeKey];

        let warningCount = 0;


        /* =========================================================
           SOIL MOISTURE
        ========================================================= */

        const moisture =
            METRICS.find(m => m.key === "moisture");

        if (nodeData.moisture < moisture.min) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Soil moisture is low (${nodeData.moisture.toFixed(1)}%). Irrigation may be required.`
            });

            warningCount++;

        } else if (nodeData.moisture > moisture.max) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Soil moisture is high (${nodeData.moisture.toFixed(1)}%). Check for over-irrigation.`
            });

            warningCount++;
        }


        /* =========================================================
           SOIL pH
        ========================================================= */

        const ph =
            METRICS.find(m => m.key === "pH");

        if (nodeData.pH < ph.min) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Soil pH is too low (${nodeData.pH.toFixed(2)}). Consider measures to increase soil pH.`
            });

            warningCount++;

        } else if (nodeData.pH > ph.max) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Soil pH is too high (${nodeData.pH.toFixed(2)}). Consider measures to reduce soil pH.`
            });

            warningCount++;
        }


        /* =========================================================
           ELECTRICAL CONDUCTIVITY
        ========================================================= */

        const ec =
            METRICS.find(m => m.key === "ec");

        if (nodeData.ec < ec.min) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `EC is low (${nodeData.ec.toFixed(2)} dS/m). Nutrient availability may be low.`
            });

            warningCount++;

        } else if (nodeData.ec > ec.max) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `EC is high (${nodeData.ec.toFixed(2)} dS/m). Possible excess salts or fertilizer concentration.`
            });

            warningCount++;
        }


        /* =========================================================
           NITROGEN
        ========================================================= */

        const nitrogen =
            METRICS.find(m => m.key === "nitrogen");

        if (nodeData.nitrogen < nitrogen.min) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Nitrogen level is low (${nodeData.nitrogen.toFixed(0)} mg/kg).`
            });

            warningCount++;

        }


        /* =========================================================
           PHOSPHORUS
        ========================================================= */

        const phosphorus =
            METRICS.find(m => m.key === "phosphorus");

        if (nodeData.phosphorus < phosphorus.min) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Phosphorus level is low (${nodeData.phosphorus.toFixed(0)} mg/kg).`
            });

            warningCount++;

        }


        /* =========================================================
           POTASSIUM
        ========================================================= */

        const potassium =
            METRICS.find(m => m.key === "potassium");

        if (nodeData.potassium < potassium.min) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Potassium level is low (${nodeData.potassium.toFixed(0)} mg/kg).`
            });

            warningCount++;

        }


        /* =========================================================
           SOIL TEMPERATURE
        ========================================================= */

        const soilTemperature =
            METRICS.find(
                m => m.key === "soilTemperature"
            );

        /*
           Ignore -127 °C because this is the DS18B20
           disconnected/error value you observed during
           testing. It should not create a false alert.
        */

        if (
            nodeData.soilTemperature !== -127 &&
            (
                nodeData.soilTemperature < soilTemperature.min ||
                nodeData.soilTemperature > soilTemperature.max
            )
        ) {

            alerts.push({
                node: label,
                type: "warning",
                message:
                    `Soil temperature is outside the target range (${nodeData.soilTemperature.toFixed(1)} °C).`
            });

            warningCount++;
        }


        /* =========================================================
           ALL PARAMETERS NORMAL
        ========================================================= */

        if (warningCount === 0) {

            alerts.push({
                node: label,
                type: "ok",
                message:
                    "All monitored soil parameters are within the recommended range."
            });

        }

    });


    return alerts;
}


/* ================================================================
   7. VALUE FORMATTER
================================================================ */

function formatValue(metric, rawValue) {

    const value = Number(rawValue);

    if (Number.isNaN(value)) {
        return "--";
    }

    return value.toFixed(
        metric.decimals
    );
}


/* ================================================================
   8. NODE CARD
================================================================ */

function renderNodeCard(nodeKey, nodeData) {

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
        scoreToStatus(score);


    const statusText = {

        healthy: "Healthy",

        moderate: "Moderate",

        attention: "Needs Attention"

    }[status];


    const sensorTiles =
        METRICS.map(metric => {

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
                            nodeData[metric.key]
                        )}

                        <span class="unit">
                            ${metric.unit}
                        </span>
                    </span>

                </div>
            `;

        }).join("");


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


        <div class="soil-core">

            <div class="soil-core-head">

                <span class="label">
                    Soil Health
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
        status
    };
}


/* ================================================================
   9. RECOMMENDATION RENDERER
================================================================ */

function renderRecommendation(
    nodeKey,
    nodeData,
    status
) {

    const label =
        NODE_LABELS[nodeKey];


    const statusText = {

        healthy: "Healthy",

        moderate: "Moderate",

        attention: "Needs Attention"

    }[status];


    const action =
        generateRecommendation(
            nodeData,
            status
        );


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
                    ${action}
                </p>

                <span class="rc-status">
                    ${statusText}
                </span>

            </div>

        </div>

    `;
}


/* ================================================================
   10. NPK RENDERER
================================================================ */

function renderNPK(data) {

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
        nutrients.map(nutrient => {

            const v1 =
                Number(
                    data.node1[
                        nutrient.key
                    ]
                );

            const v2 =
                Number(
                    data.node2[
                        nutrient.key
                    ]
                );


            const w1 =
                Math.min(
                    100,
                    (v1 / NPK_SCALE_MAX) * 100
                );


            const w2 =
                Math.min(
                    100,
                    (v2 / NPK_SCALE_MAX) * 100
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
                                ${v1}
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
                                ${v2}
                            </span>

                        </div>

                    </div>

                </div>

            `;

        }).join("");
}


/* ================================================================
   11. ALERT RENDERER
================================================================ */

function renderAlerts(data) {

    const alerts =
        generateAlerts(data);


    const list =
        document.getElementById(
            "alertsList"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        alerts.map(alert => {

            return `

                <li class="alert-item ${alert.type}">

                    <span class="a-icon">
                        ${
                            alert.type === "warning"
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

        }).join("");
}


/* ================================================================
   12. NODE COMPARISON TABLE
================================================================ */

function renderComparison(data) {

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
        rows.map(row => {

            const node1Value =
                Number(
                    data.node1[row.key]
                );


            const node2Value =
                Number(
                    data.node2[row.key]
                );


            return `

                <tr>

                    <td>
                        ${row.label}
                    </td>

                    <td>
                        ${
                            Number.isNaN(node1Value)
                                ? "--"
                                : node1Value.toFixed(
                                    row.decimals
                                ) + row.unit
                        }
                    </td>

                    <td>
                        ${
                            Number.isNaN(node2Value)
                                ? "--"
                                : node2Value.toFixed(
                                    row.decimals
                                ) + row.unit
                        }
                    </td>

                </tr>

            `;

        }).join("");
}


/* ================================================================
   13. GATEWAY CONNECTION STATUS
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
   14. LAST UPDATED TIME
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
   15. OPTIONAL LIVE CONNECTION INDICATOR
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


    /*
       These elements are optional.

       If they don't exist in index.html,
       the function simply does nothing.
    */

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
                new Date().toLocaleTimeString();

        }

    } else {

        statusElement.textContent =
            "● OFFLINE";


        statusElement.className =
            "connection-offline";

    }
}


/* ================================================================
   16. MAIN DASHBOARD UPDATE
================================================================ */

async function updateDashboard() {

    try {

        // Get LIVE data from FastAPI
        const data = await fetchFarmData();

        console.log("Live farm data:", data);


        // ================================
        // NODE 1
        // ================================

        const node1Result =
            renderNodeCard(
                "node1",
                data.node1
            );


        // ================================
        // NODE 2
        // ================================

        const node2Result =
            renderNodeCard(
                "node2",
                data.node2
            );


        // ================================
        // FERTILIZER RECOMMENDATIONS
        // ================================

        const recommendations =
            document.getElementById(
                "recommendGrid"
            );

        if (recommendations) {

            recommendations.innerHTML =

                renderRecommendation(
                    "node1",
                    data.node1,
                    node1Result.status
                )

                +

                renderRecommendation(
                    "node2",
                    data.node2,
                    node2Result.status
                );

        } else {

            console.error(
                "Could not find element with id='recommendations'"
            );

        }


        // ================================
        // NPK
        // ================================

        renderNPK(data);


        // ================================
        // SMART ALERTS
        // ================================

        renderAlerts(data);


        // ================================
        // NODE COMPARISON
        // ================================

        renderComparison(data);


        // ================================
        // CONNECTION STATUS
        // ================================

        setGatewayStatus(true);

        updateConnectionStatus(true);

        updateLastUpdatedTime();


        console.log(
            "Dashboard updated successfully."
        );


    } catch (error) {

        console.error(
            "Dashboard update failed:",
            error
        );

        setGatewayStatus(false);

        updateConnectionStatus(false);

    }

}


/* ================================================================
   17. INITIALIZATION + AUTOMATIC REFRESH
================================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
           Load immediately
        */

        updateDashboard();


        /*
           Refresh every 5 seconds
        */

        setInterval(
            updateDashboard,
            5000
        );

    }
);