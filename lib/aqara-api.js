'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const WebSocket = require('ws');

class AqaraApiClient extends EventEmitter {
  constructor({ clientId, clientSecret, accessToken, region = 'eu', timeoutMs = 15000 }) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = accessToken;
    this.timeoutMs = timeoutMs;
    this.baseUrl = `https://open-${region}.aqara.com/v3.0/open/api`;
    this.wsUrl = `wss://open-${region}.aqara.com/v3.0/open/ws`;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 60000;
    this.reconnectTimer = null;
    this.destroyed = false;
    this.connecting = false;
  }

  async request(intent, data = {}) {
    if (!this.clientId || !this.clientSecret || !this.accessToken) {
      throw new Error('Aqara Cloud credentials are not configured');
    }

    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const sign = crypto
      .createHash('md5')
      .update(`${intent}${nonce}${timestamp}${this.clientSecret}`)
      .digest('hex')
      .toLowerCase();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Appid: this.clientId,
          Keyid: this.clientId,
          Nonce: nonce,
          Time: timestamp,
          Sign: sign,
          Accesstoken: this.accessToken,
        },
        body: JSON.stringify({ intent, data }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Aqara API HTTP ${response.status}`);
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(`Aqara API ${result.code}: ${result.message || 'Unknown error'}`);
      }
      return result.result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`Aqara API timeout after ${this.timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  connectWebsocket() {
    if (this.destroyed || this.connecting) return;
    this.connecting = true;
    this._clearReconnectTimer();

    if (this.ws) {
      try { this.ws.removeAllListeners(); this.ws.close(); } catch (_) {}
      this.ws = null;
    }

    try {
      const ws = new WebSocket(this.wsUrl, {
        headers: { Appid: this.clientId, Accesstoken: this.accessToken },
        handshakeTimeout: this.timeoutMs,
      });
      this.ws = ws;

      ws.once('open', () => {
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      ws.on('message', data => this.handleMessage(data));

      ws.once('close', () => {
        this.connecting = false;
        this.ws = null;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      ws.once('error', error => {
        this.connecting = false;
        this.emit('connection_error', error);
        // close event performs the single reconnect scheduling path
        try { ws.close(); } catch (_) {}
      });
    } catch (error) {
      this.connecting = false;
      this.emit('connection_error', error);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer) return;
    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebsocket();
    }, delay);
  }

  handleMessage(data) {
    try {
      const payload = JSON.parse(data.toString());
      if (payload.msgType !== 'resource_report' || !payload.data) return;
      const { subjectId, resourceId, value } = payload.data;
      if (resourceId === 'motion') this.emit('motion_detected', { subjectId, value });
      if (resourceId === 'person') this.emit('person_detected', { subjectId, value });
      if (resourceId === 'sound') {
        const decibel = typeof value === 'object' ? value.decibel : value;
        this.emit('sound_detected', { subjectId, decibel: Number(decibel) || 0 });
      }
    } catch (error) {
      this.emit('connection_error', new Error(`Invalid Aqara event payload: ${error.message}`));
    }
  }

  async getStreamUrl(subjectId) {
    return this.request('query.cam.stream.url', { subjectId });
  }

  async setPrivacyMode(subjectId, enabled) {
    return this.request('write.resource.device.control', {
      subjectId,
      resources: [{ resourceId: 'privacy_mode', value: enabled ? 1 : 0 }],
    });
  }

  async setLightMode(subjectId, value) {
    return this.request('write.resource.device.control', {
      subjectId,
      resources: [{ resourceId: 'light_mode', value }],
    });
  }

  async setMicrophone(subjectId, enabled) {
    return this.request('write.resource.device.control', {
      subjectId,
      resources: [{ resourceId: 'microphone', value: enabled ? 1 : 0 }],
    });
  }

  async playAudioClip(subjectId, text) {
    return this.request('write.resource.device.control', {
      subjectId,
      resources: [{ resourceId: 'play_audio', value: text }],
    });
  }

  async exportRecording(subjectId, timeRange = {}) {
    return this.request('query.cam.recording.export', { subjectId, ...timeRange });
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  destroy() {
    this.destroyed = true;
    this._clearReconnectTimer();
    if (this.ws) {
      try { this.ws.removeAllListeners(); this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    this.removeAllListeners();
  }
}

module.exports = AqaraApiClient;
