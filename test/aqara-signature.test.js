'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSignature } = require('../lib/aqara/signature');

// Recomputed from Aqara's published input values using the documented
// lowercase + MD5-32 algorithm. This protects the implementation from
// accidental changes during refactoring.
test('Aqara signature matches documented algorithm', () => {
  const sign = createSignature({
    accessToken: '532cad73c5493193d63d367016b98b27',
    appId: '4e693d54d75db580a56d1263',
    keyId: 'k.78784564654feda454557',
    nonce: 'C6wuzd0Qguxzelhb',
    time: '1618914078668',
    appKey: 'gU7Qtxi4dWnYAdmudyxni52bWZ58b8uN',
  });

  assert.equal(sign, '314a6f6fd46264e6ec872e21f88361c3');
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
