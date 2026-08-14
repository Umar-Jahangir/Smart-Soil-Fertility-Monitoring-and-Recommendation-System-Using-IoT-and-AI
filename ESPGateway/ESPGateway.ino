#include <WiFi.h>
#include "esp_mac.h"

void setup() {
  Serial.begin(115200);
  delay(1000);

  uint8_t mac[6];

  // Read the ESP32 hardware Wi-Fi MAC address
  esp_read_mac(mac, ESP_MAC_WIFI_STA);

  Serial.println();
  Serial.println("================================");
  Serial.println("          ESP32 GATEWAY");
  Serial.println("================================");

  Serial.printf(
    "Gateway MAC Address: %02X:%02X:%02X:%02X:%02X:%02X\n",
    mac[0], mac[1], mac[2],
    mac[3], mac[4], mac[5]
  );

  Serial.println("Gateway is ready.");
  Serial.println("================================");
}

void loop() {
}