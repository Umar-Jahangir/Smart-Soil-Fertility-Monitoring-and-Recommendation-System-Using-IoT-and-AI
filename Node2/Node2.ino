#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// =====================================================
// NODE 2 - PIN DEFINITIONS
// =====================================================

#define SOIL_MOISTURE_PIN 34
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define DS18B20_PIN 5

// =====================================================
// SENSOR OBJECTS
// =====================================================

DHT dht(DHT_PIN, DHT_TYPE);

OneWire oneWire(DS18B20_PIN);
DallasTemperature soilTempSensor(&oneWire);

// =====================================================
// SENSOR DATA PACKET
// This structure will later be sent using ESP-NOW
// =====================================================

typedef struct {

  int nodeID;

  // Real sensor data
  float moisture;
  float airTemperature;
  float humidity;
  float soilTemperature;

  // Simulated data for Mid-Sem
  float pH;
  float EC;

  float nitrogen;
  float phosphorus;
  float potassium;

} SensorData;

// Create packet
SensorData data;

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("        FARM MONITORING SYSTEM");
  Serial.println("              NODE 2");
  Serial.println("========================================");

  // Initialize sensors
  dht.begin();
  soilTempSensor.begin();

  pinMode(SOIL_MOISTURE_PIN, INPUT);

  Serial.println("Sensors initialized.");
  Serial.println("Node 2 is ready.");
  Serial.println();
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  // ===================================================
  // 1. SOIL MOISTURE
  // ===================================================

  int moistureRaw = analogRead(SOIL_MOISTURE_PIN);

  // Preliminary conversion to percentage
  int moisturePercent = map(
    moistureRaw,
    4095,
    0,
    0,
    100
  );

  moisturePercent = constrain(
    moisturePercent,
    0,
    100
  );


  // ===================================================
  // 2. DHT22
  // Air Temperature + Humidity
  // ===================================================

  float airTemperature = dht.readTemperature();
  float humidity = dht.readHumidity();


  // ===================================================
  // 3. DS18B20
  // Soil Temperature
  // ===================================================

  soilTempSensor.requestTemperatures();

  float soilTemperature =
    soilTempSensor.getTempCByIndex(0);


  // ===================================================
  // 4. SIMULATED pH
  // Will be replaced by real pH sensor later
  // ===================================================

  float simulatedPH = 5.4;


  // ===================================================
  // 5. SIMULATED EC
  // Will be replaced by real EC sensor later
  // ===================================================

  float simulatedEC = 2.10;


  // ===================================================
  // 6. SIMULATED NPK
  // Will be replaced by real NPK sensor later
  // ===================================================

  float simulatedNitrogen = 22.0;
  float simulatedPhosphorus = 18.0;
  float simulatedPotassium = 20.0;


  // ===================================================
  // 7. CREATE DATA PACKET
  // ===================================================

  data.nodeID = 2;

  // Real sensor values
  data.moisture = moisturePercent;
  data.airTemperature = airTemperature;
  data.humidity = humidity;
  data.soilTemperature = soilTemperature;

  // Simulated values
  data.pH = simulatedPH;
  data.EC = simulatedEC;

  data.nitrogen = simulatedNitrogen;
  data.phosphorus = simulatedPhosphorus;
  data.potassium = simulatedPotassium;


  // ===================================================
  // 8. DISPLAY COMPLETE PACKET
  // ===================================================

  Serial.println("========================================");
  Serial.println("          NODE 2 DATA PACKET");
  Serial.println("========================================");

  Serial.print("Node ID          : ");
  Serial.println(data.nodeID);

  Serial.print("Moisture         : ");
  Serial.print(data.moisture);
  Serial.println(" %");

  Serial.print("Air Temperature  : ");
  Serial.print(data.airTemperature);
  Serial.println(" °C");

  Serial.print("Air Humidity     : ");
  Serial.print(data.humidity);
  Serial.println(" %");

  Serial.print("Soil Temperature : ");
  Serial.print(data.soilTemperature);
  Serial.println(" °C");

  Serial.println("----------------------------------------");

  Serial.print("pH               : ");
  Serial.println(data.pH);

  Serial.print("EC               : ");
  Serial.println(data.EC);

  Serial.print("Nitrogen (N)     : ");
  Serial.println(data.nitrogen);

  Serial.print("Phosphorus (P)   : ");
  Serial.println(data.phosphorus);

  Serial.print("Potassium (K)    : ");
  Serial.println(data.potassium);

  Serial.println("========================================");
  Serial.println();

  delay(3000);
}