'use strict';

const { OAuth2App } = require('homey-oauth2app');
const AqaraOAuth2Client = require('./lib/aqara-oauth2-client');

class AqaraApp extends OAuth2App {
  static OAUTH2_CLIENT = AqaraOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = false;
  static OAUTH2_DRIVERS = ['camera'];

  async onOAuth2Init() {
    this.log('Aqara OAuth2 App initialized');
  }
}

module.exports = AqaraApp;
