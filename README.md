# Aqara Cameras for Homey

Homey Pro / Homey SDK v3 integration for Aqara IP cameras with native RTSP support and Aqara Cloud OAuth2 account discovery.

## Aqara login

The app uses Aqara's official OAuth2 account authorization. You do **not** enter an Aqara username, password, access token or camera Subject ID into Homey. Homey opens the Aqara login page and the user authorizes access to the Aqara account. Aqara then returns an OAuth2 authorization code which Homey exchanges for an access token and refresh token. Aqara documents this OAuth2 flow and explicitly states that it allows third-party applications to access the user's devices without receiving the user's Aqara password. citeturn10search0

The app then calls Aqara's `query.device.info` API and filters the account's devices to supported camera models. Aqara documents that this API can return all devices under the authorized user and includes the device ID, model and device name. citeturn9search0

## One-time developer configuration

For a self-hosted/development build, Aqara still requires the application's developer credentials. These are **not the user's Aqara login credentials**.

Create an application in the Aqara Developer Platform and obtain:

- AppID
- AppKey
- Key ID

The OAuth client uses AppID/AppKey for OAuth2. The Aqara Open API request signature additionally requires the Key ID and AppKey. Aqara documents these request headers and signature rules. citeturn4search0turn4search2

Create a local `env.json` from `env.json.example`:

```json
{
  "CLIENT_ID": "YOUR_AQARA_APP_ID",
  "CLIENT_SECRET": "YOUR_AQARA_APP_KEY",
  "AQARA_KEY_ID": "YOUR_AQARA_KEY_ID"
}
```

`env.json` is gitignored and must never be committed. After this one-time configuration, normal source updates only require `git pull`.

Register this OAuth redirect URI in the Aqara application:

```text
https://callback.athom.com/oauth2/callback
```

Homey's official OAuth2 helper uses this callback and the `login_oauth2` pairing template. citeturn6search0turn12search0

## Multiple cameras

Yes. **Multiple Aqara cameras are supported.**

Pairing works like this:

```text
Homey
  ↓
Log in with Aqara
  ↓
Aqara account authorization
  ↓
query.device.info
  ↓
┌──────────────────────────────┐
│ Aqara Camera - Living Room   │
│ Aqara Camera - Garden        │
│ Aqara G2H Pro - Bedroom      │
│ Aqara G3 - Office            │
└──────────────────────────────┘
  ↓
Select one or more cameras
  ↓
Each camera becomes a separate Homey device
```

The OAuth session is shared, so you authorize the Aqara account once. Each Homey camera stores its own Aqara device ID and can have its own local RTSP URL.

Aqara currently documents the following camera models, including G2H, G2H Pro and G3 variants. citeturn11search0

## Local RTSP

RTSP remains a per-camera setting because the local RTSP endpoint comes from the camera/RTSP firmware rather than Aqara OAuth.

For example:

```text
rtsp://user:password@192.168.1.50:8554/ch1
```

The app uses Homey's native `createVideoRTSP()` path rather than transcoding RTSP to HLS.

## Architecture

```text
Aqara account
     │
     │ OAuth2
     ▼
Homey OAuth2 session
     │
     ├── query.device.info ──► camera discovery
     │
     └── access/refresh token

Each Homey camera
     │
     ├── Aqara device ID
     ├── Aqara model
     └── local RTSP URL
             │
             ▼
       Homey createVideoRTSP()
             │
             ▼
        Homey camera UI
```

## Supported camera models

The current discovery filter includes Aqara's documented camera models, including:

- G2H / G2H Pro
- G3
- E1
- G100
- G5 / G5 Pro
- Doorbell G4 / G410
- other camera models listed by Aqara's camera SDK

The exact features available through the Aqara Open API remain model/resource dependent. Aqara notes that camera functionality must be determined by product/model support. citeturn11search0

## Requirements

- Homey SDK v3
- Node.js 18+ for development; current Homey versions use newer Node runtimes
- Aqara camera with a working RTSP endpoint for local live video
- Aqara Developer Platform application for OAuth2 credentials

## Security

The Aqara user password is never stored by this app. OAuth access and refresh tokens are managed by Homey's OAuth2 session system. The local `env.json` contains developer credentials and is excluded from Git.

RTSP credentials, when present in the RTSP URL, are stored in the Homey device settings. Do not commit real RTSP URLs containing passwords.

## License

MIT
