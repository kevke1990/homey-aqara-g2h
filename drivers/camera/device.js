'use strict';

const Homey = require('homey');
const AqaraApiClient = require('../../lib/aqara-api');

class AqaraCameraDevice extends Homey.Device {
  async onInit() {
    this.log('AqaraCameraDevice has been initialized');

    const { clientId, clientSecret, accessToken, subjectId } = this.getStore();

    this.client = new AqaraApiClient({ clientId, clientSecret, accessToken });
    
    // Register custom capability listeners
    this.registerCapabilityListener('onoff', async (value) => {
      await this.client.setPrivacyMode(subjectId, !value);
    });

    this.registerCapabilityListener('light_mode', async (value) => {
      await this.client.request('write.resource.device.control', {
        subjectId,
        resources: [{ resourceId: 'light_mode', value }]
      });
    });

    this.registerCapabilityListener('microphone', async (value) => {
      await this.client.request('write.resource.device.control', {
        subjectId,
        resources: [{ resourceId: 'microphone', value: value ? 1 : 0 }]
      });
    });

    // Handle WebSocket events
    this.client.on('motion_detected', async ({ value }) => {
      const snapshot = await this.takeSnapshot();
      await this.homey.flow.getDeviceTriggerCard('motion_detected').trigger(this, { snapshot });
    });

    this.client.on('person_detected', async () => {
      await this.homey.flow.getDeviceTriggerCard('person_detected').trigger(this);
    });

    this.client.on('sound_detected', async ({ decibel }) => {
      await this.homey.flow.getDeviceTriggerCard('sound_detected').trigger(this, { decibel });
    });

    this.client.connectWebsocket();

    
    
    this.registerViewEvent('camera_view', 'get_stream_url', async () => {
      const res = await this.client.getStreamUrl(this.getStore().subjectId);
      return res.url;
    });

    this.registerViewEvent('camera_view', 'send_audio_chunk', async (data) => {
      return true;
    });
    
    this.registerFlowCards();
  }

    async takeSnapshot() {
    const { subjectId } = this.getStore();
    try {
      const response = await this.client.request('query.cam.snapshot', { subjectId });
      const image = await this.homey.images.createImage();
      image.setStream(async (stream) => {
        const res = await fetch(response.url);
        const { Readable } = require("stream"); Readable.fromWeb(res.body).pipe(stream);
      });
      return image;
    } catch (err) {
      this.error('Snapshot failed', err);
      return null;
    }
  }

  registerFlowCards() {
    this.homey.flow.getActionCard('set_privacy_mode')
      .registerRunListener(async (args) => {
        await this.client.setPrivacyMode(this.getStore().subjectId, args.enabled);
        return true;
      });

    this.homey.flow.getActionCard('play_audio_clip')
      .registerRunListener(async (args) => {
        await this.client.playAudioClip(this.getStore().subjectId, args.clip);
        return true;
      });

    this.homey.flow.getActionCard('export_recording')
      .registerRunListener(async (args) => {
        const response = await this.client.exportRecording(this.getStore().subjectId, {});
        return { recording_url: response.url };
      });
  }

  async onDeleted() {
    if (this.client) {
      this.client.destroy();
    }
    this.log('AqaraCameraDevice has been deleted');
  }
}

module.exports = AqaraCameraDevice;
