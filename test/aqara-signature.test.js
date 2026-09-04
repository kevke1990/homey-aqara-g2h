'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSignature, normalizeKeyIdForSignature } = require('../lib/aqara/signature');

// Aqara's published example uses the Key ID without the K./k. transport
// prefix in the signing input and publishes this MD5 result.
test('Aqara signature matches documented example without key id prefix', () => {
  const sign = createSignature({
    accessToken: '532cad73c5493193d63d367016b98b27',
    appId: '4e693d54d75db580a56d1263',
    keyId: 'k.78784564654feda454557',
    nonce: 'C6wuzd0Qguxzelhb',
    time: '1618914078668',
    appKey: 'gU7Qtxi4dWnYAdmudyxni52bWZ58b8uN',
  });

  assert.equal(sign, 'bfd8dd0e7c108353e6740d81e05982d8');
});

test('Aqara signature treats K. and k. prefixes identically', () => {
  assert.equal(
    normalizeKeyIdForSignature('K.1545482852554272768'),
    '1545482852554272768',
  );
  assert.equal(
    normalizeKeyIdForSignature('k.1545482852554272768'),
    '1545482852554272768',
  );

  const common = {
    accessToken: 'token',
    appId: 'app',
    nonce: 'nonce',
    time: '1',
    appKey: 'secret',
  };
  assert.equal(
    createSignature({ ...common, keyId: 'K.12345' }),
    createSignature({ ...common, keyId: '12345' }),
  );
});

test('Aqara signature omits access token when absent', () => {
  const sign = createSignature({
    appId: 'app',
    keyId: 'key',
    nonce: 'nonce',
    time: '1',
    appKey: 'secret',
  });
  assert.equal(sign.length, 32);
  assert.match(sign, /^[0-9a-f]{32}$/);
});
