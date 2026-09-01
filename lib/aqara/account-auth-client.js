'use strict';

const crypto = require('crypto');
const { createSignature } = require('./signature');
const { withExponentialBackoff } = require('../retry');

const API_URL = 'https://open-ger.aqara.com/v3.0/open/api';

/** Aqara account authorization. This path does not use an OAuth client secret. */
class AqaraAccountAuthClient {
  constructor({ app }) {
    this.app = app;
    this.homey = app.homey;
  }

  getCredentials() {
    return {
      appId: String(this.homey.settings.get('aqara_app_id') || '').trim(),
      appKey: String(this.homey.settings.get('aqara_app_key') || '').trim(),
      keyId: String(this.homey.settings.get('aqara_key_id') || '').trim(),
    };
  }

  async request(intent, data = {}, { accessToken = '' } = {}) {
    const { appId, appKey, keyId } = this.getCredentials();
    if (!appId || !appKey || !keyId) {
      throw new Error('Aqara App ID, App Key and Key ID must be configured first.');
    }

    return withExponentialBackoff(async () => {
      const nonce = crypto.randomBytes(16).toString('hex');
      const time = Date.now().toString();
      const sign = createSignature({ accessToken, appId, keyId, nonce, time, appKey });
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Appid: appId,
          Keyid: keyId,
          Accesstoken: accessToken,
          Nonce: nonce,
          Time: time,
          Sign: sign,
          Lang: 'en',
        },
        body: JSON.stringify({ intent, data }),
      });

      if (!response.ok) throw new Error(`Aqara HTTP ${response.status}`);
      const body = await response.json();
      if (!body || Number(body.code) !== 0) {
        const error = new Error(`Aqara API ${body?.code ?? 'unknown'}: ${body?.message || 'Unknown error'}`);
        error.aqaraCode = Number(body?.code);
        throw error;
      }
      return body.result || {};
    }, {
      retries: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      onRetry: ({ attempt, delay }) => this.app.log(`Retrying Aqara ${intent} (attempt ${attempt}, ${delay}ms)`),
    });
  }

  async requestAuthCode({ account, accessTokenValidity = '30d' }) {
    const normalized = String(account || '').trim();
    if (!normalized) throw new Error('Enter your Aqara account email address or phone number.');
    const result = await this.request('config.auth.getAuthCode', {
      account: normalized,
      accountType: 0,
      accessTokenValidity,
    });
    if (!result.authCode) throw new Error('Aqara did not return an authorization code.');
    return result.authCode;
  }

  async exchangeAuthCode({ account, authCode }) {
    const normalizedAccount = String(account || '').trim();
    const normalizedCode = String(authCode || '').trim();
    if (!normalizedAccount || !normalizedCode) throw new Error('Aqara account and verification code are required.');
    const result = await this.request('config.auth.getToken', {
      authCode: normalizedCode,
      account: normalizedAccount,
      accountType: 0,
    });
    await this.saveToken({ account: normalizedAccount, result });
    return result;
  }

  async refreshToken() {
    const refreshToken = String(this.homey.settings.get('aqara_refresh_token') || '').trim();
    if (!refreshToken) throw new Error('No Aqara refresh token is available. Reconnect the Aqara account.');
    const result = await this.request('config.auth.refreshToken', { refreshToken });
    await this.saveToken({ result });
    return result;
  }

  async saveToken({ account, result }) {
    const accessToken = String(result?.accessToken || '').trim();
    const refreshToken = String(result?.refreshToken || '').trim();
    const expiresIn = Number(result?.expiresIn || 0);
    if (!accessToken || !refreshToken || !expiresIn) throw new Error('Aqara returned an incomplete authorization token response.');

    await this.homey.settings.set('aqara_access_token', accessToken);
    await this.homey.settings.set('aqara_refresh_token', refreshToken);
    await this.homey.settings.set('aqara_token_expires_at', Date.now() + expiresIn * 1000);
    if (account) await this.homey.settings.set('aqara_account', account);
    if (result.openId) await this.homey.settings.set('aqara_open_id', String(result.openId));
  }

  isAuthorized() {
    return Boolean(
      String(this.homey.settings.get('aqara_access_token') || '').trim()
      && String(this.homey.settings.get('aqara_refresh_token') || '').trim(),
    );
  }

  async getAccessToken() {
    const token = String(this.homey.settings.get('aqara_access_token') || '').trim();
    const expiresAt = Number(this.homey.settings.get('aqara_token_expires_at') || 0);
    if (!token) throw new Error('Connect an Aqara account first.');
    if (expiresAt > Date.now() + 5 * 60 * 1000) return token;

    if (!this._refreshPromise) {
      this._refreshPromise = this.refreshToken().finally(() => {
        this._refreshPromise = null;
      });
    }
    await this._refreshPromise;
    return String(this.homey.settings.get('aqara_access_token') || '').trim();
  }

  async getDevices({ pageNum = 1, pageSize = 50 } = {}) {
    const accessToken = await this.getAccessToken();
    return this.request('query.device.info', {
      dids: [],
      positionId: '',
      pageNum,
      pageSize,
    }, { accessToken });
  }

  async getAllDevices() {
    const devices = [];
    let pageNum = 1;
    const pageSize = 50;
    while (true) {
      const result = await this.getDevices({ pageNum, pageSize });
      const page = Array.isArray(result?.data) ? result.data : [];
      const totalCount = Number(result?.totalCount || 0);
      devices.push(...page);
      if (page.length === 0 || page.length < pageSize || (totalCount > 0 && devices.length >= totalCount)) break;
      pageNum += 1;
      if (pageNum > 100) throw new Error('Aqara device pagination exceeded the safety limit.');
    }
    return devices;
  }

  async logout() {
    await Promise.all([
      this.homey.settings.unset('aqara_access_token'),
      this.homey.settings.unset('aqara_refresh_token'),
      this.homey.settings.unset('aqara_token_expires_at'),
      this.homey.settings.unset('aqara_open_id'),
      this.homey.settings.unset('aqara_account'),
    ]);
  }
}

module.exports = AqaraAccountAuthClient;
