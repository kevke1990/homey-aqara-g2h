'use strict';

const { OAuth2Device } = require('homey-oauth2app');

class AqaraCameraDevice extends OAuth2Device {
  async onOAuth2Init() {
    this.video = null;
    this.initialized = false;

    try {
      await this._setupCameraVideo();
      this._registerCapabilities();
      this._registerFlowCards();
      this._registerViewEvents();
      this.initialized = true;
      await this.setAvailable();
      this.log(`Aqara camera initialized: ${this.getData().id}`);
    } catch (error) {
      this.error('Camera initialization failed:', error);
      await this.setUnavailable(`Configuration error: ${error.message}`);
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
      this.log('No local RTSP URL configured; live video will remain unavailable until configured.');
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
    this.registerCapabilityListener('onoff', async value => {
      await this.oAuth2Client.requestIntent('write.resource.device', {
        subjectId: this._getSubjectId(),
        resources: [{ resourceId: 'privacy_mode', value: value ? 0 : 1 }],
      });
      return true;
    });

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

  _registerFlowCards() {
    this.homey.flow.getActionCard('set_privacy_mode').registerRunListener(async ({ enabled }) => {
      await this.oAuth2Client.requestIntent('write.resource.device', {
        subjectId: this._getSubjectId(),
        resources: [{ resourceId: 'privacy_mode', value: enabled === true || enabled === 'true' ? 1 : 0 }],
      });
      return true;
    });

    this.homey.flow.getActionCard('play_audio_clip').registerRunListener(async ({ clip }) => {
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
    });

    this.homey.flow.getActionCard('export_recording').registerRunListener(async () => {
      const result = await this.oAuth2Client.requestIntent('query.cam.recording.export', {
        subjectId: this._getSubjectId(),
      });
      return { recording_url: result?.url || '' };
    });
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
      this.error('Snapshot failed:', error);
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
    if (this.video) {
      await this.video.unregister().catch(() => {});
      this.video = null;
    }
  }

  async onOAuth2Deleted() {
    await this.onOAuth2Uninit();
  }
}

module.exports = AqaraCameraDevice;
