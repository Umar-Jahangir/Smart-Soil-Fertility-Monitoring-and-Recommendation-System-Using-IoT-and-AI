#include <WiFi.h>
#include <esp_now.h>

// =====================================================
// DATA PACKET
// MUST BE IDENTICAL TO NODE 1 AND NODE 2
// =====================================================

typedef struct {

  int nodeID;

  float moisture;

  float airTemperature;
  float airHumidity;

  float soilTemperature;

  float pH;

  float EC;

  float nitrogen;
  float phosphorus;
  float potassium;

} SensorData;

SensorData incomingData;

// =====================================================
// RECEIVE CALLBACK
// =====================================================

void OnDataRecv(
  const esp_now_recv_info_t *info,
  const uint8_t *incomingDataBytes,
  int len
) {

  // Check packet size

  if (len != sizeof(SensorData)) {

    Serial.println();
    Serial.println("WARNING: Packet size mismatch!");

    return;
  }

  // Copy packet

  memcpy(
    &incomingData,
    incomingDataBytes,
    sizeof(incomingData)
  );

  // ===================================================
  // DISPLAY
  // ===================================================

  Serial.println();
  Serial.println("========================================");

  if (incomingData.nodeID == 1) {

    Serial.println("          DATA FROM NODE 1");

  }
  else if (incomingData.nodeID == 2) {

    Serial.println("          DATA FROM NODE 2");

  }
  else {

    Serial.print("          DATA FROM NODE ");
    Serial.println(incomingData.nodeID);
  }

  Serial.println("========================================");

  Serial.print("Node ID          : ");
  Serial.println(incomingData.nodeID);

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
  Serial.println(incomingData.EC, 2);

  Serial.print("Nitrogen (N)     : ");
  Serial.println(incomingData.nitrogen, 2);

  Serial.print("Phosphorus (P)   : ");
  Serial.println(incomingData.phosphorus, 2);

  Serial.print("Potassium (K)    : ");
  Serial.println(incomingData.potassium, 2);

  Serial.println("========================================");
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("             ESP32 GATEWAY");
  Serial.println("========================================");

  WiFi.mode(WIFI_STA);

  Serial.print("Gateway MAC Address: ");
  Serial.println(WiFi.macAddress());

  // ===================================================
  // INITIALIZE ESP-NOW
  // ===================================================

  if (esp_now_init() != ESP_OK) {

    Serial.println("ESP-NOW initialization FAILED!");

    while (true) {
      delay(1000);
    }
  }

  esp_now_register_recv_cb(OnDataRecv);

  Serial.println();
  Serial.println("ESP-NOW initialized.");
  Serial.println("Gateway is ready.");
  Serial.println("Waiting for Node 1 and Node 2...");
  Serial.println("========================================");
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  delay(100);
}