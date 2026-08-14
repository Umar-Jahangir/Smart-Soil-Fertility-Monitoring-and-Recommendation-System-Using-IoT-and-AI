#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"

// ==========================================
// GATEWAY MAC ADDRESS
// ==========================================

uint8_t gatewayAddress[] = {
  0xFC, 0xE8, 0xC0, 0xE1, 0xD1, 0x38
};


// ==========================================
// DATA PACKET
// ==========================================

typedef struct {

  int nodeID;

  float soilMoisture;
  float airTemperature;
  float humidity;
  float soilTemperature;

} SensorData;

SensorData sensorData;


// ==========================================
// SETUP
// ==========================================

void setup() {

  Serial.begin(115200);
  delay(1000);

  // Wi-Fi Station mode
  WiFi.mode(WIFI_STA);

  // Same Wi-Fi channel as Gateway
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);

  Serial.println();
  Serial.println("================================");
  Serial.println("          NODE 1");
  Serial.println("================================");

  Serial.print("Node 1 MAC Address: ");
  Serial.println(WiFi.macAddress());

  // ========================================
  // INITIALIZE ESP-NOW
  // ========================================

  if (esp_now_init() != ESP_OK) {

    Serial.println("ESP-NOW initialization FAILED!");

    return;
  }

  Serial.println("ESP-NOW initialized successfully.");


  // ========================================
  // ADD GATEWAY AS PEER
  // ========================================

  esp_now_peer_info_t peerInfo = {};

  memcpy(
    peerInfo.peer_addr,
    gatewayAddress,
    6
  );

  peerInfo.channel = 1;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {

    Serial.println("Failed to add Gateway!");

    return;
  }

  Serial.println("Gateway added successfully.");

  Serial.println("================================");
  Serial.println("Node 1 is ready.");
  Serial.println("================================");
}


// ==========================================
// LOOP
// ==========================================

void loop() {

  // ========================================
  // SAMPLE SENSOR DATA
  // ========================================

  sensorData.nodeID = 1;

  sensorData.soilMoisture = 62.5;

  sensorData.airTemperature = 28.4;

  sensorData.humidity = 64.2;

  sensorData.soilTemperature = 26.7;


  // ========================================
  // SEND DATA
  // ========================================

  esp_err_t result = esp_now_send(
    gatewayAddress,
    (uint8_t *) &sensorData,
    sizeof(sensorData)
  );


  // ========================================
  // SERIAL OUTPUT
  // ========================================

  if (result == ESP_OK) {

    Serial.println();
    Serial.println("Data sent to Gateway!");

    Serial.print("Soil Moisture    : ");
    Serial.print(sensorData.soilMoisture);
    Serial.println(" %");

    Serial.print("Air Temperature  : ");
    Serial.print(sensorData.airTemperature);
    Serial.println(" °C");

    Serial.print("Humidity         : ");
    Serial.print(sensorData.humidity);
    Serial.println(" %");

    Serial.print("Soil Temperature : ");
    Serial.print(sensorData.soilTemperature);
    Serial.println(" °C");

  } else {

    Serial.println();
    Serial.println("ERROR: Data sending failed!");

  }


  // Send every 3 seconds
  delay(3000);
}