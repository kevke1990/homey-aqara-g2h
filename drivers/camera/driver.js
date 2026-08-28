'use strict';

const Homey = require('homey');

class AqaraCameraDriver extends Homey.Driver {
  async onInit() {
    this.log('AqaraCameraDriver has been initialized');
  }

  async onPair(session) {
    this.log('Pairing session started');

    session.setHandler('list_devices', async () => {
      this.log('Pairing list_devices called');
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

    session.setHandler('add_device', async (data) => {
      this.log('Pairing add_device called with data:', JSON.stringify(data));
      return true;
    });

    session.setHandler('disconnect', async () => {
      this.log('Pairing session disconnected');
    });
  }
}

module.exports = AqaraCameraDriver;
