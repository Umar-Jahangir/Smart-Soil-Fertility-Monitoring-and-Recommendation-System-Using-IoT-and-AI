#include <WiFi.h>
#include <PubSubClient.h>
#include <esp_now.h>

// ======================================================
// WIFI SETTINGS
// ======================================================

const char* ssid = "faria";
const char* password = "stuff0609";

// ======================================================
// THINGSBOARD SETTINGS
// ======================================================

const char* thingsboardServer = "mqtt.thingsboard.cloud";
const int thingsboardPort = 1883;

// IMPORTANT:
// Put the NEW access token of "Smart Farm Gateway" here.
// Do NOT use Node 1 or Node 2 tokens.
const char* thingsboardToken = "c6m0z380ddfdsv14ltv9";

// These names MUST exactly match ThingsBoard device names.
const char* node1Name = "Farm Node 1";
const char* node2Name = "Farm Node 2";

// ======================================================
// MQTT
// ======================================================

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Increase MQTT packet size.
// Our telemetry JSON is larger than the default 256 bytes.
const int MQTT_BUFFER_SIZE = 1024;


// ======================================================
// ESP-NOW DATA STRUCTURE
// MUST MATCH NODE 1 AND NODE 2
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


// ======================================================
// VARIABLES FOR RECEIVED DATA
// ======================================================

struct_message latestNode1;
struct_message latestNode2;

volatile bool node1Received = false;
volatile bool node2Received = false;


// ======================================================
// ESP-NOW RECEIVE CALLBACK
// ======================================================

void OnDataRecv(const esp_now_recv_info_t *recv_info,
                const uint8_t *incomingData,
                int len) {

  if (len != sizeof(struct_message)) {

    Serial.println("ERROR: Received packet size mismatch!");

    return;
  }

  struct_message receivedData;

  memcpy(&receivedData,
         incomingData,
         sizeof(receivedData));


  // ----------------------------------------------------
  // NODE 1
  // ----------------------------------------------------

  if (receivedData.nodeID == 1) {

    memcpy(&latestNode1,
           &receivedData,
           sizeof(struct_message));

    node1Received = true;
  }


  // ----------------------------------------------------
  // NODE 2
  // ----------------------------------------------------

  else if (receivedData.nodeID == 2) {

    memcpy(&latestNode2,
           &receivedData,
           sizeof(struct_message));

    node2Received = true;
  }
}


// ======================================================
// PRINT SENSOR DATA
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
// CONNECT TO WIFI
// ======================================================

void connectWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println();
  Serial.println("========================================");
  Serial.println("        CONNECTING TO WI-FI");
  Serial.println("========================================");

  Serial.print("Network: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);

  WiFi.begin(ssid, password);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED &&
         attempts < 30) {

    delay(500);

    Serial.print(".");

    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("Wi-Fi connected!");

    Serial.print("IP Address   : ");
    Serial.println(WiFi.localIP());

    Serial.print("Wi-Fi MAC    : ");
    Serial.println(WiFi.macAddress());

    Serial.print("Wi-Fi Channel : ");
    Serial.println(WiFi.channel());

    Serial.println("========================================");

  } else {

    Serial.println("Wi-Fi connection FAILED!");

    Serial.println("========================================");
  }
}


// ======================================================
// CONNECT TO THINGSBOARD MQTT
// ======================================================

bool connectMQTT() {

  if (mqttClient.connected()) {
    return true;
  }

  Serial.println();
  Serial.println("========================================");
  Serial.println("      CONNECTING TO THINGSBOARD");
  Serial.println("========================================");

  Serial.println("Server: mqtt.thingsboard.cloud");
  Serial.println("Port  : 1883");

  // ----------------------------------------------------
  // MQTT client ID
  // ----------------------------------------------------

  String clientID =
    "ESP32-Gateway-" +
    WiFi.macAddress();

  clientID.replace(":", "");

  // ----------------------------------------------------
  // MQTT connection
  //
  // ThingsBoard:
  // Username = Gateway Access Token
  // Password = empty
  // ----------------------------------------------------

  bool connected = mqttClient.connect(
    clientID.c_str(),
    thingsboardToken,
    ""
  );

  if (connected) {

    Serial.println();
    Serial.println("########################################");
    Serial.println(" ThingsBoard MQTT CONNECTED SUCCESSFULLY");
    Serial.println("########################################");

    // --------------------------------------------------
    // Tell ThingsBoard Node 1 is connected
    // --------------------------------------------------

    String node1Connect =
      "{\"device\":\"" +
      String(node1Name) +
      "\"}";

    bool node1Status =
      mqttClient.publish(
        "v1/gateway/connect",
        node1Connect.c_str()
      );

    if (node1Status) {

      Serial.println(
        "Farm Node 1 registered with Gateway."
      );

    } else {

      Serial.println(
        "WARNING: Node 1 registration failed."
      );
    }


    // --------------------------------------------------
    // Tell ThingsBoard Node 2 is connected
    // --------------------------------------------------

    String node2Connect =
      "{\"device\":\"" +
      String(node2Name) +
      "\"}";

    bool node2Status =
      mqttClient.publish(
        "v1/gateway/connect",
        node2Connect.c_str()
      );

    if (node2Status) {

      Serial.println(
        "Farm Node 2 registered with Gateway."
      );

    } else {

      Serial.println(
        "WARNING: Node 2 registration failed."
      );
    }

    Serial.println(
      "========================================"
    );

    return true;
  }

  else {

    Serial.println();
    Serial.print(
      "MQTT connection FAILED. State = "
    );

    Serial.println(mqttClient.state());

    Serial.println();

    Serial.println(
      "Possible causes:"
    );

    Serial.println(
      "1. Gateway access token is incorrect."
    );

    Serial.println(
      "2. Gateway device is not authorized."
    );

    Serial.println(
      "3. ThingsBoard Gateway Mode is disabled."
    );

    Serial.println(
      "4. Wrong ThingsBoard hostname."
    );

    Serial.println(
      "========================================"
    );

    return false;
  }
}


// ======================================================
// SEND NODE 1 TELEMETRY
// ======================================================

void sendNode1Telemetry() {

  if (!mqttClient.connected()) {

    Serial.println(
      "Cannot send Node 1 data: MQTT disconnected."
    );

    return;
  }


  // ----------------------------------------------------
  // ThingsBoard Gateway telemetry format
  // ----------------------------------------------------

  String payload = "{";

  payload += "\"";
  payload += node1Name;
  payload += "\":[{";

  payload += "\"moisture\":";
  payload += String(
    latestNode1.moisture,
    2
  );

  payload += ",\"airTemperature\":";
  payload += String(
    latestNode1.airTemperature,
    2
  );

  payload += ",\"airHumidity\":";
  payload += String(
    latestNode1.airHumidity,
    2
  );

  payload += ",\"soilTemperature\":";
  payload += String(
    latestNode1.soilTemperature,
    2
  );

  payload += ",\"pH\":";
  payload += String(
    latestNode1.pH,
    2
  );

  payload += ",\"EC\":";
  payload += String(
    latestNode1.ec,
    2
  );

  payload += ",\"nitrogen\":";
  payload += String(
    latestNode1.nitrogen,
    2
  );

  payload += ",\"phosphorus\":";
  payload += String(
    latestNode1.phosphorus,
    2
  );

  payload += ",\"potassium\":";
  payload += String(
    latestNode1.potassium,
    2
  );

  payload += "}]}";


  // ----------------------------------------------------
  // Publish
  // ----------------------------------------------------

  Serial.println();
  Serial.println("Sending Node 1 telemetry...");

  Serial.println("Payload:");
  Serial.println(payload);

  bool success =
    mqttClient.publish(
      "v1/gateway/telemetry",
      payload.c_str()
    );


  if (success) {

    Serial.println(
      "Node 1 telemetry sent SUCCESSFULLY."
    );

  } else {

    Serial.println(
      "Node 1 telemetry SEND FAILED."
    );
  }
}


// ======================================================
// SEND NODE 2 TELEMETRY
// ======================================================

void sendNode2Telemetry() {

  if (!mqttClient.connected()) {

    Serial.println(
      "Cannot send Node 2 data: MQTT disconnected."
    );

    return;
  }


  // ----------------------------------------------------
  // ThingsBoard Gateway telemetry format
  // ----------------------------------------------------

  String payload = "{";

  payload += "\"";
  payload += node2Name;
  payload += "\":[{";

  payload += "\"moisture\":";
  payload += String(
    latestNode2.moisture,
    2
  );

  payload += ",\"airTemperature\":";
  payload += String(
    latestNode2.airTemperature,
    2
  );

  payload += ",\"airHumidity\":";
  payload += String(
    latestNode2.airHumidity,
    2
  );

  payload += ",\"soilTemperature\":";
  payload += String(
    latestNode2.soilTemperature,
    2
  );

  payload += ",\"pH\":";
  payload += String(
    latestNode2.pH,
    2
  );

  payload += ",\"EC\":";
  payload += String(
    latestNode2.ec,
    2
  );

  payload += ",\"nitrogen\":";
  payload += String(
    latestNode2.nitrogen,
    2
  );

  payload += ",\"phosphorus\":";
  payload += String(
    latestNode2.phosphorus,
    2
  );

  payload += ",\"potassium\":";
  payload += String(
    latestNode2.potassium,
    2
  );

  payload += "}]}";


  // ----------------------------------------------------
  // Publish
  // ----------------------------------------------------

  Serial.println();
  Serial.println("Sending Node 2 telemetry...");

  Serial.println("Payload:");
  Serial.println(payload);

  bool success =
    mqttClient.publish(
      "v1/gateway/telemetry",
      payload.c_str()
    );


  if (success) {

    Serial.println(
      "Node 2 telemetry sent SUCCESSFULLY."
    );

  } else {

    Serial.println(
      "Node 2 telemetry SEND FAILED."
    );
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

  Serial.print(
    "Gateway Wi-Fi MAC Address: "
  );

  Serial.println(
    WiFi.macAddress()
  );


  // ----------------------------------------------------
  // Connect Wi-Fi
  // ----------------------------------------------------

  connectWiFi();


  // ----------------------------------------------------
  // MQTT
  // ----------------------------------------------------

  mqttClient.setServer(
    thingsboardServer,
    thingsboardPort
  );

  mqttClient.setBufferSize(
    MQTT_BUFFER_SIZE
  );


  // ----------------------------------------------------
  // ESP-NOW
  // ----------------------------------------------------

  if (esp_now_init() != ESP_OK) {

    Serial.println(
      "ESP-NOW initialization FAILED!"
    );

    return;
  }

  Serial.println(
    "ESP-NOW initialized."
  );


  esp_now_register_recv_cb(
    OnDataRecv
  );


  // ----------------------------------------------------
  // ThingsBoard MQTT
  // ----------------------------------------------------

  if (WiFi.status() == WL_CONNECTED) {

    connectMQTT();
  }


  // ----------------------------------------------------
  // Ready
  // ----------------------------------------------------

  Serial.println();
  Serial.println("========================================");
  Serial.println("Gateway is ready.");
  Serial.println("========================================");
}


// ======================================================
// LOOP
// ======================================================

void loop() {

  // ----------------------------------------------------
  // Wi-Fi
  // ----------------------------------------------------

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println(
      "Wi-Fi disconnected!"
    );

    connectWiFi();
  }


  // ----------------------------------------------------
  // MQTT
  // ----------------------------------------------------

  if (
    WiFi.status() == WL_CONNECTED &&
    !mqttClient.connected()
  ) {

    connectMQTT();
  }


  mqttClient.loop();


  // ----------------------------------------------------
  // NODE 1 DATA
  // ----------------------------------------------------

  if (node1Received) {

    // Temporarily disable the flag
    node1Received = false;

    printNodeData(
      latestNode1
    );

    sendNode1Telemetry();
  }


  // ----------------------------------------------------
  // NODE 2 DATA
  // ----------------------------------------------------

  if (node2Received) {

    node2Received = false;

    printNodeData(
      latestNode2
    );

    sendNode2Telemetry();
  }


  delay(10);
}