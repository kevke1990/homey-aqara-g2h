'use strict';

module.exports = {
  async configure({ homey }) {
    return homey.app.configureOAuthFromAppSettings();
  },
};
