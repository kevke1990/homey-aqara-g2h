'use strict';

const { OAuth2App } = require('homey-oauth2app');
const AqaraOAuth2Client = require('./lib/aqara-oauth2-client');

const SETTING_CLIENT_ID = 'aqara_client_id';
const SETTING_CLIENT_SECRET = 'aqara_client_secret';
const SETTING_KEY_ID = 'aqara_key_id';

class AqaraApp extends OAuth2App {
  static OAUTH2_CLIENT = AqaraOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = false;
  static OAUTH2_DRIVERS = ['camera'];

  async onInit() {
    const configured = this.configureOAuthFromSettings();

    // OAuth2App initializes its configuration from the static client fields.
    // We deliberately disable that configuration when credentials are absent,
    // so a missing setup can never crash the entire app during startup.
    const client = this.constructor.OAUTH2_CLIENT;
    const originalApiUrl = client.API_URL;

    if (!configured) client.API_URL = null;

    try {
      await super.onInit();
    } finally {
      client.API_URL = originalApiUrl;
    }
  }

  configureOAuthFromSettings() {
    const clientId = String(this.homey.settings.get(SETTING_CLIENT_ID) || '').trim();
    const clientSecret = String(this.homey.settings.get(SETTING_CLIENT_SECRET) || '').trim();
    const keyId = String(this.homey.settings.get(SETTING_KEY_ID) || '').trim();

    this._aqaraKeyId = keyId;

    if (!clientId || !clientSecret || !keyId) {
      this.log('Aqara developer credentials are not configured. Open the Aqara Cameras app settings.');
      return false;
    }

    const client = this.constructor.OAUTH2_CLIENT;
    client.CLIENT_ID = clientId;
    client.CLIENT_SECRET = clientSecret;

    // OAuth2App will consume these values when it creates the OAuth2 config.
    this.log('Aqara OAuth2 configuration loaded from Homey app settings.');
    return true;
  }

  async configureOAuthFromAppSettings() {
    const configured = this.configureOAuthFromSettings();
    if (!configured) {
      throw new Error('Configure Aqara Client ID, Client Secret and Key ID in the app settings first.');
    }

    if (this.hasConfig({ configId: 'default' })) {
      return {
        configured: true,
        restartRequired: true,
        message: 'Aqara configuration already exists. Restart the Aqara Cameras app to apply changed credentials.',
      };
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

    return {
      configured: true,
      restartRequired: false,
      message: 'Aqara OAuth2 configuration saved.',
    };
  }

  getAqaraKeyId() {
    return this._aqaraKeyId || String(this.homey.settings.get(SETTING_KEY_ID) || '').trim();
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
