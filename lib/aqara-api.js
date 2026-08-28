'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const WebSocket = require('ws');

class AqaraApiClient extends EventEmitter {
  constructor({ clientId, clientSecret, accessToken, region = 'eu' }) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = accessToken;
    this.baseUrl = `https://open-${region}.aqara.com/v3.0/open/api`;
    this.wsUrl = `wss://open-${region}.aqara.com/v3.0/open/ws`;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimeout = null;
  }

  async request(intent, data = {}) {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signStr = `${intent}${nonce}${timestamp}${this.clientSecret}`;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();

    const headers = {
      'Content-Type': 'application/json',
      'Appid': this.clientId,
      'Keyid': this.clientId,
      'Nonce': nonce,
      'Time': timestamp,
      'Sign': sign,
      'Accesstoken': this.accessToken
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ intent, data })
      });

      if (!response.ok) {
        throw new Error(`Aqara API HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(`Aqara API Error: ${result.message} (Code: ${result.code})`);
      }

      return result.result;
    } catch (error) {
      throw error;
    }
  }

  connectWebsocket() {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.wsUrl, {
        headers: {
          'Appid': this.clientId,
          'Accesstoken': this.accessToken
        }
      });

      this.ws.on('open', () => {
        this.emit('connected');
        this.reconnectAttempts = 0;
      });

      this.ws.on('message', (data) => this.handleMessage(data));

      this.ws.on('close', () => {
        this.scheduleReconnect();
      });

      this.ws.on('error', () => {
        this.ws.close();
      });
      
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }

    const backoffTime = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebsocket();
    }, backoffTime);
  }

  handleMessage(data) {
    try {
      const payload = JSON.parse(data.toString());
      if (payload.msgType === 'resource_report') {
        const { subjectId, resourceId, value } = payload.data;
        if (resourceId === 'motion') {
           this.emit('motion_detected', { subjectId, value });
        } else if (resourceId === 'person') {
           this.emit('person_detected', { subjectId, value });
        } else if (resourceId === 'sound') {
           this.emit('sound_detected', { subjectId, decibel: value.decibel });
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  async getStreamUrl(subjectId) {
    return this.request('query.cam.stream.url', { subjectId });
  }
  
  async setPrivacyMode(subjectId, enabled) {
    return this.request('write.resource.device.control', { 
      subjectId, 
      resources: [{ resourceId: 'privacy_mode', value: enabled ? 1 : 0 }]
    });
  }

  async playAudioClip(subjectId, text) {
    return this.request('write.resource.device.control', { 
      subjectId, 
      resources: [{ resourceId: 'play_audio', value: text }]
    });
  }

  async exportRecording(subjectId, timeRange) {
    return this.request('query.cam.recording.export', { subjectId, ...timeRange });
  }

  destroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
    }
  }
}

module.exports = AqaraApiClient;
