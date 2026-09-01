'use strict';

const { OAuth2App } = require('homey-oauth2app');
const AqaraOAuth2Client = require('./lib/aqara-oauth2-client');
const AqaraAccountAuthClient = require('./lib/aqara/account-auth-client');

const SETTING_APP_ID = 'aqara_app_id';
const SETTING_APP_KEY = 'aqara_app_key';
const SETTING_KEY_ID = 'aqara_key_id';

class AqaraApp extends OAuth2App {
  static OAUTH2_CLIENT = AqaraOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = false;
  static OAUTH2_DRIVERS = ['camera'];

  async onInit() {
    this.aqaraAccountAuth = new AqaraAccountAuthClient({ app: this });
    // Account Authorization is the primary path and must work without OAuth credentials.
    // OAuth2 is configured only when its own credentials are explicitly present.
    this.configureOAuthFromSettings();
    try {
      await super.onInit();
    } catch (error) {
      // Do not let an incomplete optional OAuth configuration prevent the app from starting.
      this.error('OAuth2 initialization failed; Aqara Account Authorization remains available.', error);
    }
    this.log(`Aqara account authorization: ${this.aqaraAccountAuth.isAuthorized() ? 'connected' : 'not connected'}`);
  }

  configureOAuthFromSettings() {
    const clientId = String(this.homey.settings.get(SETTING_APP_ID) || '').trim();
    const clientSecret = String(this.homey.settings.get('aqara_oauth_client_secret') || '').trim();
    if (!clientId) return false;
    const client = this.constructor.OAUTH2_CLIENT;
    client.CLIENT_ID = clientId;
    if (clientSecret) client.CLIENT_SECRET = clientSecret;
    return Boolean(clientSecret);
  }

  async configureOAuthFromAppSettings() {
    // This endpoint configures the non-OAuth Aqara API credentials only.
    const appId = String(this.homey.settings.get(SETTING_APP_ID) || '').trim();
    const appKey = String(this.homey.settings.get(SETTING_APP_KEY) || '').trim();
    const keyId = String(this.homey.settings.get(SETTING_KEY_ID) || '').trim();
    if (!appId || !appKey || !keyId) {
      throw new Error('Configure Aqara App ID, App Key and Key ID first. OAuth Client Secret is not required for Aqara Account Authorization.');
    }
    return {
      configured: true,
      restartRequired: false,
      message: 'Aqara Account Authorization credentials saved. OAuth Client Secret is not required for this authorization method.',
    };
  }

  getAqaraKeyId() {
    return String(this.homey.settings.get(SETTING_KEY_ID) || '').trim();
  }

  isAqaraConfigured() {
    return Boolean(
      String(this.homey.settings.get(SETTING_APP_ID) || '').trim()
      && String(this.homey.settings.get(SETTING_APP_KEY) || '').trim()
      && String(this.homey.settings.get(SETTING_KEY_ID) || '').trim(),
    );
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
  APP_ID: SETTING_APP_ID,
  APP_KEY: SETTING_APP_KEY,
  KEY_ID: SETTING_KEY_ID,
};

module.exports = AqaraApp;
