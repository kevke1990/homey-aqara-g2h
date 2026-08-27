const Homey = require('homey');

class AqaraG2HDevice extends Homey.Device {
  async onInit() {
    this.video = null;
    this.videoRegistered = false;

    this.log('Initializing Aqara G2H camera');
    this.log(`Homey version: ${this.homey.version}`);

    await this.registerVideo();

    this.log('Aqara G2H camera initialized');
  }

  getRtspUrl() {
    return String(this.getSetting('rtsp_url') || '').trim();
  }

  async registerVideo() {
    const rtspUrl = this.getRtspUrl();

    if (!rtspUrl) {
      await this.setUnavailable('RTSP URL is not configured');
      throw new Error('RTSP URL is not configured');
    }

    if (!/^rtsp:\/\//i.test(rtspUrl)) {
      await this.setUnavailable('Invalid RTSP URL');
      throw new Error('Invalid RTSP URL');
    }

    // Native Homey RTSP video:
    // - no HLS
    // - no FFmpeg
    // - no external service
    // - Homey SHS handles the frontend/WebRTC proxy
    //
    // We intentionally keep disableWebRTCProxy at its default (false).
    // This lets Homey use its native WebRTC proxy for the RTSP source.
    this.video = await this.homey.videos.createVideoRTSP();

    this.video.registerVideoUrlListener(async () => {
      const url = this.getRtspUrl();

      this.log(`Homey requested RTSP URL for ${this.getName()}`);

      return {
        url
      };
    });

    await this.setCameraVideo(
      'aqara_g2h',
      this.getSetting('camera_name') || this.getName() || 'Aqara G2H',
      this.video
    );

    this.videoRegistered = true;
    await this.setAvailable();
  }

  async onSettings({ changedKeys }) {
    if (changedKeys.includes('rtsp_url') || changedKeys.includes('camera_name')) {
      this.log('Camera settings changed; rebuilding RTSP video registration');

      if (this.video) {
        try {
          await this.video.unregister();
        } catch (error) {
          this.error('Failed to unregister previous video', error);
        }
      }

      this.video = null;
      this.videoRegistered = false;

      await this.registerVideo();
    }
  }

  async onUninit() {
    if (this.video) {
      try {
        await this.video.unregister();
      } catch (error) {
        this.error('Failed to unregister RTSP video', error);
      }
    }

    this.video = null;
    this.videoRegistered = false;
  }

  async onDeleted() {
    await this.onUninit();
  }
}

module.exports = AqaraG2HDevice;
