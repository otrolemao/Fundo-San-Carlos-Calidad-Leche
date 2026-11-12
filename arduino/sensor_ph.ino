/*
  Proyecto: Sistema de Gestión de Calidad de Leche - Fundo San Carlos
  Hardware: Arduino Uno + Módulo Sensor de pH (BNC)
  Objetivo: Leer el pH de la leche y enviarlo a la API (Backend Node.js)
*/

#include <ESP8266WiFi.h>      // Si usas ESP8266
// #include <WiFi.h>          // Si usas ESP32
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>     // Instalar desde el gestor de librerías

// --- Configuración de Red ---
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// --- Configuración del Servidor (Tu API en Node.js) ---
// Cambia la IP por la de tu computador en la red local
const char* serverName = "http://192.168.1.85:3001/api/muestras"; 
const char* apiKey = "dummy_key"; // Si luego agregas seguridad

// --- Configuración del Sensor ---
const int pinSensorPH = A0; // Pin analógico donde está conectado el sensor
float valorPH = 0.0;

// --- Datos del Lote (Temporal) ---
String lote_id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
String registrado_por = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
float temperatura = 4.0; // Podrías agregar un sensor DHT22
float volumen_litros = 1000.0;

void setup() {
  Serial.begin(115200);
  delay(10);

  // Conectar a WiFi
  Serial.println();
  Serial.print("Conectando a ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi conectado.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // 1. Leer el sensor de pH
  int valorAnalogico = analogRead(pinSensorPH);
  
  // 2. Convertir el valor analógico (0-1023) a pH (0-14)
  // Nota: Esta fórmula es una aproximación. Debe calibrarse con soluciones buffer.
  valorPH = (valorAnalogico * 14.0) / 1023.0;
  
  Serial.print("Valor de pH leído: ");
  Serial.println(valorPH);

  // 3. Enviar a la API
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    http.begin(client, serverName);
    http.addHeader("Content-Type", "application/json");

    // Crear el JSON con los datos
    StaticJsonDocument<200> doc;
    doc["lote_id"] = lote_id;
    doc["registrado_por"] = registrado_por;
    doc["valor_ph"] = valorPH;
    doc["temperatura"] = temperatura;
    doc["volumen_litros"] = volumen_litros;

    String requestBody;
    serializeJson(doc, requestBody);

    // Hacer el POST
    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("Código de respuesta: ");
      Serial.println(httpResponseCode);
      Serial.println("Respuesta del servidor: " + response);
    } else {
      Serial.print("Error en la petición POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Error: WiFi desconectado");
  }

  // Esperar 10 segundos antes de la siguiente lectura
  delay(10000);
}