'use strict';

const crypto = require('crypto');
const { createSignature } = require('./signature');
const { withExponentialBackoff } = require('../retry');

const API_URL = 'https://open-ger.aqara.com/v3.0/open/api';

function mask(value, visible = 4) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= visible * 2) return `${text.slice(0, 2)}…${text.slice(-2)}`;
  return `${text.slice(0, visible)}…${text.slice(-visible)}`;
}

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
      const nonce = crypto.randomBytes(8).toString('hex');
      const time = Date.now().toString();
      const sign = createSignature({ accessToken, appId, keyId, nonce, time, appKey });

      this.app.log(`Aqara request: intent=${intent}, appId=${mask(appId)}, keyId=${mask(keyId)}, token=${accessToken ? 'present' : 'absent'}, time=${time}`);

      const headers = {
        'Content-Type': 'application/json',
        Appid: appId,
        Keyid: keyId,
        Nonce: nonce,
        Time: time,
        Sign: sign,
        Lang: 'en',
      };
      // Accesstoken is optional. Do not send an empty header: Aqara explicitly
      // treats it as absent for the signature calculation.
      if (accessToken) headers.Accesstoken = accessToken;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ intent, data }),
      });

      let body;
      try {
        body = await response.json();
      } catch (parseError) {
        throw new Error(`Aqara HTTP ${response.status}: response was not valid JSON.`);
      }

      if (!response.ok) {
        const details = body?.message || body?.msgDetails || 'No error details returned';
        const error = new Error(`Aqara HTTP ${response.status}: ${details}`);
        error.aqaraCode = Number(body?.code);
        error.aqaraRequestId = body?.requestId || null;
        throw error;
      }

      if (!body || Number(body.code) !== 0) {
        const code = Number(body?.code);
        const message = body?.message || 'Unknown error';
        const details = body?.msgDetails || body?.details || '';
        const requestId = body?.requestId || '';

        const known = {
          106: 'Invalid sign',
          107: 'Illegal appKey',
          108: 'Token has expired',
          109: 'Token is absence',
          302: 'Params error',
          305: 'Header Params error',
          403: 'Request forbidden',
          807: 'Account format error',
          811: 'AuthCode incorrect',
          817: 'AuthCode send too often',
        };
        const reason = known[code] || message;
        const suffix = [details, requestId ? `requestId=${requestId}` : ''].filter(Boolean).join('; ');
        const error = new Error(`Aqara API ${code || 'unknown'}: ${reason}${suffix ? ` (${suffix})` : ''}`);
        error.aqaraCode = code;
        error.aqaraMessage = message;
        error.aqaraDetails = details;
        error.aqaraRequestId = requestId || null;
        throw error;
      }
      return body.result || {};
    }, {
      retries: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      onRetry: ({ attempt, delay, error }) => this.app.log(`Retrying Aqara ${intent} (attempt ${attempt}, ${delay}ms): ${error.message}`),
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
