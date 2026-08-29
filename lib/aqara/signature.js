'use strict';

const crypto = require('crypto');

/**
 * Aqara Open API request signature.
 * The official order is Accesstoken, Appid, Keyid, Nonce, Time,
 * followed by the AppKey, then lower-case and MD5-32.
 */
function createSignature({ accessToken = '', appId, keyId, nonce, time, appKey }) {
  if (!appId || !keyId || !nonce || !time || !appKey) {
    throw new Error('Aqara signature requires appId, keyId, nonce, time and appKey');
  }

  const prefix = accessToken
    ? `Accesstoken=${accessToken}&`
    : '';

  const source = `${prefix}Appid=${appId}&Keyid=${keyId}&Nonce=${nonce}&Time=${time}${appKey}`;
  return crypto.createHash('md5').update(source.toLowerCase(), 'utf8').digest('hex');
}

module.exports = { createSignature };
