'use strict';

function redact(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/(rtsp:\/\/[^:]+:)[^@]+@/gi, '$1***@')
    .replace(/(Bearer\s+)[^\s]+/gi, '$1***')
    .replace(/(Accesstoken[=:]\s*)[^&,\s]+/gi, '$1***')
    .replace(/(AppKey|ClientSecret|CLIENT_SECRET|AQARA_KEY_ID)[=:]\s*[^&,\s]+/gi, '$1=***');
}

function redactObject(object) {
  if (!object || typeof object !== 'object') return object;
  if (Array.isArray(object)) return object.map(redactObject);
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (/password|secret|token|appkey|keyid/i.test(key)) result[key] = '***';
    else if (typeof value === 'string') result[key] = redact(value);
    else if (value && typeof value === 'object') result[key] = redactObject(value);
    else result[key] = value;
  }
  return result;
}

module.exports = { redact, redactObject };
