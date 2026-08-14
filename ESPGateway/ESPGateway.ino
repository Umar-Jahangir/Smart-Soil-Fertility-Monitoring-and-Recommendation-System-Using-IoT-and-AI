#include <WiFi.h>
#include <esp_now.h>

// ======================================================
// Wi-Fi Credentials
// ======================================================

const char* ssid = "faria";
const char* password = "stuff0609";

// ======================================================
// Data structure received from Nodes
// MUST match the Node 1 and Node 2 structure
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
// ESP-NOW RECEIVE CALLBACK
// ======================================================

void OnDataRecv(const esp_now_recv_info_t *recv_info,
                const uint8_t *incomingDataBytes,
                int len) {

  if (len != sizeof(incomingData)) {
    Serial.println("Received packet size mismatch!");
    return;
  }

  memcpy(&incomingData, incomingDataBytes, sizeof(incomingData));

  Serial.println();
  Serial.println("========================================");

  Serial.print("Data received from Node ");
  Serial.println(incomingData.nodeID);

  Serial.println("----------------------------------------");

  Serial.print("Moisture         : ");
  Serial.print(incomingData.moisture, 2);
  Serial.println(" %");

  Serial.print("Air Temperature  : ");
  Serial.print(incomingData.airTemperature, 2);
  Serial.println(" °C");

  Serial.print("Air Humidity     : ");
  Serial.print(incomingData.airHumidity, 2);
  Serial.println(" %");

  Serial.print("Soil Temperature : ");
  Serial.print(incomingData.soilTemperature, 2);
  Serial.println(" °C");

  Serial.println("----------------------------------------");

  Serial.print("pH               : ");
  Serial.println(incomingData.pH, 2);

  Serial.print("EC               : ");
  Serial.println(incomingData.ec, 2);

  Serial.print("Nitrogen (N)     : ");
  Serial.println(incomingData.nitrogen, 2);

  Serial.print("Phosphorus (P)   : ");
  Serial.println(incomingData.phosphorus, 2);

  Serial.print("Potassium (K)    : ");
  Serial.println(incomingData.potassium, 2);

  Serial.println("========================================");
}


// ======================================================
// CONNECT TO WI-FI
// ======================================================

void connectToWiFi() {

  Serial.println();
  Serial.println("========================================");
  Serial.println("        CONNECTING TO WI-FI");
  Serial.println("========================================");

  Serial.print("Network: ");
  Serial.println(ssid);

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

    Serial.print("IP Address : ");
    Serial.println(WiFi.localIP());

    Serial.print("Wi-Fi MAC  : ");
    Serial.println(WiFi.macAddress());

    Serial.print("Wi-Fi Channel : ");
    Serial.println(WiFi.channel());

    Serial.println("========================================");

  } else {

    Serial.println("Wi-Fi connection FAILED.");

    Serial.println("Check:");
    Serial.println("1. Android hotspot is ON");
    Serial.println("2. SSID is AndroidAP");
    Serial.println("3. Password is correct");

    Serial.println("========================================");
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
  // Start Wi-Fi
  // ----------------------------------------------------

  WiFi.mode(WIFI_STA);

  Serial.print("Gateway MAC Address: ");
  Serial.println(WiFi.macAddress());

  // ----------------------------------------------------
  // Start ESP-NOW
  // ----------------------------------------------------

  if (esp_now_init() != ESP_OK) {

    Serial.println("ESP-NOW initialization FAILED!");

    return;
  }

  Serial.println("ESP-NOW initialized.");

  esp_now_register_recv_cb(OnDataRecv);

  // ----------------------------------------------------
  // Connect Gateway to Android Hotspot
  // ----------------------------------------------------

  connectToWiFi();

  Serial.println();
  Serial.println("Gateway is ready.");
  Serial.println("========================================");
}


// ======================================================
// LOOP
// ======================================================

void loop() {

  // Keep Wi-Fi connection alive

  if (WiFi.status() != WL_CONNECTED) {

    static unsigned long lastReconnectAttempt = 0;

    if (millis() - lastReconnectAttempt > 10000) {

      lastReconnectAttempt = millis();

      Serial.println();
      Serial.println("Wi-Fi disconnected.");
      Serial.println("Attempting reconnection...");

      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }

  delay(100);
}