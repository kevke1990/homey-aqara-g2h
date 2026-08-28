'use strict';

const Homey = require('homey');

class AqaraApp extends Homey.App {
  async onInit() {
    this.log('Aqara App has been initialized');
  }
}

module.exports = AqaraApp;
