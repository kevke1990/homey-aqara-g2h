'use strict';

module.exports = {
  async configure({ homey }) {
    return homey.app.configureOAuthFromAppSettings();
  },

  async authCode({ homey, body }) {
    return { authCodeRequested: true, account: body?.account ? await homey.app.requestAqaraAuthCode({ account: body.account }) : null };
  },

  async verifyAuthCode({ homey, body }) {
    return homey.app.verifyAqaraAuthCode({ account: body?.account, authCode: body?.authCode });
  },

  async status({ homey }) {
    return homey.app.getAqaraConnectionStatus();
  },

  async disconnect({ homey }) {
    return homey.app.disconnectAqaraAccount();
  },
};
