'use strict';

/**
 * Model registry. Aqara exposes model IDs, while the actual resource support
 * is firmware/model dependent. Keep discovery separate from feature claims.
 */
const CAMERA_MODELS = Object.freeze({
  'lumi.camera.acn003': { family: 'G2H', features: { rtsp: true, snapshot: true } },
  'lumi.camera.agl001': { family: 'G2H', features: { rtsp: true, snapshot: true } },
  'lumi.camera.gwag03': { family: 'G2H Pro', features: { rtsp: true, snapshot: true } },
  'lumi.camera.gwagl02': { family: 'G3', features: { rtsp: true, snapshot: true, ptz: true } },
  'lumi.camera.gwpgl1': { family: 'E1', features: { rtsp: true, snapshot: true, ptz: true } },
  'lumi.camera.gwpagl01': { family: 'G100', features: { rtsp: true, snapshot: true, ptz: true } },
  'lumi.camera.acn007': { family: 'G5', features: { snapshot: true } },
  'lumi.camera.acn006': { family: 'G5 Pro', features: { snapshot: true } },
  'lumi.camera.acn016': { family: 'G4', features: { snapshot: true } },
  'lumi.camera.agl005': { family: 'G410', features: { snapshot: true } },
  'lumi.camera.acn009': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.acn010': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.agl004': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.agl003': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.agl002': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.acn005': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.agl006': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.acn017': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.agl010': { family: 'Camera', features: { snapshot: true } },
  'lumi.camera.agl013': { family: 'Camera', features: { snapshot: true } },
  'aqara.camera.acn002': { family: 'Camera', features: { snapshot: true } },
});

function getCameraModel(model) {
  return CAMERA_MODELS[model] || null;
}

function isSupportedCamera(model) {
  return Boolean(getCameraModel(model));
}

module.exports = { CAMERA_MODELS, getCameraModel, isSupportedCamera };
