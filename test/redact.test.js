'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { redact, redactObject } = require('../lib/redact');

test('redacts RTSP credentials from strings', () => {
  const result = redact('rtsp://user:super-secret@192.168.1.10:8554/ch1');
  assert.equal(result, 'rtsp://user:***@192.168.1.10:8554/ch1');
});

test('redacts secret-like object fields', () => {
  const result = redactObject({ token: 'abc', nested: { password: 'def' }, name: 'camera' });
  assert.deepEqual(result, { token: '***', nested: { password: '***' }, name: 'camera' });
});
