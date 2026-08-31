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
    if (!oAuth2Client) {
      throw new Error('Aqara authorization client is unavailable. Please reconnect Aqara.');
    }

    let devices;
    try {
      devices = await oAuth2Client.getAllDevices();
    } catch (error) {
      this.error('Failed to query Aqara devices during pairing', error);
      throw new Error(`Aqara camera discovery failed: ${error.message || 'Unknown Aqara API error'}`);
    }

    const cameras = devices
      .filter(device => device && device.did && isSupportedCamera(device.model))
      .filter((device, index, all) => all.findIndex(item => item.did === device.did) === index)
      .sort((a, b) => String(a.deviceName || a.did).localeCompare(String(b.deviceName || b.did), undefined, {
        sensitivity: 'base',
        numeric: true,
      }));

    if (!cameras.length) {
      throw new Error('No supported Aqara cameras were found in this Aqara account. Make sure the cameras are added to Aqara Home and are available to the selected Aqara region.');
    }

    return cameras.map(device => {
      const model = getCameraModel(device.model);
      const displayName = device.deviceName || model?.family || device.model || device.did;

      return {
        name: displayName,
        data: {
          id: device.did,
        },
        store: {
          aqara_did: device.did,
          aqara_model: device.model || '',
          aqara_device_name: device.deviceName || '',
          aqara_position_id: device.positionId || '',
          aqara_parent_did: device.parentDid || '',
          aqara_state: Number(device.state) === 1 ? 'online' : 'offline',
          aqara_firmware_version: device.firmwareVersion || '',
          aqara_timezone: device.timeZone || '',
          aqara_feature_profile: model?.features || {},
        },
        settings: {
          camera_name: displayName,
          rtsp_url: '',
        },
      };
    });
  }
}

module.exports = AqaraCameraDriver;
