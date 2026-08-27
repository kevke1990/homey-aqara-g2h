const Homey = require('homey');

class AqaraG2HCameraApp extends Homey.App {
  async onInit() {
    this.log('Aqara G2H Camera app started');
    this.log(`Homey version: ${this.homey.version}`);
  }
}

module.exports = AqaraG2HCameraApp;
