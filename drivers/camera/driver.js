'use strict';

const { OAuth2Driver } = require('homey-oauth2app');
const { isSupportedCamera, getCameraModel } = require('../../lib/aqara/camera-models');

class AqaraCameraDriver extends OAuth2Driver {
  async onOAuth2Init() {
    this.log('AqaraCameraDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    this.homey.flow.getActionCard('set_privacy_mode').registerRunListener(async ({ device, enabled }) => {
      return device.setPrivacyMode(enabled === true || enabled === 'true');
    });

    this.homey.flow.getActionCard('play_audio_clip').registerRunListener(async ({ device, clip }) => {
      return device.playAudioClip(clip);
    });

    this.homey.flow.getActionCard('export_recording').registerRunListener(async ({ device }) => {
      return device.exportRecording();
    });
  }

  async onPairListDevices({ oAuth2Client }) {
    const devices = await oAuth2Client.getAllDevices();
    const cameras = devices
      .filter(device => isSupportedCamera(device.model))
      .filter((device, index, all) => all.findIndex(item => item.did === device.did) === index)
      .sort((a, b) => String(a.deviceName || a.did).localeCompare(String(b.deviceName || b.did)));

    if (!cameras.length) {
      throw new Error('No supported Aqara cameras were found in this Aqara account.');
    }

    return cameras.map(device => {
      const model = getCameraModel(device.model);
      return {
        name: device.deviceName || model?.family || device.model || device.did,
        data: { id: device.did },
        store: {
          aqara_model: device.model || '',
          aqara_device_name: device.deviceName || '',
          aqara_position_id: device.positionId || '',
          aqara_feature_profile: model?.features || {},
        },
        settings: {
          camera_name: device.deviceName || model?.family || 'Aqara Camera',
          rtsp_url: '',
        },
      };
    });
  }
}

module.exports = AqaraCameraDriver;
