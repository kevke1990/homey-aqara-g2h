# Fase 1 — Aqara authorization and multi-camera discovery

## 1A — Aqara account authorization

The primary authorization path is Aqara's documented account-authorization API. This path does not depend on an OAuth redirect URI.

1. Homey stores the Aqara Developer App ID/AppKey/Key ID in app settings.
2. The user enters their Aqara email address or phone number.
3. The app calls `config.auth.getAuthCode` with `accountType: 0` and requests a 30-day access-token lifetime.
4. Aqara sends the verification code by SMS/email. The app never asks for or stores the Aqara password.
5. The user enters the verification code.
6. The app calls `config.auth.getToken`.
7. Access token, refresh token, expiry and openId are stored in Homey settings.
8. Before expiry, the app calls `config.auth.refreshToken` automatically.

Aqara documents the verification code as valid for 10 minutes and the account authorization access-token lifetime as 1–30 days, with refresh-token lifetime extending 30 days beyond the access-token expiry.

## 1B — OAuth 2.0

OAuth2 remains available through `homey-oauth2app` and the standard Homey `login_oauth2` pairing template.

Aqara's current OAuth2 flow requires a registered `redirect_uri`. The Homey OAuth2 library uses `https://callback.athom.com/oauth2/callback` by default. Aqara's June 2026 platform notice says custom redirect URI configuration is no longer freely available and may require technical-support approval. Therefore account authorization is the reliable primary path, while OAuth2 is retained as an optional path.

The OAuth2 implementation uses Aqara's standard authorization-code and refresh-token endpoints and does not log tokens or developer secrets.

## 1C — Device discovery and multi-camera pairing

After either authorization path is active, the camera driver queries `query.device.info` with:

```json
{
  "dids": [],
  "positionId": "",
  "pageNum": 1,
  "pageSize": 50
}
```

The API is paginated and returns `did`, `parentDid`, `positionId`, `model`, `modelType`, `state`, `firmwareVersion`, `deviceName` and `timeZone`.

The driver:

- retrieves every page with a hard safety limit;
- filters to known Aqara camera model IDs;
- de-duplicates by Aqara DID;
- sorts devices by display name;
- uses the Aqara DID as the stable Homey device ID;
- stores the model and device metadata in the Homey device store;
- allows multiple camera devices to be selected in one pairing session;
- isolates failures so one bad camera does not invalidate the complete discovery result.

## Validation checklist

- [x] Missing developer credentials do not crash app startup.
- [x] Developer credentials are entered through Homey settings.
- [x] Account authorization uses Aqara's official API authorization intents.
- [x] Verification code is not exposed by the Homey settings API response.
- [x] Access/refresh token lifecycle is implemented.
- [x] Refresh is serialized to prevent concurrent refresh storms.
- [x] Network retries use exponential backoff.
- [x] OAuth2 remains available as an optional authorization path.
- [x] Device discovery is paginated.
- [x] Camera discovery supports multiple devices.
- [x] Camera identity is based on Aqara DID.
- [x] Unit tests cover token storage, validation and discovery payload construction.
- [ ] Live Aqara account authorization test on a physical Homey.
- [ ] Live multi-camera pairing test on a physical Homey.
- [ ] Live OAuth2 test after Aqara confirms/approves the Homey redirect URI for the developer project.
