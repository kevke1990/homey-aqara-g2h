# Fase 1 — Aqara authorization and multi-camera discovery

## Belangrijk: geen OAuth Client Secret voor Fase 1A

Fase 1A gebruikt **Aqara Account Authorization**, niet OAuth 2.0. Voor deze route is een OAuth Client Secret niet nodig.

De Aqara Open API vereist voor signed API requests wél:

- **App ID** — het App ID van het Aqara Developer-project.
- **Key ID** — de ID van de API-key die bij het project hoort.
- **App Key** — de geheime waarde die bij de Key ID hoort en voor request signing wordt gebruikt.

De **App Key is dus niet hetzelfde als een OAuth Client Secret**. De Homey-app vraagt voor Fase 1A geen OAuth Client Secret.

## Waar vind je deze gegevens?

1. Log in op het Aqara Developer Platform.
2. Ga naar **Console → Project Management**.
3. Open je goedgekeurde project via **Details**.
4. Het **App ID** staat bij de projectgegevens.
5. Open **Key Management**.
6. Daar staat de automatisch aangemaakte Key ID en de bijbehorende App Key. Aqara vermeldt dat na goedkeuring standaard een key wordt aangemaakt en dat je via Key Management extra keys kunt toevoegen.

De exacte namen kunnen per taal van de Aqara-console iets verschillen.

## 1A — Aqara account authorization

The primary authorization path is Aqara's documented account-authorization API. This path does not depend on an OAuth redirect URI or OAuth Client Secret.

1. Homey stores App ID, App Key and Key ID in app settings.
2. The user enters their Aqara email address or phone number.
3. The app calls `config.auth.getAuthCode` with `accountType: 0` and requests a 30-day access-token lifetime.
4. Aqara sends the verification code by SMS/email.
5. The user enters the verification code.
6. The app calls `config.auth.getToken`.
7. Access token, refresh token, expiry and openId are stored in Homey settings.
8. Before expiry, the app calls `config.auth.refreshToken` automatically.

Aqara documents the verification code as valid for 10 minutes and the account authorization access-token lifetime as configurable up to 30 days. The refresh token remains valid beyond the access-token expiry according to Aqara's authorization documentation.

## 1B — OAuth 2.0

OAuth2 remains available as an optional path through `homey-oauth2app`.

Unlike Fase 1A, Aqara OAuth2 requires `client_id`, `client_secret` and a registered `redirect_uri`. Because Aqara changed its redirect URI policy in June 2026, OAuth2 is deliberately not required for the normal Homey setup.

## 1C — Device discovery and multi-camera pairing

After authorization, the camera driver queries `query.device.info` with paginated requests. The driver:

- retrieves every page with a hard safety limit;
- filters to known Aqara camera model IDs;
- de-duplicates by Aqara DID;
- sorts devices by display name;
- uses the Aqara DID as the stable Homey device ID;
- stores model and device metadata in the Homey device store;
- allows multiple cameras to be selected in one pairing session;
- isolates failures so one bad camera does not invalidate the complete discovery result.

## Validation checklist

- [x] OAuth Client Secret removed from the primary Homey settings UI.
- [x] Aqara App ID is used for signed API calls.
- [x] Aqara App Key is used for API request signing.
- [x] Key ID is used as the signing key identifier.
- [x] Missing developer credentials do not crash app startup.
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
