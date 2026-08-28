'use strict';

const Homey = require('homey');

class AqaraCameraDriver extends Homey.Driver {
  async onInit() {
    this.log('AqaraCameraDriver initialized');
  }

  async onPairListDevices() {
    return [{
      name: 'Aqara Camera',
      data: {
        id: `aqara-camera-${Date.now()}`,
      },
    }];
  }
}

module.exports = AqaraCameraDriver;
