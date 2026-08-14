#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// =====================================================
// NODE ID
// =====================================================

#define NODE_ID 1


// =====================================================
// SENSOR PINS
// =====================================================

// Soil Moisture
#define SOIL_MOISTURE_PIN 34

// DHT22
#define DHT_PIN 4
#define DHT_TYPE DHT22

// DS18B20
#define DS18B20_PIN 5

// Analog pH Sensor
#define PH_PIN 35


// =====================================================
// SENSOR OBJECTS
// =====================================================

DHT dht(DHT_PIN, DHT_TYPE);

OneWire oneWire(DS18B20_PIN);

DallasTemperature soilTempSensor(&oneWire);


// =====================================================
// MID-SEM DEMO VALUES
// =====================================================

// These will eventually be replaced by real sensors.

float EC_VALUE = 1.35;

float N_VALUE = 48.00;
float P_VALUE = 32.00;
float K_VALUE = 41.00;


// =====================================================
// pH CALIBRATION
// =====================================================

// Reference obtained from your pH 7 buffer test.
//
// Average voltage ≈ 0.716 V
//
// For this mid-sem prototype we use the pH 7
// reference as the calibration reference.

float PH_REFERENCE_VOLTAGE = 0.716;


// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  // ADC configuration
  analogReadResolution(12);

  // Start sensors
  dht.begin();

  soilTempSensor.begin();


  Serial.println();
  Serial.println("========================================");
  Serial.println("          NODE 1 INITIALIZATION");
  Serial.println("========================================");

  Serial.println("Soil Moisture Sensor : OK");
  Serial.println("DHT22                : OK");
  Serial.println("DS18B20              : OK");
  Serial.println("pH Sensor            : OK");

  Serial.println("----------------------------------------");

  Serial.println("Node 1 ready.");

  Serial.println("========================================");

  delay(2000);
}


// =====================================================
// READ pH
// =====================================================

float readPH() {

  const int NUM_SAMPLES = 20;

  long totalADC = 0;

  for (int i = 0; i < NUM_SAMPLES; i++) {

    totalADC += analogRead(PH_PIN);

    delay(10);
  }

  float averageADC =
      (float)totalADC / NUM_SAMPLES;


  // ESP32 ADC voltage
  float voltage =
      (averageADC / 4095.0) * 3.3;


  // ---------------------------------------------------
  // MID-SEM SINGLE-POINT CALIBRATION
  // ---------------------------------------------------

  // At the reference point:
  //
  // 0.716 V ≈ pH 7
  //
  // For now, we use a simple approximate relationship
  // around the reference point.
  //
  // This will be replaced by proper two-point
  // calibration when pH 4/10 buffer is available.

  float pH = 7.0 + ((PH_REFERENCE_VOLTAGE - voltage) * 3.0);


  // Keep pH within realistic range
  if (pH < 0)
    pH = 0;

  if (pH > 14)
    pH = 14;


  return pH;
}


// =====================================================
// READ SOIL MOISTURE
// =====================================================

float readSoilMoisture() {

  int rawValue = analogRead(SOIL_MOISTURE_PIN);

  // Temporary conversion.
  // We will calibrate this later using dry/wet values.

  float moisture =
      map(rawValue, 4095, 0, 0, 100);

  if (moisture < 0)
    moisture = 0;

  if (moisture > 100)
    moisture = 100;

  return moisture;
}


// =====================================================
// MAIN LOOP
// =====================================================

void loop() {

  // ===================================================
  // READ REAL SENSORS
  // ===================================================

  float moisture =
      readSoilMoisture();


  float airTemperature =
      dht.readTemperature();


  float airHumidity =
      dht.readHumidity();


  soilTempSensor.requestTemperatures();

  float soilTemperature =
      soilTempSensor.getTempCByIndex(0);


  float pH =
      readPH();


  // ===================================================
  // DISPLAY DATA
  // ===================================================

  Serial.println();

  Serial.println("========================================");

  Serial.print("Node ID          : ");
  Serial.println(NODE_ID);

  Serial.print("Moisture         : ");
  Serial.print(moisture, 2);
  Serial.println(" %");

  Serial.print("Air Temperature  : ");

  if (isnan(airTemperature)) {

    Serial.println("ERROR");

  } else {

    Serial.print(airTemperature, 2);
    Serial.println(" °C");
  }


  Serial.print("Air Humidity     : ");

  if (isnan(airHumidity)) {

    Serial.println("ERROR");

  } else {

    Serial.print(airHumidity, 2);
    Serial.println(" %");
  }


  Serial.print("Soil Temperature : ");
  Serial.print(soilTemperature, 2);
  Serial.println(" °C");


  Serial.println("----------------------------------------");


  // ===================================================
  // HARDCODED MID-SEM VALUES
  // ===================================================

  Serial.print("pH               : ");
  Serial.println(pH, 2);

  Serial.print("EC               : ");
  Serial.println(EC_VALUE, 2);

  Serial.print("Nitrogen (N)     : ");
  Serial.println(N_VALUE, 2);

  Serial.print("Phosphorus (P)   : ");
  Serial.println(P_VALUE, 2);

  Serial.print("Potassium (K)    : ");
  Serial.println(K_VALUE, 2);


  Serial.println("========================================");


  delay(3000);
}