/* ================================================================
   SMART FARM SOIL MONITORING SYSTEM — script.js
   ----------------------------------------------------------------
   Structure of this file:
     1. DEMO DATA LAYER      <- swap this for cloud/API data later
     2. METRIC / THRESHOLD CONFIG
     3. CALCULATION LAYER    (soil health score, recommendations, alerts)
     4. RENDER LAYER         (writes calculated data into the DOM)
     5. ORCHESTRATION        (updateDashboard + init)
   Every value shown on screen is written into the DOM from here —
   index.html contains no sensor numbers at all.
================================================================ */


/* ================================================================
   1. DEMO DATA LAYER
   ----------------------------------------------------------------
   This is the ONLY object that needs to change when real sensors /
   the cloud platform come online. Everything below (calculations,
   rendering) reads from `farmData` through fetchFarmData(), never
   directly — so the swap is a one-function change.
================================================================ */
const farmData = {
  node1: {
    moisture:        45,    // %
    airTemperature:  26.4,  // °C
    airHumidity:     85.3,  // %
    soilTemperature: 25.3,  // °C
    pH:              6.4,
    ec:              1.35,  // dS/m
    nitrogen:        48,    // mg/kg
    phosphorus:      32,    // mg/kg
    potassium:       41     // mg/kg
  },
  node2: {
    moisture:        52,
    airTemperature:  25.2,
    airHumidity:     85.1,
    soilTemperature: 25.1,
    pH:              6.8,
    ec:              1.42,
    nitrogen:        52,
    phosphorus:      29,
    potassium:       45
  }
};

/* ----------------------------------------------------------------
   CLOUD API INTEGRATION POINT
   ----------------------------------------------------------------
   Right now this just returns the hardcoded `farmData` object above.
   When the ESP32 Gateway is pushing readings to the cloud, replace
   the body of this function with a real fetch, keeping the same
   shape { node1: {...}, node2: {...} } so nothing else in this file
   has to change:

     async function fetchFarmData() {
       const res = await fetch('https://your-api.example.com/farm-data');
       if (!res.ok) throw new Error('Failed to load farm data');
       return await res.json();
     }

   updateDashboard() below already calls this as `await fetchFarmData()`,
   so making this function real (and async) is the entire migration.
------------------------------------------------------------------- */
async function fetchFarmData() {
    const response = await fetch(
        "http://127.0.0.1:8000/api/farm-data"
    );

    if (!response.ok) {
        throw new Error("Failed to fetch farm data");
    }

    return await response.json();
}


/* ================================================================
   2. METRIC / THRESHOLD CONFIG
   ----------------------------------------------------------------
   Central place that defines how each sensor is displayed and what
   counts as an "ideal" range. Adjust these numbers to match real
   crop/soil targets — nothing else needs to change.
================================================================ */
const METRICS = [
  { key: 'moisture',        label: 'Soil Moisture',   unit: '%',     decimals: 0, min: 35, max: 65,
    icon: 'droplet' },
  { key: 'airTemperature',  label: 'Air Temp',        unit: '°C',    decimals: 1, min: 18, max: 32,
    icon: 'thermometer' },
  { key: 'airHumidity',     label: 'Air Humidity',    unit: '%',     decimals: 1, min: 50, max: 90,
    icon: 'cloud' },
  { key: 'soilTemperature', label: 'Soil Temp',       unit: '°C',    decimals: 1, min: 18, max: 30,
    icon: 'thermometer-soil' },
  { key: 'pH',              label: 'Soil pH',         unit: '',      decimals: 1, min: 6.0, max: 7.5,
    icon: 'flask' },
  { key: 'ec',              label: 'EC',              unit: 'dS/m',  decimals: 2, min: 1.0, max: 2.0,
    icon: 'bolt' },
  { key: 'nitrogen',        label: 'Nitrogen (N)',    unit: 'mg/kg', decimals: 0, min: 40, max: 80,
    icon: 'leaf' },
  { key: 'phosphorus',      label: 'Phosphorus (P)',  unit: 'mg/kg', decimals: 0, min: 25, max: 60,
    icon: 'leaf' },
  { key: 'potassium',       label: 'Potassium (K)',   unit: 'mg/kg', decimals: 0, min: 35, max: 70,
    icon: 'leaf' }
];

// Scale used purely for the NPK bar widths (mg/kg treated 0–max as "full bar")
const NPK_SCALE_MAX = 100;

const NODE_LABELS = { node1: 'Node 1', node2: 'Node 2' };

// Minimal inline icon set (stroke-based, matches the design system)
const ICONS = {
  droplet:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13Z"/></svg>',
  thermometer:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 14.5V4a2 2 0 1 0-4 0v10.5a4 4 0 1 0 4 0Z"/></svg>',
  cloud:            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.7-1.6A4 4 0 0 0 7 18Z"/></svg>',
  'thermometer-soil':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 14.5V4a2 2 0 1 0-4 0v10.5a4 4 0 1 0 4 0Z"/><path d="M2 21h20"/></svg>',
  flask:            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-11V2"/><path d="M8.5 2h7"/></svg>',
  bolt:             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
  leaf:             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 21c9 0 14-5 14-14V5h-2C8 5 5 12 5 21Z"/><path d="M5 21c0-4 3-8 8-10"/></svg>'
};


/* ================================================================
   3. CALCULATION LAYER
   ----------------------------------------------------------------
   Pure functions: given sensor data, they return a score / status /
   list of messages. None of them touch the DOM, which keeps them
   easy to unit test and easy to later replace with a real AI model
   response from the cloud.
================================================================ */

/**
 * DEMO soil health score (0–100).
 * Counts how many metrics fall inside their ideal [min,max] range
 * and converts that into a percentage. This is intentionally simple
 * so it's obvious where to plug in a real model later.
 *
 * CLOUD / AI INTEGRATION POINT:
 * Replace this function's body with the score returned by your
 * backend, e.g. `return cloudResponse.node1.aiSoilHealthScore;`
 * — callers just expect a number 0–100, so no other code changes.
 */
function computeSoilHealthScore(nodeData) {
  let inRange = 0;
  METRICS.forEach(m => {
    const v = nodeData[m.key];
    if (v >= m.min && v <= m.max) inRange++;
  });
  return Math.round((inRange / METRICS.length) * 100);
}

/** Maps a 0–100 score to a status bucket used across the whole UI. */
function scoreToStatus(score) {
  if (score >= 75) return 'healthy';
  if (score >= 50) return 'moderate';
  return 'attention';
}

/**
 * DEMO fertilizer recommendation.
 * Looks at NPK + pH + moisture and returns the single most relevant
 * action. Priority order: whichever nutrient/parameter is furthest
 * out of range wins.
 *
 * CLOUD / AI INTEGRATION POINT:
 * Replace the logic below with `return cloudResponse.node1.recommendation;`
 * once a real model is generating recommendations server-side.
 */
function generateRecommendation(nodeData, status) {
  const n = METRICS.find(m => m.key === 'nitrogen');
  const p = METRICS.find(m => m.key === 'phosphorus');
  const k = METRICS.find(m => m.key === 'potassium');
  const ph = METRICS.find(m => m.key === 'pH');
  const moist = METRICS.find(m => m.key === 'moisture');

  const deficits = [
    { label: 'Increase nitrogen availability', value: n.min - nodeData.nitrogen, active: nodeData.nitrogen < n.min },
    { label: 'Increase phosphorus availability', value: p.min - nodeData.phosphorus, active: nodeData.phosphorus < p.min },
    { label: 'Increase potassium availability', value: k.min - nodeData.potassium, active: nodeData.potassium < k.min },
    { label: 'Irrigate soon — moisture is low', value: moist.min - nodeData.moisture, active: nodeData.moisture < moist.min },
    { label: 'Improve drainage — moisture is high', value: nodeData.moisture - moist.max, active: nodeData.moisture > moist.max },
    { label: 'Apply lime to raise soil pH', value: ph.min - nodeData.pH, active: nodeData.pH < ph.min },
    { label: 'Apply sulfur to lower soil pH', value: nodeData.pH - ph.max, active: nodeData.pH > ph.max }
  ].filter(d => d.active);

  if (deficits.length === 0) {
    return 'Conditions are within target range — maintain current fertigation schedule.';
  }
  deficits.sort((a, b) => b.value - a.value);
  return deficits[0].label;
}

/**
 * DEMO alert generator.
 * Produces { node, type: 'warning'|'ok', message } entries for
 * every node based on the same threshold config used elsewhere.
 */
function generateAlerts(data) {
  const alerts = [];

  Object.keys(data).forEach(nodeKey => {
    const nd = data[nodeKey];
    const label = NODE_LABELS[nodeKey];
    let anyWarning = false;

    const ph = METRICS.find(m => m.key === 'pH');
    if (nd.pH < ph.min || nd.pH > ph.max) {
      alerts.push({ node: label, type: 'warning', message: 'Soil pH is outside the recommended range.' });
      anyWarning = true;
    }

    const moist = METRICS.find(m => m.key === 'moisture');
    if (nd.moisture < moist.min) {
      alerts.push({ node: label, type: 'warning', message: 'Soil moisture is low.' });
      anyWarning = true;
    } else if (nd.moisture > moist.max) {
      alerts.push({ node: label, type: 'warning', message: 'Soil moisture is high.' });
      anyWarning = true;
    }

    const ec = METRICS.find(m => m.key === 'ec');
    if (nd.ec < ec.min || nd.ec > ec.max) {
      alerts.push({ node: label, type: 'warning', message: 'Electrical conductivity is outside range.' });
      anyWarning = true;
    }

    const npkOk = ['nitrogen', 'phosphorus', 'potassium'].every(k => {
      const m = METRICS.find(x => x.key === k);
      return nd[k] >= m.min && nd[k] <= m.max;
    });
    if (!npkOk) {
      alerts.push({ node: label, type: 'warning', message: 'One or more NPK levels are outside range.' });
      anyWarning = true;
    } else {
      alerts.push({ node: label, type: 'ok', message: 'NPK levels are currently acceptable.' });
    }

    if (!anyWarning) {
      alerts.push({ node: label, type: 'ok', message: 'All readings within normal range.' });
    }
  });

  return alerts;
}


/* ================================================================
   4. RENDER LAYER
   ----------------------------------------------------------------
   Each function below owns one section of the page and writes into
   it via textContent / innerHTML built from data — index.html never
   contains sensor numbers directly.
================================================================ */

function formatValue(metric, rawValue) {
  return Number(rawValue).toFixed(metric.decimals);
}

function renderNodeCard(nodeKey, nodeData) {
  const card = document.getElementById(nodeKey === 'node1' ? 'node1Card' : 'node2Card');
  const label = NODE_LABELS[nodeKey];
  const score = computeSoilHealthScore(nodeData);
  const status = scoreToStatus(score);
  const statusText = { healthy: 'Healthy', moderate: 'Moderate', attention: 'Needs Attention' }[status];

  const sensorTiles = METRICS.map(m => `
    <div class="sensor-tile">
      <span class="icon">${ICONS[m.icon]}</span>
      <span class="sensor-label">${m.label}</span>
      <span class="sensor-value">${formatValue(m, nodeData[m.key])}<span class="unit">${m.unit}</span></span>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="node-card-head">
      <h3><span class="node-tag"></span>${label}</h3>
      <span class="node-badge status-${status}">${statusText}</span>
    </div>
    <div class="sensor-grid">${sensorTiles}</div>
    <div class="soil-core">
      <div class="soil-core-head">
        <span class="label">Soil Health</span>
        <span class="score">${score}<span class="of100">/100</span></span>
      </div>
      <div class="soil-core-track">
        <div class="soil-core-marker" style="left:${score}%;">
          <span class="flag">${score}</span>
          <span class="pin"></span>
        </div>
      </div>
      <div class="soil-core-scale"><span>0</span><span>50</span><span>100</span></div>
    </div>
  `;

  return { score, status };
}

function renderRecommendation(nodeKey, nodeData, status) {
  const label = NODE_LABELS[nodeKey];
  const statusText = { healthy: 'Healthy', moderate: 'Moderate', attention: 'Needs Attention' }[status];
  const action = generateRecommendation(nodeData, status);

  return `
    <div class="recommend-card status-${status}">
      <span class="rc-icon">${ICONS.leaf}</span>
      <div>
        <p class="rc-node">${label}</p>
        <p class="rc-action">${action}</p>
        <span class="rc-status">${statusText}</span>
      </div>
    </div>
  `;
}

function renderNPK(data) {
  const nutrients = [
    { key: 'nitrogen', label: 'Nitrogen (N)' },
    { key: 'phosphorus', label: 'Phosphorus (P)' },
    { key: 'potassium', label: 'Potassium (K)' }
  ];

  const panel = document.getElementById('npkPanel');
  panel.innerHTML = nutrients.map(n => {
    const v1 = data.node1[n.key];
    const v2 = data.node2[n.key];
    const w1 = Math.min(100, (v1 / NPK_SCALE_MAX) * 100);
    const w2 = Math.min(100, (v2 / NPK_SCALE_MAX) * 100);
    return `
      <div class="npk-row">
        <div class="npk-row-head"><span class="nutrient-name">${n.label}</span><span>mg/kg</span></div>
        <div class="npk-bars">
          <div class="npk-bar-line">
            <span class="node-key">Node 1</span>
            <span class="npk-bar-track"><span class="npk-bar-fill n1" style="width:${w1}%"></span></span>
            <span class="npk-bar-value">${v1}</span>
          </div>
          <div class="npk-bar-line">
            <span class="node-key">Node 2</span>
            <span class="npk-bar-track"><span class="npk-bar-fill n2" style="width:${w2}%"></span></span>
            <span class="npk-bar-value">${v2}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAlerts(data) {
  const alerts = generateAlerts(data);
  const list = document.getElementById('alertsList');
  list.innerHTML = alerts.map(a => `
    <li class="alert-item ${a.type}">
      <span class="a-icon">${a.type === 'warning' ? '⚠' : '✓'}</span>
      <span><span class="a-node">${a.node}:</span>${a.message}</span>
    </li>
  `).join('');
}

function renderComparison(data) {
  const rows = [
    { label: 'Moisture', key: 'moisture', unit: '%', decimals: 0 },
    { label: 'Air Temp', key: 'airTemperature', unit: '°C', decimals: 1 },
    { label: 'Air Humidity', key: 'airHumidity', unit: '%', decimals: 1 },
    { label: 'Soil Temp', key: 'soilTemperature', unit: '°C', decimals: 1 },
    { label: 'pH', key: 'pH', unit: '', decimals: 1 },
    { label: 'EC', key: 'ec', unit: ' dS/m', decimals: 2 },
    { label: 'Nitrogen', key: 'nitrogen', unit: ' mg/kg', decimals: 0 },
    { label: 'Phosphorus', key: 'phosphorus', unit: ' mg/kg', decimals: 0 },
    { label: 'Potassium', key: 'potassium', unit: ' mg/kg', decimals: 0 }
  ];

  const body = document.getElementById('comparisonBody');
  body.innerHTML = rows.map(r => `
    <tr>
      <td>${r.label}</td>
      <td>${Number(data.node1[r.key]).toFixed(r.decimals)}${r.unit}</td>
      <td>${Number(data.node2[r.key]).toFixed(r.decimals)}${r.unit}</td>
    </tr>
  `).join('');
}

function setGatewayStatus(connected) {
  const pill = document.getElementById('gatewayStatus');
  pill.classList.toggle('is-connected', connected);
  pill.classList.toggle('is-offline', !connected);
  pill.querySelector('.status-text').textContent = connected ? 'Gateway Connected' : 'Gateway Offline';
}

function updateLastUpdatedTime() {
  const el = document.getElementById('lastUpdated');
  el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}


/* ================================================================
   5. ORCHESTRATION
   ----------------------------------------------------------------
   updateDashboard() is the single function that ties the data layer
   to the render layer. Call it again (e.g. on a setInterval, or a
   websocket 'message' event) once live data is flowing, and every
   section on the page will refresh consistently.
================================================================ */
async function updateDashboard() {
  try {
    const data = await fetchFarmData();

    const n1 = renderNodeCard('node1', data.node1);
    const n2 = renderNodeCard('node2', data.node2);

    document.getElementById('recommendGrid').innerHTML =
      renderRecommendation('node1', data.node1, n1.status) +
      renderRecommendation('node2', data.node2, n2.status);

    renderNPK(data);
    renderAlerts(data);
    renderComparison(data);

    setGatewayStatus(true);
    updateLastUpdatedTime();
  } catch (err) {
    console.error('Dashboard update failed:', err);
    setGatewayStatus(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();

  setInterval(updateDashboard, 5000);

  // Example of future live polling once fetchFarmData() hits a real API:
  // setInterval(updateDashboard, 30000);
});
