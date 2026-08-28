'use strict';

const Homey = require('homey');

class AqaraCameraDriver extends Homey.Driver {
  async onInit() {
    this.log('AqaraCameraDriver has been initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      // Setup mockup for OAuth2 based pair
      return [
        {
          name: 'Aqara G3 Camera',
          data: {
            id: 'g3_12345'
          },
          store: {
            clientId: 'YOUR_CLIENT_ID',
            clientSecret: 'YOUR_CLIENT_SECRET',
            accessToken: 'YOUR_ACCESS_TOKEN',
            subjectId: 'lumi.camera.g3'
          }
        }
      ];
    });
  }
}

module.exports = AqaraCameraDriver;
