'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isSupportedCamera, getCameraModel } = require('../lib/aqara/camera-models');


test('known Aqara camera model is discoverable', () => {
  assert.equal(isSupportedCamera('lumi.camera.gwag03'), true);
  assert.equal(getCameraModel('lumi.camera.gwag03').family, 'G2H Pro');
});

test('unknown device is not treated as a camera', () => {
  assert.equal(isSupportedCamera('lumi.sensor_ht.agl01'), false);
  assert.equal(getCameraModel('unknown'), null);
});
