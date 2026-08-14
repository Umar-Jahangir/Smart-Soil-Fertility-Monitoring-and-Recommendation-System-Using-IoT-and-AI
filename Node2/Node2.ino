#include <WiFi.h>
#include <esp_now.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define NODE_ID 2

// ---------- SENSOR PINS ----------
#define SOIL_MOISTURE_PIN 34
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define DS18B20_PIN 5

DHT dht(DHT_PIN, DHT_TYPE);

OneWire oneWire(DS18B20_PIN);
DallasTemperature soilTempSensor(&oneWire);

// ---------- GATEWAY MAC ----------
uint8_t gatewayMAC[] = {
  0xFC, 0xE8, 0xC0, 0xE1, 0xD1, 0x38
};

// ---------- DATA PACKET ----------

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

SensorData data;

// ---------- NODE 2 DEMO VALUES ----------

float PH_VALUE = 6.80;
float EC_VALUE = 1.42;

float N_VALUE = 52.00;
float P_VALUE = 29.00;
float K_VALUE = 45.00;

// ---------- SEND CALLBACK ----------

void OnDataSent(
  const wifi_tx_info_t *info,
  esp_now_send_status_t status
) {

  Serial.print("ESP-NOW Send Status : ");

  if (status == ESP_NOW_SEND_SUCCESS)
    Serial.println("SUCCESS");
  else
    Serial.println("FAILED");
}

// ---------- SOIL MOISTURE ----------

float readSoilMoisture() {

  int rawValue = analogRead(SOIL_MOISTURE_PIN);

  float moisture =
    map(rawValue, 4095, 0, 0, 100);

  if (moisture < 0)
    moisture = 0;

  if (moisture > 100)
    moisture = 100;

  return moisture;
}

// ---------- SETUP ----------

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("             ESP32 NODE 2");
  Serial.println("========================================");

  dht.begin();
  soilTempSensor.begin();

  analogReadResolution(12);

  WiFi.mode(WIFI_STA);

  Serial.print("Node 2 MAC Address: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {

    Serial.println("ESP-NOW initialization FAILED!");
    while (true) delay(1000);
  }

  esp_now_register_send_cb(OnDataSent);

  esp_now_peer_info_t peerInfo = {};

  memcpy(
    peerInfo.peer_addr,
    gatewayMAC,
    6
  );

  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {

    Serial.println("Failed to register Gateway!");
    while (true) delay(1000);
  }

  Serial.println();
  Serial.println("ESP-NOW initialized.");
  Serial.println("Gateway registered.");
  Serial.println("Node 2 ready.");
  Serial.println("========================================");
}

// ---------- LOOP ----------

void loop() {

  data.nodeID = NODE_ID;

  data.moisture = readSoilMoisture();

  data.airTemperature =
    dht.readTemperature();

  data.airHumidity =
    dht.readHumidity();

  soilTempSensor.requestTemperatures();

  data.soilTemperature =
    soilTempSensor.getTempCByIndex(0);

  // ---------- DEMO VALUES ----------

  data.pH = PH_VALUE;

  data.EC = EC_VALUE;

  data.nitrogen = N_VALUE;
  data.phosphorus = P_VALUE;
  data.potassium = K_VALUE;

  // ---------- DISPLAY ----------

  Serial.println();
  Serial.println("========================================");

  Serial.print("Node ID          : ");
  Serial.println(data.nodeID);

  Serial.print("Moisture         : ");
  Serial.print(data.moisture, 2);
  Serial.println(" %");

  Serial.print("Air Temperature  : ");

  if (isnan(data.airTemperature))
    Serial.println("ERROR");
  else {
    Serial.print(data.airTemperature, 2);
    Serial.println(" °C");
  }

  Serial.print("Air Humidity     : ");

  if (isnan(data.airHumidity))
    Serial.println("ERROR");
  else {
    Serial.print(data.airHumidity, 2);
    Serial.println(" %");
  }

  Serial.print("Soil Temperature : ");
  Serial.print(data.soilTemperature, 2);
  Serial.println(" °C");

  Serial.println("----------------------------------------");

  Serial.print("pH               : ");
  Serial.println(data.pH, 2);

  Serial.print("EC               : ");
  Serial.println(data.EC, 2);

  Serial.print("Nitrogen (N)     : ");
  Serial.println(data.nitrogen, 2);

  Serial.print("Phosphorus (P)   : ");
  Serial.println(data.phosphorus, 2);

  Serial.print("Potassium (K)    : ");
  Serial.println(data.potassium, 2);

  Serial.println("========================================");

  // ---------- SEND ----------

  esp_err_t result = esp_now_send(
    gatewayMAC,
    (uint8_t *)&data,
    sizeof(data)
  );

  if (result == ESP_OK)
    Serial.println("Data packet sent to Gateway.");
  else
    Serial.println("Error sending packet.");

  delay(3000);
}