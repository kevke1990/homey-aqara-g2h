'use strict';

const crypto = require('crypto');

/**
 * Aqara Open API request signature.
 *
 * Aqara's documented signing example includes the complete Keyid value,
 * including the K./k. prefix, in the signature input. Keep the Keyid exactly
 * as configured for both the HTTP header and signature calculation.
 *
 * Signing order:
 *   Accesstoken (when present), Appid, Keyid, Nonce, Time, AppKey
 * Then lower-case the complete string and calculate MD5-32.
 */
function createSignature({ accessToken = '', appId, keyId, nonce, time, appKey }) {
  if (!appId || !keyId || !nonce || !time || !appKey) {
    throw new Error('Aqara signature requires appId, keyId, nonce, time and appKey');
  }

  const prefix = accessToken
    ? `Accesstoken=${accessToken}&`
    : '';

  const source = `${prefix}Appid=${String(appId).trim()}&Keyid=${String(keyId).trim()}&Nonce=${String(nonce).trim()}&Time=${String(time).trim()}${String(appKey).trim()}`;
  return crypto.createHash('md5').update(source.toLowerCase(), 'utf8').digest('hex');
}

module.exports = { createSignature };
