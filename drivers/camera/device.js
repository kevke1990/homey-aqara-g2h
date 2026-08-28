'use strict';

const Homey = require('homey');
const AqaraApiClient = require('../../lib/aqara-api');

class AqaraCameraDevice extends Homey.Device {
  async onInit() {
    this.log('AqaraCameraDevice has been initialized');

    try {
      const { clientId, clientSecret, accessToken, subjectId } = this.getStore();
      this.log(`Initializing client with subjectId: ${subjectId}`);

      this.client = new AqaraApiClient({ clientId, clientSecret, accessToken });

      // Register custom capability listeners
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`Capability onoff changed to: ${value}`);
        await this.client.setPrivacyMode(subjectId, !value);
      });

      this.registerCapabilityListener('light_mode', async (value) => {
        this.log(`Capability light_mode changed to: ${value}`);
        await this.client.request('write.resource.device.control', {
          subjectId,
          resources: [{ resourceId: 'light_mode', value }]
        });
      });

      this.registerCapabilityListener('microphone', async (value) => {
        this.log(`Capability microphone changed to: ${value}`);
        await this.client.request('write.resource.device.control', {
          subjectId,
          resources: [{ resourceId: 'microphone', value: value ? 1 : 0 }]
        });
      });

      // Handle WebSocket events
      this.client.on('motion_detected', async ({ value }) => {
        this.log('Event: motion_detected');
        const snapshot = await this.takeSnapshot();
        await this.homey.flow.getDeviceTriggerCard('motion_detected').trigger(this, { snapshot });
      });

      this.client.on('person_detected', async () => {
        this.log('Event: person_detected');
        await this.homey.flow.getDeviceTriggerCard('person_detected').trigger(this);
      });

      this.client.on('sound_detected', async ({ decibel }) => {
        this.log(`Event: sound_detected at ${decibel}dB`);
        await this.homey.flow.getDeviceTriggerCard('sound_detected').trigger(this, { decibel });
      });

      this.client.connectWebsocket();

      this.registerViewEvent('camera_view', 'get_stream_url', async () => {
        this.log('Custom view event: get_stream_url');
        try {
          const res = await this.client.getStreamUrl(this.getStore().subjectId);
          return res.url;
        } catch (e) {
          this.error('Error fetching stream URL', e);
          throw e;
        }
      });

      this.registerViewEvent('camera_view', 'send_audio_chunk', async (data) => {
        this.log(`Custom view event: send_audio_chunk (size: ${data.length || 0})`);
        return true;
      });

      this.registerFlowCards();

      this.log('Device initialization finished successfully');
    } catch (error) {
      this.error('Error during device initialization:', error);
    }
  }

  async takeSnapshot() {
    this.log('taking snapshot');
    const { subjectId } = this.getStore();
    try {
      const response = await this.client.request('query.cam.snapshot', { subjectId });
      const image = await this.homey.images.createImage();
      image.setStream(async (stream) => {
        const res = await fetch(response.url);
        const { Readable } = require("stream");
        Readable.fromWeb(res.body).pipe(stream);
      });
      return image;
    } catch (err) {
      this.error('Snapshot failed', err);
      return null;
    }
  }

  registerFlowCards() {
    this.log('Registering flow cards');
    try {
      this.homey.flow.getActionCard('set_privacy_mode')
        .registerRunListener(async (args) => {
          this.log(`Action: set_privacy_mode to ${args.enabled}`);
          await this.client.setPrivacyMode(this.getStore().subjectId, args.enabled);
          return true;
        });

      this.homey.flow.getActionCard('play_audio_clip')
        .registerRunListener(async (args) => {
          this.log(`Action: play_audio_clip (${args.clip})`);
          await this.client.playAudioClip(this.getStore().subjectId, args.clip);
          return true;
        });

      this.homey.flow.getActionCard('export_recording')
        .registerRunListener(async (args) => {
          this.log('Action: export_recording');
          const response = await this.client.exportRecording(this.getStore().subjectId, {});
          return { recording_url: response.url };
        });
    } catch (error) {
       this.error('Error registering flow cards:', error);
    }
  }

  async onDeleted() {
    if (this.client) {
      this.client.destroy();
    }
    this.log('AqaraCameraDevice has been deleted');
  }
}

module.exports = AqaraCameraDevice;
