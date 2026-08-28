'use strict';

const { OAuth2Driver } = require('homey-oauth2app');

const CAMERA_MODELS = new Set([
  'lumi.camera.acn003',
  'lumi.camera.agl001',
  'lumi.camera.gwag03',
  'lumi.camera.gwagl02',
  'lumi.camera.gwpgl1',
  'lumi.camera.gwpagl01',
  'lumi.camera.acn007',
  'lumi.camera.acn006',
  'lumi.camera.acn016',
  'lumi.camera.agl005',
  'lumi.camera.acn009',
  'lumi.camera.acn010',
  'lumi.camera.agl004',
  'lumi.camera.agl003',
  'lumi.camera.agl002',
  'lumi.camera.acn005',
  'lumi.camera.agl006',
  'lumi.camera.acn017',
  'lumi.camera.agl010',
  'lumi.camera.agl013',
  'aqara.camera.acn002',
]);

class AqaraCameraDriver extends OAuth2Driver {
  async onOAuth2Init() {
    this.log('AqaraCameraDriver initialized');
  }

  async onPairListDevices({ oAuth2Client }) {
    const devices = await oAuth2Client.getAllDevices();
    const cameras = devices.filter(device => CAMERA_MODELS.has(device.model));

    if (!cameras.length) {
      throw new Error('No supported Aqara cameras were found in this Aqara account.');
    }

    return cameras.map(device => ({
      name: device.deviceName || device.model || device.did,
      data: {
        id: device.did,
      },
      store: {
        aqara_model: device.model,
        aqara_device_name: device.deviceName || '',
        aqara_position_id: device.positionId || '',
      },
      settings: {
        camera_name: device.deviceName || 'Aqara Camera',
        rtsp_url: '',
      },
    }));
  }
}

module.exports = AqaraCameraDriver;
