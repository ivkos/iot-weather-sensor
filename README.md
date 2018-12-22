# iot-weather-sensor

## Requirements
* MQTT broker
* BME280 temperature, humidity and pressure sensor

## Configuration
Make a copy of the example configuration file and edit it accordingly:
```bash
cp config_example.json config.json
nano config.json
```

## Install
Install the dependencies:
`npm install`

### Install as a systemd service
Copy the systemd service file:
```
sudo cp iot-weather-sensor.service /etc/systemd/system/
```

Edit the service file and point it to the correct directory:
```
sudo nano /etc/systemd/system/iot-weather-sensor.service
```
