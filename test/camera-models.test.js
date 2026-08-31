'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CAMERA_MODELS, isSupportedCamera, getCameraModel } = require('../lib/aqara/camera-models');

test('official G2H model is discoverable', () => {
  assert.equal(isSupportedCamera('lumi.camera.gwag03'), true);
  assert.equal(getCameraModel('lumi.camera.gwag03').family, 'G2H');
});

test('official G2H Pro models are discoverable', () => {
  assert.equal(getCameraModel('lumi.camera.acn003').family, 'G2H Pro');
  assert.equal(getCameraModel('lumi.camera.agl001').family, 'G2H Pro');
});

test('official G3 models are discoverable', () => {
  assert.equal(getCameraModel('lumi.camera.gwpagl01').family, 'G3');
  assert.equal(getCameraModel('lumi.camera.gwpgl1').family, 'G3');
});

test('all registered models use camera model identifiers', () => {
  for (const model of Object.keys(CAMERA_MODELS)) {
    assert.match(model, /^(lumi\.camera\.|aqara\.camera\.)/);
    assert.equal(isSupportedCamera(model), true);
  }
});

test('unknown device is not treated as a camera', () => {
  assert.equal(isSupportedCamera('lumi.sensor_ht.agl01'), false);
  assert.equal(getCameraModel('unknown'), null);
});
