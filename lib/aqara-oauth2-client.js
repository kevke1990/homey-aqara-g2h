'use strict';

const crypto = require('crypto');
const { OAuth2Client, OAuth2Error } = require('homey-oauth2app');

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
    if (!token || !token.access_token) {
      throw new OAuth2Error('Aqara authorization is missing');
    }

    const keyId = HomeyEnv('AQARA_KEY_ID');
    if (!keyId) {
      throw new OAuth2Error('AQARA_KEY_ID is not configured');
    }

    const accessToken = token.access_token;
    const nonce = crypto.randomBytes(16).toString('hex');
    const time = Date.now().toString();
    const appId = this._clientId;
    const appKey = this._clientSecret;

    const signSource = `Accesstoken=${accessToken}&Appid=${appId}&Keyid=${keyId}&Nonce=${nonce}&Time=${time}${appKey}`;
    const sign = crypto.createHash('md5')
      .update(signSource.toLowerCase())
      .digest('hex');

    return {
      ...headers,
      'Content-Type': 'application/json',
      Appid: appId,
      Keyid: keyId,
      Accesstoken: accessToken,
      Nonce: nonce,
      Time: time,
      Sign: sign,
    };
  }

  async onHandleResult({ result }) {
    if (!result || typeof result !== 'object') {
      throw new OAuth2Error('Invalid Aqara API response');
    }

    if (result.code !== 0) {
      throw new OAuth2Error(`Aqara API ${result.code}: ${result.message || 'Unknown error'}`);
    }

    return result.result;
  }

  async requestIntent(intent, data = {}) {
    return this.post({
      path: '',
      json: { intent, data },
    });
  }

  async getDevices({ pageNum = 1, pageSize = 50 } = {}) {
    return this.requestIntent('query.device.info', {
      positionId: '',
      pageNum,
      pageSize,
    });
  }

  async getAllDevices() {
    const devices = [];
    let pageNum = 1;
    const pageSize = 50;

    while (true) {
      const result = await this.getDevices({ pageNum, pageSize });
      const page = Array.isArray(result?.data) ? result.data : [];
      devices.push(...page);

      if (page.length < pageSize || devices.length >= Number(result?.totalCount || 0)) break;
      pageNum += 1;
    }

    return devices;
  }
}

function HomeyEnv(name) {
  if (typeof Homey !== 'undefined' && Homey.env) return Homey.env[name];
  return process.env[name];
}

module.exports = AqaraOAuth2Client;
