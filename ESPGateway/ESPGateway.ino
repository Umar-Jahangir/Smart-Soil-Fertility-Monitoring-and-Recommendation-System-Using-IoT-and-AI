#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"

// ===============================
// DATA PACKET
// ===============================
typedef struct {
  int nodeID;

  float soilMoisture;
  float airTemperature;
  float humidity;
  float soilTemperature;

} SensorData;

SensorData receivedData;


// ===============================
// ESP-NOW RECEIVE CALLBACK
// ===============================
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {

  // Copy received data into our structure
  memcpy(&receivedData, incomingData, sizeof(receivedData));

  Serial.println();
  Serial.println("================================");
  Serial.println("       DATA RECEIVED");
  Serial.println("================================");

  Serial.print("Node ID          : ");
  Serial.println(receivedData.nodeID);

  Serial.print("Soil Moisture    : ");
  Serial.print(receivedData.soilMoisture);
  Serial.println(" %");

  Serial.print("Air Temperature  : ");
  Serial.print(receivedData.airTemperature);
  Serial.println(" °C");

  Serial.print("Humidity         : ");
  Serial.print(receivedData.humidity);
  Serial.println(" %");

  Serial.print("Soil Temperature : ");
  Serial.print(receivedData.soilTemperature);
  Serial.println(" °C");

  Serial.println("================================");
}


// ===============================
// SETUP
// ===============================
void setup() {

  Serial.begin(115200);
  delay(1000);

  // Wi-Fi Station mode
  WiFi.mode(WIFI_STA);

  // Keep ESP-NOW devices on the same Wi-Fi channel
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);

  Serial.println();
  Serial.println("================================");
  Serial.println("       ESP32 GATEWAY");
  Serial.println("================================");

  Serial.print("Gateway MAC Address: ");
  Serial.println(WiFi.macAddress());

  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW initialization FAILED!");
    return;
  }

  Serial.println("ESP-NOW initialized successfully.");

  // Register receive callback
  esp_now_register_recv_cb(OnDataRecv);

  Serial.println("Gateway is waiting for Node 1...");
  Serial.println("================================");
}


// ===============================
// LOOP
// ===============================
void loop() {

  // Nothing needed here.
  // ESP-NOW receives data automatically.

}