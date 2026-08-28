'use strict';

const Homey = require('homey');
const AqaraApiClient = require('../../lib/aqara-api');

class AqaraCameraDevice extends Homey.Device {
  async onInit() {
    this.log('AqaraCameraDevice initialized');
    this.client = null;
    this.video = null;
    this.initialized = false;

    try {
      await this._setupClient();
      await this._setupCameraVideo();
      this._registerCapabilities();
      this._registerEvents();
      this._registerFlowCards();
      this.initialized = true;
    } catch (error) {
      this.error('Camera initialization failed:', error);
      await this.setUnavailable(`Configuration or connection error: ${error.message}`).catch(() => {});
    }
  }

  _getSetting(id) {
    return this.getSetting(id) || '';
  }

  async _setupClient() {
    const clientId = this._getSetting('aqara_client_id');
    const clientSecret = this._getSetting('aqara_client_secret');
    const accessToken = this._getSetting('aqara_access_token');
    const region = this._getSetting('aqara_region') || 'eu';

    if (!clientId || !clientSecret || !accessToken) {
      this.log('Aqara Cloud credentials are not configured; local RTSP mode remains available.');
      return;
    }

    this.client = new AqaraApiClient({ clientId, clientSecret, accessToken, region });
    this.client.on('connected', () => this.log('Aqara event connection established'));
    this.client.on('disconnected', () => this.log('Aqara event connection disconnected'));
    this.client.on('connection_error', error => this.error('Aqara event connection:', error));
  }

  async _setupCameraVideo() {
    const rtspUrl = this._getSetting('rtsp_url');
    if (!rtspUrl) {
      this.log('No RTSP URL configured; camera video will remain unavailable until configured.');
      return;
    }

    if (!this.homey.hasFeature || this.homey.hasFeature('camera-streaming')) {
      this.video = await this.homey.videos.createVideoRTSP();
      this.video.registerVideoUrlListener(async () => ({ url: rtspUrl }));
      await this.setCameraVideo('live', this._getSetting('camera_name') || 'Aqara Camera', this.video);
      this.log('Native Homey RTSP camera video registered');
    } else {
      this.log('Homey camera-streaming feature is unavailable');
    }
  }

  _registerCapabilities() {
    this.registerCapabilityListener('onoff', async value => {
      if (!this.client) return true;
      const subjectId = this._getSetting('aqara_subject_id');
      if (!subjectId) return true;
      await this.client.setPrivacyMode(subjectId, !value);
      return true;
    });

    this.registerCapabilityListener('light_mode', async value => {
      if (!this.client) return true;
      const subjectId = this._getSetting('aqara_subject_id');
      if (!subjectId) return true;
      await this.client.setLightMode(subjectId, value);
      return true;
    });

    this.registerCapabilityListener('microphone', async value => {
      if (!this.client) return true;
      const subjectId = this._getSetting('aqara_subject_id');
      if (!subjectId) return true;
      await this.client.setMicrophone(subjectId, value);
      return true;
    });
  }

  _registerEvents() {
    if (!this.client) return;

    this.client.on('motion_detected', async () => {
      try {
        const snapshot = await this.takeSnapshot();
        await this.homey.flow.getDeviceTriggerCard('motion_detected').trigger(this, { snapshot });
      } catch (error) {
        this.error('Motion trigger failed:', error);
      }
    });

    this.client.on('person_detected', async () => {
      try {
        await this.homey.flow.getDeviceTriggerCard('person_detected').trigger(this);
      } catch (error) {
        this.error('Person trigger failed:', error);
      }
    });

    this.client.on('sound_detected', async ({ decibel }) => {
      try {
        await this.homey.flow.getDeviceTriggerCard('sound_detected').trigger(this, { decibel: Number(decibel) || 0 });
      } catch (error) {
        this.error('Sound trigger failed:', error);
      }
    });

    this.client.connectWebsocket();
  }

  async takeSnapshot() {
    if (!this.client) return null;
    const subjectId = this._getSetting('aqara_subject_id');
    if (!subjectId) return null;

    try {
      const response = await this.client.request('query.cam.snapshot', { subjectId });
      if (!response || !response.url) return null;

      const image = await this.homey.images.createImage();
      image.setStream(async stream => {
        const result = await fetch(response.url);
        if (!result.ok || !result.body) throw new Error(`Snapshot HTTP ${result.status}`);
        const { Readable } = require('stream');
        Readable.fromWeb(result.body).pipe(stream);
      });
      return image;
    } catch (error) {
      this.error('Snapshot failed:', error);
      return null;
    }
  }

  _registerFlowCards() {
    this.homey.flow.getActionCard('set_privacy_mode').registerRunListener(async ({ enabled }) => {
      if (!this.client) throw new Error('Aqara Cloud is not configured');
      await this.client.setPrivacyMode(this._getSetting('aqara_subject_id'), enabled === true || enabled === 'true');
      return true;
    });

    this.homey.flow.getActionCard('play_audio_clip').registerRunListener(async ({ clip }) => {
      if (!this.client) throw new Error('Aqara Cloud is not configured');
      await this.client.playAudioClip(this._getSetting('aqara_subject_id'), clip);
      return true;
    });

    this.homey.flow.getActionCard('export_recording').registerRunListener(async () => {
      if (!this.client) throw new Error('Aqara Cloud is not configured');
      const response = await this.client.exportRecording(this._getSetting('aqara_subject_id'), {});
      return { recording_url: response && response.url ? response.url : '' };
    });
  }

  async onSettings({ newSettings }) {
    const oldUrl = this._getSetting('rtsp_url');
    const newUrl = newSettings.rtsp_url || '';
    if (oldUrl !== newUrl) {
      if (this.video) await this.video.unregister().catch(() => {});
      this.video = null;
      if (newUrl) {
        this.video = await this.homey.videos.createVideoRTSP();
        this.video.registerVideoUrlListener(async () => ({ url: newUrl }));
        await this.setCameraVideo('live', newSettings.camera_name || 'Aqara Camera', this.video);
      }
    }
  }

  async onDeleted() {
    if (this.video) await this.video.unregister().catch(() => {});
    if (this.client) this.client.destroy();
    this.video = null;
    this.client = null;
    this.log('AqaraCameraDevice deleted');
  }
}

module.exports = AqaraCameraDevice;
