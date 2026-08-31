'use strict';

/**
 * Official Aqara camera model registry.
 *
 * Aqara's current Camera SDK device list is used as the authoritative model
 * source. Feature flags are deliberately conservative: availability of a
 * specific camera function still needs to be confirmed from the device's
 * exposed resources before it is enabled in later phases.
 */
const CAMERA_MODELS = Object.freeze({
  'lumi.camera.acn007': { family: 'E1', features: { snapshot: true } },
  'lumi.camera.acn006': { family: 'E1', features: { snapshot: true } },
  'lumi.camera.acn016': { family: 'G100', features: { snapshot: true } },
  'lumi.camera.agl005': { family: 'G100', features: { snapshot: true } },
  'lumi.camera.gwag03': { family: 'G2H', features: { snapshot: true } },
  'lumi.camera.gwagl02': { family: 'G2H', features: { snapshot: true } },
  'lumi.camera.acn003': { family: 'G2H Pro', features: { snapshot: true } },
  'lumi.camera.agl001': { family: 'G2H Pro', features: { snapshot: true } },
  'lumi.camera.gwpagl01': { family: 'G3', features: { snapshot: true } },
  'lumi.camera.gwpgl1': { family: 'G3', features: { snapshot: true } },
  'lumi.camera.acn009': { family: 'G5 Pro (PoE)', features: { snapshot: true } },
  'lumi.camera.acn010': { family: 'G5 Pro (PoE)', features: { snapshot: true } },
  'lumi.camera.agl003': { family: 'G5 Pro (Wi-Fi)', features: { snapshot: true } },
  'lumi.camera.agl004': { family: 'G5 Pro (Wi-Fi)', features: { snapshot: true } },
  'lumi.camera.acn005': { family: 'Doorbell G4', features: { snapshot: true } },
  'lumi.camera.agl002': { family: 'Doorbell G4', features: { snapshot: true } },
  'lumi.camera.acn017': { family: 'G410', features: { snapshot: true } },
  'lumi.camera.agl006': { family: 'G410', features: { snapshot: true } },
  'lumi.camera.agl010': { family: 'G350', features: { snapshot: true } },
  'lumi.camera.agl013': { family: 'G400', features: { snapshot: true } },
  'aqara.camera.acn002': { family: 'T1', features: { snapshot: true } },
});

function getCameraModel(model) {
  return CAMERA_MODELS[model] || null;
}

function isSupportedCamera(model) {
  return Boolean(getCameraModel(model));
}

module.exports = { CAMERA_MODELS, getCameraModel, isSupportedCamera };
