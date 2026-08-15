# Smart Farm Soil Monitoring System

## Real-Time Multi-Node Soil Health Monitoring and Recommendation System

A multi-node IoT and AI-based smart farming system designed to monitor
soil and environmental conditions at multiple locations in a farm,
analyze the collected data using a Random Forest machine-learning model,
and provide soil-health insights, alerts, and actionable recommendations
through a web dashboard.

The system uses **ESP32 sensor nodes**, **ESP-NOW**, an **ESP32
gateway**, **ThingsBoard Cloud**, a **FastAPI backend**, and a **Random
Forest AI model**.

------------------------------------------------------------------------

## Table of Contents

-   [Project Overview](#project-overview)
-   [Objectives](#objectives)
-   [Key Features](#key-features)
-   [System Architecture](#system-architecture)
-   [Hardware Architecture](#hardware-architecture)
-   [Communication Architecture](#communication-architecture)
-   [Data Flow](#data-flow)
-   [AI/ML Pipeline](#aiml-pipeline)
-   [AI Decision and Recommendation](#ai-decision-and-recommendation)
-   [ThingsBoard Architecture](#thingsboard-architecture)
-   [Backend Architecture](#backend-architecture)
-   [Dashboard Architecture](#dashboard-architecture)
-   [Alert Generation](#alert-generation)
-   [Historical AI Analysis](#historical-ai-analysis)
-   [Node Comparison](#node-comparison)
-   [Demo Scenario](#demo-scenario)
-   [Parameters Monitored](#parameters-monitored)
-   [Technology Stack](#technology-stack)
-   [Project Development Phases](#project-development-phases)
-   [Project Structure](#project-structure)
-   [How the System Works](#how-the-system-works)
-   [How to Run the Project](#how-to-run-the-project)
-   [API Endpoints](#api-endpoints)
-   [Example AI Output](#example-ai-output)
-   [Future Scope](#future-scope)

------------------------------------------------------------------------

## Project Overview

Traditional soil monitoring often involves manually collecting soil
samples and testing them separately. This project aims to automate
continuous monitoring by deploying multiple ESP32-based sensor nodes at
different locations in a farm.

Each node collects soil and environmental parameters and sends the
readings wirelessly to an ESP32 gateway using **ESP-NOW**. The gateway
forwards the collected telemetry through Wi-Fi to **ThingsBoard Cloud**.

The **FastAPI backend** retrieves the telemetry, prepares the required
features, sends them to the **Random Forest model**, and combines the AI
prediction with a condition-based recommendation engine.

The resulting information is displayed on a web dashboard where the user
can:

-   Monitor multiple nodes in real time.
-   View soil and environmental parameters.
-   View AI soil-health classification.
-   View AI confidence.
-   View soil condition score.
-   Compare Node 1 and Node 2.
-   View NPK values.
-   Receive dynamically generated alerts.
-   View fertilizer/soil-management recommendations.
-   View historical AI predictions.

------------------------------------------------------------------------

## Objectives

1.  Monitor soil conditions at multiple locations.
2.  Collect soil and environmental parameters using ESP32 sensor nodes.
3.  Establish wireless communication between sensor nodes and gateway.
4.  Send telemetry to a cloud platform.
5.  Analyze sensor data using machine learning.
6.  Classify soil health.
7.  Generate actionable recommendations.
8.  Detect abnormal or critical soil conditions.
9.  Maintain historical AI analysis.
10. Provide a centralized web dashboard for farm monitoring.

------------------------------------------------------------------------

## Key Features

### Multi-Node Monitoring

The prototype uses:

-   Node 1
-   Node 2
-   ESP32 Gateway

Each node represents a different monitored area of the farm.

### Real-Time Telemetry

The system monitors:

-   Soil moisture
-   Soil pH
-   Electrical conductivity
-   Nitrogen
-   Phosphorus
-   Potassium
-   Soil temperature
-   Air temperature
-   Air humidity

### AI Soil Health Classification

A Random Forest model processes the sensor features and produces:

-   Soil health prediction
-   Confidence score

### Recommendation Engine

The recommendation layer examines field conditions and generates actions
such as:

-   Irrigation recommended
-   Correct soil alkalinity
-   Other condition-specific recommendations

### Alerts

The dashboard dynamically displays alerts when monitored parameters fall
outside the configured target ranges.

### Historical Analysis

AI predictions are recorded with information such as:

-   Timestamp
-   Node
-   Prediction
-   Confidence
-   Priority
-   Action
-   Reason
-   Issue count

------------------------------------------------------------------------

# System Architecture

``` mermaid
flowchart TB
    subgraph FARM["FARM FIELD"]
        N1["Node 1<br/>ESP32 + Sensors"]
        N2["Node 2<br/>ESP32 + Sensors"]
        GW["Gateway<br/>ESP32"]
    end

    N1 -->|"ESP-NOW"| GW
    N2 -->|"ESP-NOW"| GW
    GW -->|"Wi-Fi / Internet"| TB["ThingsBoard Cloud"]
    TB -->|"REST API"| API["FastAPI Backend"]
    API --> ML["Random Forest<br/>ML Model"]
    API --> RE["Recommendation /<br/>Decision Engine"]
    ML --> DASH["Web Dashboard"]
    RE --> DASH
```

------------------------------------------------------------------------

# Hardware Architecture

Each sensor node is built around an ESP32 and is intended to monitor
soil and environmental parameters.

``` mermaid
flowchart TB
    N1["NODE 1<br/>ESP32"]
    M1["Soil Moisture"]
    PH1["Soil pH"]
    EC1["EC"]
    NPK1["NPK"]
    D1["DHT22<br/>Air Temp + Humidity"]
    S1["DS18B20<br/>Soil Temp"]

    N1 --> M1
    N1 --> PH1
    N1 --> EC1
    N1 --> NPK1
    N1 --> D1
    N1 --> S1

    N2["NODE 2<br/>ESP32"]
    M2["Soil Moisture"]
    PH2["Soil pH"]
    EC2["EC"]
    NPK2["NPK"]
    D2["DHT22<br/>Air Temp + Humidity"]
    S2["DS18B20<br/>Soil Temp"]

    N2 --> M2
    N2 --> PH2
    N2 --> EC2
    N2 --> NPK2
    N2 --> D2
    N2 --> S2
```

------------------------------------------------------------------------

# Communication Architecture

``` mermaid
flowchart LR
    N1["Node 1 ESP32"]
    N2["Node 2 ESP32"]
    GW["Gateway ESP32"]
    TB["ThingsBoard"]
    API["FastAPI"]
    UI["Dashboard"]

    N1 -->|"ESP-NOW"| GW
    N2 -->|"ESP-NOW"| GW
    GW -->|"Wi-Fi"| TB
    TB -->|"REST API"| API
    API -->|"HTTP / JSON"| UI
```

  Layer                   Technology    Purpose
  ----------------------- ------------- ------------------------------
  Node → Gateway          ESP-NOW       Local wireless communication
  Gateway → Cloud         Wi-Fi         Internet connectivity
  ThingsBoard → Backend   REST API      Telemetry retrieval
  Backend → Dashboard     HTTP / JSON   Application data delivery

------------------------------------------------------------------------

# Data Flow

``` mermaid
flowchart TD
    S["Soil and Environmental Sensors"]
    N["ESP32 Sensor Nodes"]
    G["ESP32 Gateway"]
    T["ThingsBoard Cloud"]
    F["FastAPI Backend"]
    ML["Random Forest Model"]
    R["Recommendation Engine"]
    D["Web Dashboard"]

    S --> N
    N -->|"ESP-NOW"| G
    G -->|"Wi-Fi"| T
    T -->|"REST API"| F
    F --> ML
    F --> R
    ML --> D
    R --> D
```

The complete data path is:

**Sensors → ESP32 Nodes → ESP-NOW → ESP32 Gateway → Wi-Fi → ThingsBoard
→ FastAPI → AI/Recommendation Engine → Dashboard**

------------------------------------------------------------------------

# AI/ML Pipeline

The Random Forest model uses the following nine input features in this
exact order:

``` text
moisture
pH
EC
nitrogen
phosphorus
potassium
soilTemperature
airTemperature
airHumidity
```

``` mermaid
flowchart TD
    DATA["Live Sensor Data"]
    FEATURES["Nine Input Features"]
    PREP["Feature Preparation"]
    RF["Random Forest"]
    PRED["Soil Health Prediction"]
    CONF["Confidence Score"]
    OUT["AI Analysis"]

    DATA --> FEATURES
    FEATURES --> PREP
    PREP --> RF
    RF --> PRED
    RF --> CONF
    PRED --> OUT
    CONF --> OUT
```

The model receives the prepared sensor features and produces a
soil-health classification along with a confidence value.

------------------------------------------------------------------------

# AI Decision and Recommendation

The ML model classifies soil health. A separate
condition-analysis/recommendation layer checks important field
parameters and generates actionable guidance.

``` mermaid
flowchart TD
    LIVE["Live Sensor Data"]
    RF["Random Forest"]
    HEALTH["Soil Health Classification"]
    CHECK["Condition Analysis"]
    MOIST["Moisture Check"]
    PH["pH Check"]
    NPK["NPK and EC Check"]
    REC["Recommendation"]

    LIVE --> RF
    RF --> HEALTH
    HEALTH --> CHECK
    CHECK --> MOIST
    CHECK --> PH
    CHECK --> NPK
    MOIST --> REC
    PH --> REC
    NPK --> REC
```

### Example

``` text
Moisture = 0%
        ↓
Below target range
        ↓
HIGH priority
        ↓
Irrigation recommended
```

This separates **AI classification** from **condition-based
recommendations**. The AI model determines the soil-health class, while
the recommendation layer interprets critical field conditions and
suggests an action.

------------------------------------------------------------------------

# ThingsBoard Architecture

ThingsBoard acts as the cloud telemetry layer between the ESP32 gateway
and the backend.

``` mermaid
flowchart TD
    GW["ESP32 Gateway"]
    TB["ThingsBoard Cloud"]
    D1["Node 1 Device"]
    D2["Node 2 Device"]
    T1["Node 1 Telemetry"]
    T2["Node 2 Telemetry"]
    API["FastAPI Backend"]

    GW -->|"Wi-Fi"| TB
    TB --> D1
    TB --> D2
    D1 --> T1
    D2 --> T2
    T1 -->|"REST API"| API
    T2 -->|"REST API"| API
```

### Expected Telemetry Keys

``` text
moisture
airTemperature
airHumidity
soilTemperature
pH
EC
nitrogen
phosphorus
potassium
```

------------------------------------------------------------------------

# Backend Architecture

The backend is implemented using FastAPI and provides APIs for farm
data, AI prediction, live node analysis, and historical AI analysis.

``` mermaid
flowchart TD
    TB["ThingsBoard"]
    API["FastAPI Backend"]
    FARM["Farm Data API"]
    PRED["AI Prediction API"]
    LIVE["Live Node Prediction"]
    HIST["AI History API"]
    ML["Random Forest"]
    DEC["Recommendation Engine"]
    UI["Web Dashboard"]

    TB --> API

    API --> FARM
    API --> PRED
    API --> LIVE
    API --> HIST
    API --> DEC

    PRED --> ML
    LIVE --> ML

    FARM --> UI
    PRED --> UI
    LIVE --> UI
    HIST --> UI
    DEC --> UI
```

------------------------------------------------------------------------

# Dashboard Architecture

The dashboard provides a centralized view of the farm.

``` mermaid
flowchart TB
    DASH["SMART FARM DASHBOARD"]
    NODE["Node Monitoring"]
    AI["AI Analysis"]
    ALERT["Alerts"]
    COMP["Farm Comparison"]
    NPK["NPK Visualization"]
    HIST["AI History"]

    DASH --> NODE
    DASH --> AI
    DASH --> ALERT
    DASH --> COMP
    DASH --> NPK
    DASH --> HIST

    NODE --> N1["Node 1"]
    NODE --> N2["Node 2"]
    AI --> P["Prediction + Confidence + Soil Score"]
    ALERT --> A["Dynamic Alerts"]
    COMP --> C["Node 1 vs Node 2"]
    NPK --> NV["N / P / K Comparison"]
    HIST --> H["Historical Predictions"]
```

The dashboard includes:

-   Node overview
-   Live sensor readings
-   AI soil-health prediction
-   AI confidence
-   Soil condition score
-   Fertilizer/soil recommendations
-   NPK visualization
-   Dynamic alerts
-   Farm comparison
-   Historical AI analysis

------------------------------------------------------------------------

# Alert Generation

``` mermaid
flowchart TB
    DATA["Live Telemetry"]
    CHECK["Threshold / Condition Check"]
    M["Moisture"]
    PH["pH"]
    NPK["NPK / EC"]
    ISSUE{"Issue?"}
    NORMAL["No Alert"]
    ALERT["Generate Alert"]
    PRIORITY["Assign Priority"]
    ACTION["Recommended Action"]
    UI["Dashboard"]

    DATA --> CHECK
    CHECK --> M
    CHECK --> PH
    CHECK --> NPK
    M --> ISSUE
    PH --> ISSUE
    NPK --> ISSUE
    ISSUE -->|"No"| NORMAL
    ISSUE -->|"Yes"| ALERT
    ALERT --> PRIORITY
    PRIORITY --> ACTION
    ACTION --> UI
```

The alert system evaluates the live telemetry against configured
conditions.

For example:

-   Very low soil moisture → irrigation alert
-   High soil pH → soil alkalinity alert

------------------------------------------------------------------------

# Historical AI Analysis

Every AI analysis can be recorded for later inspection.

``` mermaid
flowchart TB
    LIVE["Live Sensor Data"]
    PRED["AI Prediction"]
    RECORD["Prediction Record"]
    HISTORY["AI History"]
    N1["Node 1 History"]
    N2["Node 2 History"]

    LIVE --> PRED
    PRED --> RECORD
    RECORD --> HISTORY
    HISTORY --> N1
    HISTORY --> N2
```

A history record contains information such as:

-   Timestamp
-   Node
-   Prediction
-   Confidence
-   Priority
-   Action
-   Reason
-   Issue count

### History Endpoints

``` text
GET /api/ai/history/1
GET /api/ai/history/2
```

------------------------------------------------------------------------

# Node Comparison

The system can compare different monitored areas of the same farm.

``` mermaid
flowchart TB
    FARM["Farm Analysis"]
    N1["Node 1"]
    N2["Node 2"]
    S1["Node 1 Sensor Data"]
    S2["Node 2 Sensor Data"]
    COMP["Comparative Analysis"]
    M["Moisture"]
    T["Temperature"]
    PH["pH"]
    EC["EC"]
    NPK["NPK"]

    FARM --> N1
    FARM --> N2
    N1 --> S1
    N2 --> S2
    S1 --> COMP
    S2 --> COMP
    COMP --> M
    COMP --> T
    COMP --> PH
    COMP --> EC
    COMP --> NPK
```

This is important because different areas of the same farm may have
different soil conditions.

For example, one area may have sufficient moisture while another area
may be completely dry. The system can therefore provide **node-specific
recommendations rather than one recommendation for the entire farm**.

------------------------------------------------------------------------

# Demo Scenario

The prototype demonstrates different soil conditions at the two nodes.

``` mermaid
flowchart TB
    FARM["LIVE FARM"]
    N1["NODE 1"]
    N2["NODE 2"]
    PH["pH = 9.15"]
    MOIST["Moisture = 0%"]
    ALK["High Soil Alkalinity"]
    DRY["Dry Soil"]
    A1["Correct Soil Alkalinity"]
    A2["Irrigation Recommended"]
    AI["AI + Recommendation Engine"]
    DASH["Dashboard Alerts"]

    FARM --> N1
    FARM --> N2
    N1 --> PH
    N2 --> MOIST
    PH --> ALK
    MOIST --> DRY
    ALK --> A1
    DRY --> A2
    A1 --> AI
    A2 --> AI
    AI --> DASH
```

During demonstration, Node 2 can be placed in dry soil to demonstrate
the system's response to extremely low soil moisture.

The current example behavior is:

### Node 1

-   Soil pH ≈ 9.15
-   AI prediction: Healthy
-   AI confidence: 71.5%
-   Recommendation: Correct soil alkalinity
-   Priority: HIGH

### Node 2

-   Soil moisture = 0%
-   AI prediction: Healthy
-   AI confidence: 73.5%
-   Recommendation: Irrigation recommended
-   Priority: HIGH

The important point is that **AI classification and field-condition
recommendations are separate outputs**. A node can be classified as
Healthy by the current model while still receiving a high-priority
recommendation because a specific parameter requires attention.

------------------------------------------------------------------------

# Parameters Monitored

  Parameter          Unit       Purpose
  ------------------ ---------- ------------------------------------
  Soil Moisture      \%         Determines soil water availability
  Soil pH            pH scale   Indicates soil acidity/alkalinity
  EC                 dS/m       Indicates electrical conductivity
  Nitrogen           mg/kg      Nutrient monitoring
  Phosphorus         mg/kg      Nutrient monitoring
  Potassium          mg/kg      Nutrient monitoring
  Soil Temperature   °C         Monitors soil thermal condition
  Air Temperature    °C         Environmental monitoring
  Air Humidity       \%         Environmental monitoring

------------------------------------------------------------------------

# Technology Stack

## Hardware

-   ESP32 × 3
    -   Node 1
    -   Node 2
    -   Gateway
-   Soil moisture sensors
-   Soil pH sensors
-   EC sensors
-   NPK sensors
-   DHT22
-   DS18B20
-   Breadboards
-   Jumper wires

## Communication

-   ESP-NOW
-   Wi-Fi

## Cloud

-   ThingsBoard Cloud

## Backend

-   Python
-   FastAPI
-   Uvicorn

## Machine Learning

-   Random Forest
-   Python ML pipeline

## Frontend

-   HTML
-   CSS
-   JavaScript

------------------------------------------------------------------------

# Project Development Phases

## Phase 1 --- Problem Identification

The project started from the problem of manually monitoring soil
conditions across different areas of a farm.

The goal was to create a system capable of continuously collecting soil
data and providing area-specific insights.

------------------------------------------------------------------------

## Phase 2 --- System Design

A multi-node architecture was selected:

``` text
Node 1 ──┐
         ├──> Gateway ──> Cloud ──> Backend ──> Dashboard
Node 2 ──┘
```

Using multiple nodes allows the system to monitor different areas
independently.

------------------------------------------------------------------------

## Phase 3 --- Hardware Setup

ESP32 sensor nodes were assembled with sensors for:

-   Moisture
-   pH
-   EC
-   NPK
-   Air temperature/humidity
-   Soil temperature

A separate ESP32 was configured as the gateway.

------------------------------------------------------------------------

## Phase 4 --- Node Programming

Each ESP32 node was programmed to read its connected sensors and prepare
the readings for transmission.

The sensor nodes were configured to communicate with the gateway using
ESP-NOW.

------------------------------------------------------------------------

## Phase 5 --- Gateway Communication

The gateway receives readings from the sensor nodes and acts as the
bridge between the local sensor network and the Internet.

``` text
Sensor Nodes
     ↓
 ESP-NOW
     ↓
 Gateway ESP32
     ↓
   Wi-Fi
```

------------------------------------------------------------------------

## Phase 6 --- Cloud Integration

ThingsBoard was introduced as the cloud telemetry platform.

The gateway forwards telemetry through Wi-Fi, allowing the sensor data
to be stored and accessed by the backend.

------------------------------------------------------------------------

## Phase 7 --- Backend Development

A FastAPI backend was developed to:

-   Retrieve farm telemetry.
-   Process node data.
-   Provide API endpoints.
-   Connect the live data with the AI pipeline.
-   Generate recommendations.
-   Maintain AI prediction history.

------------------------------------------------------------------------

## Phase 8 --- AI/ML Integration

The Random Forest model was integrated into the backend.

The model receives nine features:

``` text
moisture
pH
EC
nitrogen
phosphorus
potassium
soilTemperature
airTemperature
airHumidity
```

It produces a soil-health prediction and confidence score.

------------------------------------------------------------------------

## Phase 9 --- Recommendation Engine

The project then added a condition-analysis layer.

This layer checks important parameters and converts detected conditions
into actionable recommendations.

Example:

``` text
Moisture = 0%
        ↓
Below target range
        ↓
HIGH priority
        ↓
Irrigation recommended
```

------------------------------------------------------------------------

## Phase 10 --- Alert System

Dynamic alerts were added to make important conditions visible
immediately on the dashboard.

The alert engine evaluates conditions such as:

-   Low moisture
-   High pH
-   Other configured parameter limits

------------------------------------------------------------------------

## Phase 11 --- Historical AI Analysis

AI predictions were recorded so that the system could provide historical
analysis for each node.

This makes it possible to inspect how the AI analysis changes over time.

------------------------------------------------------------------------

## Phase 12 --- Dashboard Development

A web dashboard was developed to combine:

-   Live telemetry
-   AI predictions
-   Confidence
-   Soil score
-   Recommendations
-   Alerts
-   NPK visualization
-   Node comparison
-   AI history

------------------------------------------------------------------------

## Phase 13 --- Multi-Node Demonstration

Node 1 and Node 2 were tested as separate field locations.

The demo demonstrates that different nodes can produce different
recommendations based on their local conditions.

------------------------------------------------------------------------

# How the System Works

The complete execution sequence is:

``` text
1. Sensors collect readings
          ↓
2. ESP32 nodes process readings
          ↓
3. Nodes transmit data using ESP-NOW
          ↓
4. Gateway receives node data
          ↓
5. Gateway sends telemetry through Wi-Fi
          ↓
6. ThingsBoard receives cloud telemetry
          ↓
7. FastAPI retrieves telemetry
          ↓
8. Backend prepares AI features
          ↓
9. Random Forest predicts soil health
          ↓
10. Recommendation engine checks conditions
          ↓
11. Alerts and recommendations are generated
          ↓
12. Dashboard displays the results
          ↓
13. AI results are stored for historical analysis
```

------------------------------------------------------------------------

# How to Run the Project

## Prerequisites

Install the following:

-   Arduino IDE
-   ESP32 board support
-   Python 3.x
-   Git
-   A ThingsBoard Cloud account
-   Wi-Fi connection

------------------------------------------------------------------------

## 1. Clone the Repository

``` bash
git clone <REPOSITORY_URL>
cd Smart-Soil-Fertility-Monitoring-and-Recommendation-System-Using-IoT-and-AI
```

------------------------------------------------------------------------

## 2. Create a Python Virtual Environment

Windows PowerShell:

``` powershell
python -m venv .venv
```

Activate it:

``` powershell
.\.venv\Scripts\Activate.ps1
```

If activation is blocked by PowerShell execution policy, use an
appropriate PowerShell execution-policy setting or activate the
environment through Command Prompt instead.

------------------------------------------------------------------------

## 3. Install Backend Dependencies

If the repository contains `requirements.txt`:

``` powershell
pip install -r requirements.txt
```

If dependencies are managed differently in the repository, install the
packages specified by the project's backend configuration.

------------------------------------------------------------------------

## 4. Configure ThingsBoard

Create/configure the required ThingsBoard devices for the sensor nodes
and obtain the required credentials/access details.

Configure the gateway according to the project's ESP32 firmware.

The telemetry keys expected by the backend are:

``` text
moisture
airTemperature
airHumidity
soilTemperature
pH
EC
nitrogen
phosphorus
potassium
```

------------------------------------------------------------------------

## 5. Configure ESP32 Nodes

Open the corresponding ESP32 sketches in Arduino IDE.

Configure:

-   ESP32 board
-   Sensor pins
-   Gateway MAC address
-   Required Wi-Fi settings
-   ThingsBoard/cloud configuration where applicable

Upload the node firmware to:

``` text
Node 1 ESP32
Node 2 ESP32
```

------------------------------------------------------------------------

## 6. Configure the ESP32 Gateway

Upload the gateway firmware to the gateway ESP32.

The gateway is responsible for receiving ESP-NOW messages from the nodes
and forwarding the collected telemetry through Wi-Fi.

Make sure the gateway has the correct:

-   Wi-Fi SSID
-   Wi-Fi password
-   ThingsBoard/cloud configuration
-   Node communication configuration

------------------------------------------------------------------------

## 7. Start the FastAPI Backend

From the backend/project directory:

``` powershell
uvicorn app.main:app --reload
```

The backend should normally become available at:

``` text
http://127.0.0.1:8000
```

FastAPI Swagger documentation:

``` text
http://127.0.0.1:8000/docs
```

------------------------------------------------------------------------

## 8. Start the Dashboard

Open the project's frontend/dashboard according to the repository
structure.

If the dashboard is served directly as static HTML, open the relevant
HTML page or serve the frontend using the project's configured frontend
method.

Make sure the dashboard is configured to communicate with:

``` text
http://127.0.0.1:8000
```

------------------------------------------------------------------------

## 9. Verify the System

Check the following sequence:

``` text
ESP32 Node 1
      ↓
ESP32 Node 2
      ↓
ESP32 Gateway
      ↓
ThingsBoard
      ↓
FastAPI
      ↓
Random Forest
      ↓
Recommendation Engine
      ↓
Dashboard
```

Then verify:

-   Node 1 is visible.
-   Node 2 is visible.
-   Sensor readings are updating.
-   ThingsBoard telemetry is updating.
-   AI predictions are generated.
-   Recommendations are generated.
-   Alerts appear when conditions cross thresholds.
-   AI history endpoints return records.

------------------------------------------------------------------------

# API Endpoints

The backend exposes APIs for different parts of the application.

### AI History --- Node 1

``` http
GET /api/ai/history/1
```

### AI History --- Node 2

``` http
GET /api/ai/history/2
```

Example response structure:

``` json
{
  "node": "Node 2",
  "count": 50,
  "history": [
    {
      "timestamp": "2026-08-16T00:04:41.190434",
      "node": "Node 2",
      "prediction": "Healthy",
      "confidence": 73.5,
      "priority": "HIGH",
      "action": "Irrigation recommended",
      "reason": "Soil moisture is 0.0%, which is below the target range.",
      "issueCount": 1
    }
  ]
}
```

------------------------------------------------------------------------

# Example AI Output

## Node 1

``` text
AI Soil Health: Healthy
AI Confidence: 71.5%

Soil pH: 9.15

Priority: HIGH

Recommendation:
Correct soil alkalinity

Reason:
Soil pH is above the target range.
```

## Node 2

``` text
AI Soil Health: Healthy
AI Confidence: 73.5%

Soil Moisture: 0%

Priority: HIGH

Recommendation:
Irrigation recommended

Reason:
Soil moisture is below the target range.
```

------------------------------------------------------------------------

# Important Design Principle

The system deliberately separates two concepts:

### 1. AI Soil Health Classification

The Random Forest model determines the predicted soil-health class and
confidence.

### 2. Condition-Based Recommendation

The recommendation layer examines important field parameters and
determines whether an action is required.

Therefore:

``` text
AI Prediction
      +
Field Condition Analysis
      ↓
Actionable Recommendation
```

This allows the dashboard to communicate both the model's classification
and practical field-management actions.

------------------------------------------------------------------------

# Future Scope

The current prototype can be extended with:

-   More sensor nodes
-   Larger farm coverage
-   Automated irrigation control
-   Automated fertilizer dosing
-   Crop-specific recommendation models
-   Historical trend visualization
-   Weather API integration
-   Yield prediction
-   Soil-health forecasting
-   Mobile application
-   Role-based access control
-   Advanced time-series models
-   Edge AI
-   Solar-powered sensor nodes
-   GPS-based farm mapping
-   Geospatial soil-health visualization

------------------------------------------------------------------------

# Project Summary

The **Smart Farm Soil Monitoring System** combines IoT, wireless sensor
networking, cloud telemetry, backend APIs, machine learning, and a web
dashboard into a multi-node smart agriculture platform.

The system continuously collects soil and environmental data from
multiple farm locations, transfers the readings through an ESP32
gateway, stores/serves telemetry through ThingsBoard, analyzes the data
using a Random Forest model, and generates condition-specific
recommendations and alerts.

The core workflow is:

``` text
MONITOR
   ↓
ANALYZE
   ↓
RECOMMEND
   ↓
ACT
```

The prototype demonstrates how multiple areas of a farm can be monitored
independently and how the resulting data can be converted into
AI-assisted, actionable soil-management information.
