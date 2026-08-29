'use strict';

const { OAuth2Device } = require('homey-oauth2app');

class AqaraCameraDevice extends OAuth2Device {
  async onOAuth2Init() {
    this.video = null;
    this.initialized = false;
    this._healthTimer = null;

    try {
      await this._setupCameraVideo();
      this._registerCapabilities();
      this._registerViewEvents();
      this.initialized = true;
      await this.setAvailable();
      this._startHealthTimer();
      this.log(`Aqara camera initialized: ${this.getData().id}`);
    } catch (error) {
      this.error('Camera initialization failed:', error.message);
      await this.setUnavailable(`Initialization failed: ${error.message}`);
    }
  }

  _getSetting(id) {
    return this.getSetting(id) || '';
  }

  _getSubjectId() {
    return this.getData().id;
  }

  async _setupCameraVideo() {
    const rtspUrl = this._getSetting('rtsp_url');
    if (!rtspUrl) {
      this.log('No local RTSP URL configured; live video remains disabled until configured.');
      return;
    }

    this.video = await this.homey.videos.createVideoRTSP();
    this.video.registerVideoUrlListener(async () => ({ url: rtspUrl }));
    await this.setCameraVideo(
      'live',
      this._getSetting('camera_name') || this.getName() || 'Aqara Camera',
      this.video,
    );
  }

  _registerCapabilities() {
    this.registerCapabilityListener('onoff', async value => this.setPrivacyMode(!value));

    this.registerCapabilityListener('light_mode', async value => {
      await this.oAuth2Client.requestIntent('write.resource.device', {
        subjectId: this._getSubjectId(),
        resources: [{ resourceId: 'light_mode', value }],
      });
      return true;
    });

    this.registerCapabilityListener('microphone', async value => {
      await this.oAuth2Client.requestIntent('write.resource.device', {
        subjectId: this._getSubjectId(),
        resources: [{ resourceId: 'microphone', value: value ? 1 : 0 }],
      });
      return true;
    });
  }

  async setPrivacyMode(enabled) {
    await this.oAuth2Client.requestIntent('write.resource.device', {
      subjectId: this._getSubjectId(),
      resources: [{ resourceId: 'privacy_mode', value: enabled ? 1 : 0 }],
    });
    await this.setCapabilityValue('onoff', !enabled).catch(() => {});
    return true;
  }

  async playAudioClip(clip) {
    if (!clip) throw new Error('Audio clip cannot be empty');
    await this.setCapabilityValue('speaker_playing', true).catch(() => {});
    try {
      await this.oAuth2Client.requestIntent('write.resource.device', {
        subjectId: this._getSubjectId(),
        resources: [{ resourceId: 'play_audio', value: clip }],
      });
    } finally {
      await this.setCapabilityValue('speaker_playing', false).catch(() => {});
    }
    return true;
  }

  async exportRecording() {
    const result = await this.oAuth2Client.requestIntent('query.cam.recording.export', {
      subjectId: this._getSubjectId(),
    });
    return { recording_url: result?.url || '' };
  }

  async _startHealthTimer() {
    if (this._healthTimer) clearInterval(this._healthTimer);
    this._healthTimer = setInterval(() => this._checkHealth().catch(error => {
      this.error('Camera health check failed:', error.message);
    }), 10 * 60 * 1000);
  }

  async _checkHealth() {
    if (!this.oAuth2Client) return;
    try {
      await this.oAuth2Client.getDevices({ pageNum: 1, pageSize: 1 });
      await this.setAvailable();
    } catch (error) {
      await this.setUnavailable(`Aqara unavailable: ${error.message}`);
    }
  }

  async handleCameraEvent(type, payload = {}) {
    const snapshot = payload.snapshot || await this.takeSnapshot();
    if (type === 'motion') {
      await this.homey.flow.getDeviceTriggerCard('motion_detected').trigger(this, { snapshot }).catch(() => {});
    } else if (type === 'person') {
      await this.homey.flow.getDeviceTriggerCard('person_detected').trigger(this, {}).catch(() => {});
    } else if (type === 'sound') {
      await this.homey.flow.getDeviceTriggerCard('sound_detected').trigger(this, {
        decibel: Number(payload.decibel || 0),
      }).catch(() => {});
    }
  }

  _registerViewEvents() {
    this.registerViewEvent('camera_view', 'get_stream_url', async () => {
      const result = await this.oAuth2Client.requestIntent('query.cam.stream.url', {
        subjectId: this._getSubjectId(),
      });
      if (!result?.url) throw new Error('Aqara did not return a stream URL');
      return result.url;
    });
  }

  async takeSnapshot() {
    try {
      const response = await this.oAuth2Client.requestIntent('query.cam.snapshot', {
        subjectId: this._getSubjectId(),
      });
      if (!response?.url) return null;

      const image = await this.homey.images.createImage();
      image.setStream(async stream => {
        const result = await fetch(response.url);
        if (!result.ok || !result.body) throw new Error(`Snapshot HTTP ${result.status}`);
        const { Readable } = require('stream');
        Readable.fromWeb(result.body).pipe(stream);
      });
      return image;
    } catch (error) {
      this.error('Snapshot failed:', error.message);
      return null;
    }
  }

  async onSettings({ newSettings }) {
    const oldUrl = this._getSetting('rtsp_url');
    const newUrl = newSettings.rtsp_url || '';

    if (oldUrl !== newUrl) {
      if (this.video) await this.video.unregister().catch(() => {});
      this.video = null;
      if (newUrl) await this._setupCameraVideo();
    }
  }

  async onOAuth2Uninit() {
    if (this._healthTimer) clearInterval(this._healthTimer);
    this._healthTimer = null;
    if (this.video) await this.video.unregister().catch(() => {});
    this.video = null;
  }

  async onOAuth2Deleted() {
    await this.onOAuth2Uninit();
  }
}

module.exports = AqaraCameraDevice;
