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
    const client = this.constructor.OAUTH2_CLIENT;
    const configured = this.configureOAuthFromSettings();
    const originalApiUrl = client.API_URL;

    // OAuth2App automatically creates its default configuration when API_URL
    // and TOKEN_URL are present. Hide API_URL only when the user has not yet
    // configured the app, so missing credentials can never crash startup.
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
      this.log('Aqara developer credentials are not configured. Configure the Aqara Cameras app first.');
      return false;
    }

    const client = this.constructor.OAUTH2_CLIENT;
    client.CLIENT_ID = clientId;
    client.CLIENT_SECRET = clientSecret;

    this.log('Aqara OAuth2 credentials loaded from Homey app settings.');
    return true;
  }

  async configureOAuthFromAppSettings() {
    if (!this.configureOAuthFromSettings()) {
      throw new Error('Configure Aqara Client ID, Client Secret and Key ID first.');
    }

    if (this.hasConfig({ configId: 'default' })) {
      return {
        configured: true,
        restartRequired: true,
        message: 'Aqara settings saved. Restart the Aqara Cameras app to apply changed developer credentials.',
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
      message: 'Aqara OAuth2 configuration is ready. You can now add a camera.',
    };
  }

  getAqaraKeyId() {
    return this._aqaraKeyId || String(this.homey.settings.get(SETTING_KEY_ID) || '').trim();
  }

  isAqaraConfigured() {
    return Boolean(
      String(this.homey.settings.get(SETTING_CLIENT_ID) || '').trim()
      && String(this.homey.settings.get(SETTING_CLIENT_SECRET) || '').trim()
      && String(this.homey.settings.get(SETTING_KEY_ID) || '').trim(),
    );
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
