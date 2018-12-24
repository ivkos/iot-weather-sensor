const mqtt = require('mqtt')
const BME280 = require('bme280-sensor')
const Feels = require('feels')
const nconf = require('nconf')
const fs = require('fs')

const CONFIG_FILE = __dirname + "/config.json"

if (!fs.existsSync(CONFIG_FILE)) {
	throw new Error(`${CONFIG_FILE} does not exist`)
}

nconf
	.env()
	.file({ file: CONFIG_FILE })


//////// Settings ////////
const MQTT_URL = nconf.get("MQTT_URL");
const MQTT_USERNAME = nconf.get("MQTT_USERNAME");
const MQTT_PASSWORD = nconf.get("MQTT_PASSWORD");
const MQTT_TOPIC_PREFIX = nconf.get("MQTT_TOPIC_PREFIX");

const PUSH_INTERVAL = nconf.get("PUSH_INTERVAL");
const RECONNECT_INTERVAL = nconf.get("RECONNECT_INTERVAL");

const BME280_I2C_BUS_NO = nconf.get("BME280_I2C_BUS_NO")
const BME280_I2C_ADDRESS = parseInt(nconf.get("BME280_I2C_ADDRESS"), 16)
//////////////////////////


const mqttClient = mqtt.connect(MQTT_URL, {
	username: MQTT_USERNAME,
	password: MQTT_PASSWORD,
	reconnectPeriod: RECONNECT_INTERVAL,
})

const bme280 = new BME280({
	i2cBusNo: BME280_I2C_BUS_NO,
	i2cAddress: BME280_I2C_ADDRESS
})

bme280
	.init()
	.then(() => {
		console.log('BME280 initialization succeeded');
		pushData();
	})
	.catch((err) => console.error('BME280 initialization failed', err));

let pushTimer;
const pushData = () => {
	bme280
		.readSensorData()
		.then((data) => {
			mqttClient.publish(`${MQTT_TOPIC_PREFIX}/temperature`, String(data.temperature_C), { retain: true });
			mqttClient.publish(`${MQTT_TOPIC_PREFIX}/pressure`, String(data.pressure_hPa), { retain: true });
			mqttClient.publish(`${MQTT_TOPIC_PREFIX}/humidity`, String(data.humidity), { retain: true });

			if (data.temperature_C >= 20) {
				mqttClient.publish(`${MQTT_TOPIC_PREFIX}/heat-index`, String(Feels.heatIndex(data.temperature_C, data.humidity)), { retain: true });
			}

			mqttClient.publish(`${MQTT_TOPIC_PREFIX}/humidex`, String(Feels.humidex(data.temperature_C, data.humidity)), { retain: true });
			mqttClient.publish(`${MQTT_TOPIC_PREFIX}/dew-point`, String(Feels.getDP(data.temperature_C, data.humidity)), { retain: true });
		})
		.catch((err) => {
			console.error('BME280 read error', err);
		});
}
const stopTimer = () => clearInterval(pushTimer);

mqttClient
	.on('connect', connack => {
		console.log("Connected!")
		pushData();

		pushTimer = setInterval(pushData, PUSH_INTERVAL);
	})
	.on('reconnect', () => {
		stopTimer();
		console.warn("Reconnecting...");
	})

	.on('close', () => {
		stopTimer();
		console.warn("Disconnected");
	})

	.on('offline', () => {
		stopTimer();
		console.warn('Offline');
	})

	.on('error', err => {
		stopTimer();
		console.error(err);
	})

const bye = () => {
	stopTimer();
	process.exit(0);
};

process
	.on('SIGTERM', bye)
	.on('SIGINT', bye)
	.on('SIGHUP', bye)
	.on('SIGBREAK', bye);
