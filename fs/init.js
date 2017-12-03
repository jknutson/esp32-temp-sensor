/*
 * Copyright (c) 2014-2017 Cesanta Software Limited
 * All rights reserved
 *
 * This example demonstrates how to use mJS Arduino OneWire
 * library API to get data from DS18B20 temperature sensors.
 * Datasheet: http://datasheets.maximintegrated.com/en/ds/DS18B20.pdf
 */

load('api_config.js');
load('api_net.js');
load('api_mqtt.js');
load('api_arduino_onewire.js');
load('api_timer.js');
load('ds18b20.js');

// setup some stuff, TODO: move to mos.yml
let oneWirePin = 14;
let topic = '/devices/' + Cfg.get('device.id') + '/events';

// Initialize OneWire library
let ow = OneWire.create(oneWirePin);

// Number of sensors found on the 1-Wire bus
let n = 0;
// Sensors addresses
let rom = ['01234567'];

// Search for sensors
let searchSens = function() {
  let i = 0;
  // Setup the search to find the device type on the next call
  // to search() if it is present.
  ow.target_search(DEVICE_FAMILY.DS18B20);

  while (ow.search(rom[i], 0/* Normal search mode */) === 1) {
    // If no devices of the desired family are currently on the bus, 
    // then another type will be found. We should check it.
    if (rom[i][0].charCodeAt(0) !== DEVICE_FAMILY.DS18B20) {
      break;
    }
    // Sensor found
    print('Sensor#', i, 'address:', toHexStr(rom[i]));
    rom[++i] = '01234567';
  }
  return i;
};

// This function prints temperature every n milliseconds second (seconds * 1000)
Timer.set(1000 /* milliseconds */, true /* repeat */, function() {
  if (n === 0) {
    if ((n = searchSens()) === 0) {
      print('No device found');
    }
  }

  for (let i = 0; i < n; i++) {
    let t = getTemp(ow, rom[i]);
    if (isNaN(t)) {
      print('No device found');
      break;
    } else {
      print('Sensor#', i, 'Temperature:', t, '*C');
      let f_t = t * 9 / 5 + 32;
      let message = JSON.stringify({
        fahrenheit: f_t,
        celcius: t
      });
      let ok = MQTT.pub(topic, message, 1);
      print('Published:', ok, topic, '->', message)
    }
  }
}, null);

// Monitor network connectivity.
Net.setStatusEventHandler(function(ev, arg) {
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('== Net event:', ev, evs);
}, null);

