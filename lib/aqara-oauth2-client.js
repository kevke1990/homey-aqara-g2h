'use strict';

const Homey = require('homey');
const crypto = require('crypto');
const { OAuth2Client, OAuth2Error } = require('homey-oauth2app');
const { createSignature } = require('./aqara/signature');
const { withExponentialBackoff } = require('./retry');

const API_URL = 'https://open-ger.aqara.com/v3.0/open/api';
const AUTHORIZATION_URL = 'https://open-ger.aqara.com/v3.0/open/authorize';
const TOKEN_URL = 'https://open-ger.aqara.com/v3.0/open/access_token';
const REDIRECT_URL = 'https://callback.athom.com/oauth2/callback';

class AqaraOAuth2Client extends OAuth2Client {
  static API_URL = API_URL;
  static TOKEN_URL = TOKEN_URL;
  static AUTHORIZATION_URL = AUTHORIZATION_URL;
  static REDIRECT_URL = REDIRECT_URL;
  static SCOPES = [];

  async onRequestHeaders({ headers }) {
    const token = await this.getToken();
    if (!token || !token.access_token) throw new OAuth2Error('Aqara authorization is missing');

    const keyId = Homey.env.AQARA_KEY_ID;
    const appId = this._clientId;
    const appKey = this._clientSecret;
    if (!keyId || !appId || !appKey) {
      throw new OAuth2Error('Aqara developer credentials are not configured');
    }

    const accessToken = token.access_token;
    const nonce = crypto.randomBytes(16).toString('hex');
    const time = Date.now().toString();
    const sign = createSignature({ accessToken, appId, keyId, nonce, time, appKey });

    return {
      ...headers,
      'Content-Type': 'application/json',
      Appid: appId,
      Keyid: keyId,
      Accesstoken: accessToken,
      Nonce: nonce,
      Time: time,
      Sign: sign,
      Lang: 'en',
    };
  }

  async onHandleResult({ result }) {
    if (!result || typeof result !== 'object') throw new OAuth2Error('Invalid Aqara API response');
    if (Number(result.code) !== 0) {
      // Aqara's business code is not an HTTP status code. Do not expose it as
      // statusCode or the retry layer could mistake a permanent API error for
      // a transient HTTP 5xx failure.
      throw new OAuth2Error(`Aqara API ${result.code}: ${result.message || 'Unknown error'}`);
    }
    return result.result;
  }

  async requestIntent(intent, data = {}) {
    return withExponentialBackoff(
      () => this.post({ path: '', json: { intent, data } }),
      {
        retries: 3,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        onRetry: ({ attempt, delay }) => this.log(`Retrying Aqara intent ${intent} (attempt ${attempt}, ${delay}ms)`),
      },
    );
  }

  async getDevices({ pageNum = 1, pageSize = 50 } = {}) {
    return this.requestIntent('query.device.info', { positionId: '', pageNum, pageSize });
  }

  async getAllDevices() {
    const devices = [];
    let pageNum = 1;
    const pageSize = 50;

    while (true) {
      const result = await this.getDevices({ pageNum, pageSize });
      const page = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      devices.push(...page);

      const total = Number(result?.totalCount || 0);
      if (page.length < pageSize || (total > 0 && devices.length >= total)) break;
      pageNum += 1;
      if (pageNum > 100) throw new OAuth2Error('Aqara device pagination exceeded the safety limit');
    }

    return devices;
  }
}

module.exports = AqaraOAuth2Client;
