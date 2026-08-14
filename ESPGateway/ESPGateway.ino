#include <WiFi.h>
#include <PubSubClient.h>
#include <esp_now.h>

// ======================================================
// Wi-Fi
// ======================================================

const char* ssid = "faria";
const char* password = "YOUR_WIFI_PASSWORD";

// ======================================================
// ThingsBoard
// ======================================================

const char* thingsboardServer = "mqtt.thingsboard.cloud";
const int thingsboardPort = 1883;

// PUT YOUR SMART FARM GATEWAY ACCESS TOKEN HERE
const char* thingsboardToken = "PASTE_YOUR_GATEWAY_TOKEN_HERE";

// ======================================================
// ThingsBoard downstream device names
// These MUST exactly match the names in ThingsBoard
// ======================================================

const char* node1Name = "Farm Node 1";
const char* node2Name = "Farm Node 2";

// ======================================================
// Wi-Fi / MQTT
// ======================================================

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ======================================================
// Sensor data structure
// Must match Node 1 and Node 2
// ======================================================

typedef struct struct_message {

  int nodeID;

  float moisture;

  float airTemperature;
  float airHumidity;

  float soilTemperature;

  float pH;
  float ec;

  float nitrogen;
  float phosphorus;
  float potassium;

} struct_message;

struct_message incomingData;

// ======================================================
// Flags for received data
// ======================================================

volatile bool newDataReceived = false;

struct_message latestNode1;
struct_message latestNode2;

bool node1Received = false;
bool node2Received = false;


// ======================================================
// ESP-NOW RECEIVE CALLBACK
// ======================================================

void OnDataRecv(const esp_now_recv_info_t *recv_info,
                const uint8_t *incomingDataBytes,
                int len) {

  if (len != sizeof(struct_message)) {

    Serial.println("Received packet size mismatch!");

    return;
  }

  struct_message received;

  memcpy(&received, incomingDataBytes, sizeof(received));

  // -----------------------------
  // Node 1
  // -----------------------------

  if (received.nodeID == 1) {

    memcpy(&latestNode1,
           &received,
           sizeof(struct_message));

    node1Received = true;
  }

  // -----------------------------
  // Node 2
  // -----------------------------

  else if (received.nodeID == 2) {

    memcpy(&latestNode2,
           &received,
           sizeof(struct_message));

    node2Received = true;
  }

  newDataReceived = true;
}


// ======================================================
// Print Node Data
// ======================================================

void printNodeData(struct_message data) {

  Serial.println();
  Serial.println("========================================");

  Serial.print("Node ID          : ");
  Serial.println(data.nodeID);

  Serial.print("Moisture         : ");
  Serial.print(data.moisture, 2);
  Serial.println(" %");

  Serial.print("Air Temperature  : ");
  Serial.print(data.airTemperature, 2);
  Serial.println(" °C");

  Serial.print("Air Humidity     : ");
  Serial.print(data.airHumidity, 2);
  Serial.println(" %");

  Serial.print("Soil Temperature : ");
  Serial.print(data.soilTemperature, 2);
  Serial.println(" °C");

  Serial.println("----------------------------------------");

  Serial.print("pH               : ");
  Serial.println(data.pH, 2);

  Serial.print("EC               : ");
  Serial.println(data.ec, 2);

  Serial.print("Nitrogen (N)     : ");
  Serial.println(data.nitrogen, 2);

  Serial.print("Phosphorus (P)   : ");
  Serial.println(data.phosphorus, 2);

  Serial.print("Potassium (K)    : ");
  Serial.println(data.potassium, 2);

  Serial.println("========================================");
}


// ======================================================
// Connect Wi-Fi
// ======================================================

void connectWiFi() {

  Serial.println();
  Serial.println("========================================");
  Serial.println("        CONNECTING TO WI-FI");
  Serial.println("========================================");

  WiFi.mode(WIFI_STA);

  WiFi.begin(ssid, password);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 30) {

    delay(500);

    Serial.print(".");

    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("Wi-Fi connected!");

    Serial.print("IP Address   : ");
    Serial.println(WiFi.localIP());

    Serial.print("Wi-Fi MAC     : ");
    Serial.println(WiFi.macAddress());

    Serial.print("Wi-Fi Channel : ");
    Serial.println(WiFi.channel());

    Serial.println("========================================");

  } else {

    Serial.println("Wi-Fi connection FAILED!");

  }
}


// ======================================================
// Connect MQTT
// ======================================================

void connectMQTT() {

  while (!mqttClient.connected()) {

    Serial.println();
    Serial.println("Connecting to ThingsBoard...");

    String clientID = "ESP32-Gateway";

    if (mqttClient.connect(clientID.c_str(),
                           thingsboardToken,
                           NULL)) {

      Serial.println("ThingsBoard MQTT connected!");

      Serial.println("========================================");

      // ------------------------------------------
      // Announce Node 1
      // ------------------------------------------

      String connectNode1 =
        "{\"device\":\"" + String(node1Name) + "\"}";

      mqttClient.publish(
        "v1/gateway/connect",
        connectNode1.c_str()
      );

      Serial.println("Farm Node 1 connected to ThingsBoard.");

      // ------------------------------------------
      // Announce Node 2
      // ------------------------------------------

      String connectNode2 =
        "{\"device\":\"" + String(node2Name) + "\"}";

      mqttClient.publish(
        "v1/gateway/connect",
        connectNode2.c_str()
      );

      Serial.println("Farm Node 2 connected to ThingsBoard.");

    } else {

      Serial.print("MQTT connection failed, state = ");
      Serial.println(mqttClient.state());

      Serial.println("Retrying in 5 seconds...");

      delay(5000);
    }
  }
}


// ======================================================
// Send Node 1 telemetry
// ======================================================

void sendNode1Telemetry() {

  String payload = "{";

  payload += "\"Farm Node 1\":[{";

  payload += "\"moisture\":";
  payload += String(latestNode1.moisture, 2);

  payload += ",\"airTemperature\":";
  payload += String(latestNode1.airTemperature, 2);

  payload += ",\"airHumidity\":";
  payload += String(latestNode1.airHumidity, 2);

  payload += ",\"soilTemperature\":";
  payload += String(latestNode1.soilTemperature, 2);

  payload += ",\"pH\":";
  payload += String(latestNode1.pH, 2);

  payload += ",\"EC\":";
  payload += String(latestNode1.ec, 2);

  payload += ",\"nitrogen\":";
  payload += String(latestNode1.nitrogen, 2);

  payload += ",\"phosphorus\":";
  payload += String(latestNode1.phosphorus, 2);

  payload += ",\"potassium\":";
  payload += String(latestNode1.potassium, 2);

  payload += "}]}";

  bool success = mqttClient.publish(
    "v1/gateway/telemetry",
    payload.c_str()
  );

  if (success) {

    Serial.println();
    Serial.println("Node 1 telemetry sent to ThingsBoard.");

  } else {

    Serial.println();
    Serial.println("Node 1 telemetry FAILED.");

  }
}


// ======================================================
// Send Node 2 telemetry
// ======================================================

void sendNode2Telemetry() {

  String payload = "{";

  payload += "\"Farm Node 2\":[{";

  payload += "\"moisture\":";
  payload += String(latestNode2.moisture, 2);

  payload += ",\"airTemperature\":";
  payload += String(latestNode2.airTemperature, 2);

  payload += ",\"airHumidity\":";
  payload += String(latestNode2.airHumidity, 2);

  payload += ",\"soilTemperature\":";
  payload += String(latestNode2.soilTemperature, 2);

  payload += ",\"pH\":";
  payload += String(latestNode2.pH, 2);

  payload += ",\"EC\":";
  payload += String(latestNode2.ec, 2);

  payload += ",\"nitrogen\":";
  payload += String(latestNode2.nitrogen, 2);

  payload += ",\"phosphorus\":";
  payload += String(latestNode2.phosphorus, 2);

  payload += ",\"potassium\":";
  payload += String(latestNode2.potassium, 2);

  payload += "}]}";

  bool success = mqttClient.publish(
    "v1/gateway/telemetry",
    payload.c_str()
  );

  if (success) {

    Serial.println();
    Serial.println("Node 2 telemetry sent to ThingsBoard.");

  } else {

    Serial.println();
    Serial.println("Node 2 telemetry FAILED.");

  }
}


// ======================================================
// SETUP
// ======================================================

void setup() {

  Serial.begin(115200);

  delay(2000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("           ESP32 GATEWAY");
  Serial.println("========================================");

  // ----------------------------------------------------
  // Wi-Fi
  // ----------------------------------------------------

  WiFi.mode(WIFI_STA);

  Serial.print("Gateway MAC Address: ");
  Serial.println(WiFi.macAddress());

  connectWiFi();

  // ----------------------------------------------------
  // MQTT
  // ----------------------------------------------------

  mqttClient.setServer(
    thingsboardServer,
    thingsboardPort
  );

  // ----------------------------------------------------
  // ESP-NOW
  // ----------------------------------------------------

  if (esp_now_init() != ESP_OK) {

    Serial.println("ESP-NOW initialization FAILED!");

    return;
  }

  Serial.println("ESP-NOW initialized.");

  esp_now_register_recv_cb(OnDataRecv);

  // ----------------------------------------------------
  // MQTT connection
  // ----------------------------------------------------

  if (WiFi.status() == WL_CONNECTED) {

    connectMQTT();
  }

  Serial.println();
  Serial.println("Gateway is ready.");
  Serial.println("========================================");
}


// ======================================================
// LOOP
// ======================================================

void loop() {

  // ----------------------------------------------------
  // Wi-Fi reconnect
  // ----------------------------------------------------

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("Wi-Fi disconnected!");

    connectWiFi();
  }

  // ----------------------------------------------------
  // MQTT reconnect
  // ----------------------------------------------------

  if (WiFi.status() == WL_CONNECTED &&
      !mqttClient.connected()) {

    connectMQTT();
  }

  mqttClient.loop();

  // ----------------------------------------------------
  // Process new ESP-NOW data
  // ----------------------------------------------------

  if (newDataReceived) {

    newDataReceived = false;

    if (node1Received) {

      printNodeData(latestNode1);

      sendNode1Telemetry();

      node1Received = false;
    }

    if (node2Received) {

      printNodeData(latestNode2);

      sendNode2Telemetry();

      node2Received = false;
    }
  }

  delay(10);
}