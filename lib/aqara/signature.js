'use strict';

const crypto = require('crypto');

/**
 * Aqara Open API request signature.
 *
 * Aqara's Keyid is presented with a `K.`/`k.` prefix in the HTTP header,
 * but Aqara's published signing example calculates the signature using the
 * key id without that transport prefix. Keep the original Key ID for the
 * HTTP header and normalize only the signing value here.
 *
 * Signing order:
 *   Accesstoken (when present), Appid, Keyid, Nonce, Time, AppKey
 * Then lower-case the complete string and calculate MD5-32.
 */
function normalizeKeyIdForSignature(keyId) {
  return String(keyId || '').trim().replace(/^k\./i, '');
}

function createSignature({ accessToken = '', appId, keyId, nonce, time, appKey }) {
  if (!appId || !keyId || !nonce || !time || !appKey) {
    throw new Error('Aqara signature requires appId, keyId, nonce, time and appKey');
  }

  const normalizedKeyId = normalizeKeyIdForSignature(keyId);
  if (!normalizedKeyId) {
    throw new Error('Aqara signature requires a valid keyId');
  }

  const prefix = accessToken
    ? `Accesstoken=${accessToken}&`
    : '';

  const source = `${prefix}Appid=${String(appId).trim()}&Keyid=${normalizedKeyId}&Nonce=${String(nonce).trim()}&Time=${String(time).trim()}${String(appKey).trim()}`;
  return crypto.createHash('md5').update(source.toLowerCase(), 'utf8').digest('hex');
}

module.exports = { createSignature, normalizeKeyIdForSignature };
