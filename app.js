'use strict';

const { OAuth2App } = require('homey-oauth2app');
const AqaraOAuth2Client = require('./lib/aqara-oauth2-client');
const AqaraAccountAuthClient = require('./lib/aqara/account-auth-client');

const SETTING_CLIENT_ID = 'aqara_client_id';
const SETTING_CLIENT_SECRET = 'aqara_client_secret';
const SETTING_KEY_ID = 'aqara_key_id';

class AqaraApp extends OAuth2App {
  static OAUTH2_CLIENT = AqaraOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = false;
  static OAUTH2_DRIVERS = ['camera'];

  async onInit() {
    this.aqaraAccountAuth = new AqaraAccountAuthClient({ app: this });
    const client = this.constructor.OAUTH2_CLIENT;
    const configured = this.configureOAuthFromSettings();
    const originalApiUrl = client.API_URL;
    if (!configured) client.API_URL = null;
    try {
      await super.onInit();
    } finally {
      client.API_URL = originalApiUrl;
    }
    this.log(`Aqara account authorization: ${this.aqaraAccountAuth.isAuthorized() ? 'connected' : 'not connected'}`);
  }

  configureOAuthFromSettings() {
    const clientId = String(this.homey.settings.get(SETTING_CLIENT_ID) || '').trim();
    const clientSecret = String(this.homey.settings.get(SETTING_CLIENT_SECRET) || '').trim();
    const keyId = String(this.homey.settings.get(SETTING_KEY_ID) || '').trim();
    if (!clientId || !clientSecret || !keyId) return false;
    const client = this.constructor.OAUTH2_CLIENT;
    client.CLIENT_ID = clientId;
    client.CLIENT_SECRET = clientSecret;
    return true;
  }

  async configureOAuthFromAppSettings() {
    if (!this.configureOAuthFromSettings()) throw new Error('Configure Aqara Client ID, Client Secret and Key ID first.');
    if (this.hasConfig({ configId: 'default' })) {
      return { configured: true, restartRequired: true, message: 'Aqara developer settings saved. Restart the app to apply changed OAuth credentials.' };
    }
    const client = this.constructor.OAUTH2_CLIENT;
    this.setOAuth2Config({
      client,
      clientId: client.CLIENT_ID,
      clientSecret: client.CLIENT_SECRET,
      apiUrl: client.API_URL,
      tokenUrl: client.TOKEN_URL,
      authorizationUrl: client.AUTHORIZATION_URL,
      redirectUrl: client.REDIRECT_URL,
      scopes: client.SCOPES,
      allowMultiSession: this.constructor.OAUTH2_MULTI_SESSION,
    });
    return { configured: true, restartRequired: false, message: 'Aqara developer settings saved.' };
  }

  getAqaraKeyId() {
    return String(this.homey.settings.get(SETTING_KEY_ID) || '').trim();
  }

  isAqaraConfigured() {
    return this.configureOAuthFromSettings();
  }

  getAqaraAccountAuth() {
    if (!this.aqaraAccountAuth) this.aqaraAccountAuth = new AqaraAccountAuthClient({ app: this });
    return this.aqaraAccountAuth;
  }

  async requestAqaraAuthCode({ account }) {
    return this.getAqaraAccountAuth().requestAuthCode({ account, accessTokenValidity: '30d' });
  }

  async verifyAqaraAuthCode({ account, authCode }) {
    const result = await this.getAqaraAccountAuth().exchangeAuthCode({ account, authCode });
    return { connected: true, openId: result.openId || null, expiresIn: Number(result.expiresIn || 0) };
  }

  getAqaraConnectionStatus() {
    const auth = this.getAqaraAccountAuth();
    return {
      configured: this.isAqaraConfigured(),
      connected: auth.isAuthorized(),
      account: this.homey.settings.get('aqara_account') || '',
      expiresAt: Number(this.homey.settings.get('aqara_token_expires_at') || 0),
    };
  }

  async disconnectAqaraAccount() {
    await this.getAqaraAccountAuth().logout();
    return { connected: false };
  }

  async getAqaraDevices() {
    return this.getAqaraAccountAuth().getAllDevices();
  }

  async onOAuth2Init() {
    this.log('Aqara OAuth2 App initialized');
  }
}

AqaraApp.SETTINGS = {
  CLIENT_ID: SETTING_CLIENT_ID,
  CLIENT_SECRET: SETTING_CLIENT_SECRET,
  KEY_ID: SETTING_KEY_ID,
};

module.exports = AqaraApp;
