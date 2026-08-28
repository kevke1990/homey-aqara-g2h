'use strict';

const Homey = require('homey');
const crypto = require('crypto');

class AqaraCameraDriver extends Homey.Driver {
  async onInit() {
    this.log('AqaraCameraDriver initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => [{
      name: 'Aqara Camera',
      data: { id: `aqara-${crypto.randomUUID()}` },
      settings: {
        camera_name: 'Aqara Camera',
        rtsp_url: '',
        aqara_region: 'eu',
        aqara_client_id: '',
        aqara_client_secret: '',
        aqara_access_token: '',
        aqara_subject_id: '',
      },
    }]);
  }
}

module.exports = AqaraCameraDriver;
