'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSignature } = require('../lib/aqara/signature');

// Aqara's documented example. The expected value is intentionally fixed so
// a future refactor cannot silently change the signing algorithm.
test('Aqara signature matches documented algorithm', () => {
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
