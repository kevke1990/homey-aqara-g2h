'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AqaraAccountAuthClient = require('../lib/aqara/account-auth-client');

function makeClient() {
  const values = new Map([
    ['aqara_app_id', 'app-id'],
    ['aqara_app_key', 'app-key'],
    ['aqara_key_id', 'key-id'],
  ]);
  const settings = {
    get: key => values.get(key),
    set: async (key, value) => values.set(key, value),
    unset: async key => values.delete(key),
  };
  const app = { homey: { settings }, log: () => {} };
  return { client: new AqaraAccountAuthClient({ app }), values };
}

test('Aqara account authorization stores token metadata', async () => {
  const { client, values } = makeClient();
  await client.saveToken({
    account: 'user@example.com',
    result: {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: '86400',
      openId: 'open-id',
    },
  });

  assert.equal(values.get('aqara_access_token'), 'access');
  assert.equal(values.get('aqara_refresh_token'), 'refresh');
  assert.equal(values.get('aqara_account'), 'user@example.com');
  assert.equal(values.get('aqara_open_id'), 'open-id');
  assert.ok(values.get('aqara_token_expires_at') > Date.now());
});

test('Aqara account authorization rejects incomplete token responses', async () => {
  const { client } = makeClient();
  await assert.rejects(
    () => client.saveToken({ result: { accessToken: 'access' } }),
    /incomplete authorization token response/i,
  );
});

test('Aqara account discovery sends the documented query.device.info payload', async () => {
  const { client, values } = makeClient();
  await client.saveToken({
    account: 'user@example.com',
    result: { accessToken: 'access', refreshToken: 'refresh', expiresIn: '86400' },
  });

  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      async json() {
        return { code: 0, result: { data: [{ did: 'camera-1', model: 'lumi.camera.acn003' }], totalCount: 1 } };
      },
    };
  };

  try {
    const devices = await client.getAllDevices();
    assert.equal(devices.length, 1);
    assert.equal(devices[0].did, 'camera-1');
    assert.equal(request.url, 'https://open-ger.aqara.com/v3.0/open/api');
    const body = JSON.parse(request.options.body);
    assert.equal(body.intent, 'query.device.info');
    assert.deepEqual(body.data, { dids: [], positionId: '', pageNum: 1, pageSize: 50 });
    assert.equal(request.options.headers.Appid, values.get('aqara_app_id'));
    assert.equal(request.options.headers.Keyid, values.get('aqara_key_id'));
    assert.equal(typeof request.options.headers.Sign, 'string');
    assert.ok(request.options.headers.Sign.length > 0);
  } finally {
    global.fetch = originalFetch;
  }
});
