# Aqara Cameras for Homey

Homey Pro / Homey SDK v3 integration for Aqara IP cameras with Aqara Cloud OAuth2 account discovery and local RTSP streaming.

## Current architecture

```text
Aqara account
     │ OAuth2
     ▼
Homey OAuth2 session
     │
     ├── device discovery ─────► multiple Aqara camera devices
     │                              │
     │                              ├── Aqara DID
     │                              ├── model profile
     │                              └── local RTSP URL
     │
     └── cloud camera controls

Local RTSP
     │
     ▼
Homey native camera video

Optional companion recorder
     │
     ▼
MediaMTX on NAS / Proxmox
     ├── per-camera recording
     ├── playback
     ├── retention
     └── optional rclone → Google Drive
```

## Aqara developer configuration

The Aqara developer credentials are configured **inside the Homey app**. They are not committed to GitHub and are no longer required in `env.json` for a normal Homey installation.

Open:

```text
Homey → Apps → Aqara Cameras → Configure App
```

Enter:

- **Aqara Client ID** — the App ID from the Aqara Developer Platform
- **Aqara Client Secret** — the App Key from the Aqara Developer Platform
- **Aqara Key ID** — the Key ID used by the Aqara API signing algorithm

The app stores these values in Homey's persistent app settings. The OAuth access/refresh token is managed by `homey-oauth2app` and is stored as an OAuth2 session, separate from the developer credentials.

The Aqara user password is never stored by this app.

For local development, `env.json` may still be used by a developer as a private bootstrap mechanism if needed, but the production application configuration is Homey app settings. `env.json` remains gitignored.

Register the OAuth callback required by the Aqara application:

```text
https://callback.athom.com/oauth2/callback
```

### First-time configuration

1. Install/start the Aqara Cameras app.
2. Open **Configure App**.
3. Enter Client ID, Client Secret and Key ID.
4. Press **Opslaan en configureren**.
5. Add an Aqara camera and choose **Log in with Aqara**.
6. Authorize the app with the Aqara account.

If credentials are changed after an OAuth2 configuration already exists, restart the Aqara Cameras app once so the new credentials are loaded into the OAuth2 configuration.

A missing configuration must never crash the application. The app starts without credentials and reports that Aqara needs to be configured.

## Multiple cameras

**Multiple cameras are a core requirement.** The pairing list does not use `singular: true`. Each selected Aqara camera is represented by its own Homey device and uses its Aqara DID as the stable device identity.

Example:

```text
Aqara account
  ├── G2H Pro — Living Room
  ├── G2H Pro — Bedroom
  ├── G3 — Office
  └── G2H — Garden
```

Each device can have its own RTSP endpoint and its own recording/storage policy in the future. A failure in one camera must not affect the others.

Homey's `list_devices` system view intentionally supports selecting multiple devices when `singular` is omitted.

## Local RTSP

RTSP is a per-camera setting because local RTSP is provided by the camera/firmware or an RTSP/ONVIF modification, not by Aqara OAuth.

Example:

```text
rtsp://user:password@192.168.1.50:8554/ch1
```

The Homey camera uses the native `createVideoRTSP()` path. No video transcoding is performed inside Homey.

## Recording to NAS / Google Drive

The Homey app is intentionally **not** a 24/7 NVR. Continuous video recording is better handled by a NAS/Proxmox/Docker host.

The repository now contains a `recorder/` companion-service design using MediaMTX:

```text
Aqara RTSP cameras
       │
       ▼
MediaMTX
       │
       ├── NAS/local recordings
       │
       └── optional rclone → Google Drive
```

MediaMTX supports multiple RTSP sources, fragmented MP4 recording, configurable retention and a playback HTTP API. The recorder configuration is per camera, so multiple cameras remain independent.

See [`recorder/README.md`](recorder/README.md).

## Development status

See [`docs/ROADMAP.md`](docs/ROADMAP.md) and the dated status report in `docs/STATUS-2026-08-30.md`.

## Requirements

- Homey SDK v3
- Node.js 18+ for development
- Homey Pro with local app support
- Aqara camera with a working local RTSP endpoint for local video
- Aqara Developer Platform application for OAuth2 developer credentials

## Security

- Aqara user passwords are never stored by this app.
- Developer credentials are stored in Homey app settings and are never committed to GitHub.
- `env.json` is gitignored and is development-only.
- RTSP URLs may contain credentials; never commit real RTSP URLs with passwords.
- Logging must not contain OAuth tokens, AppKeys, Key IDs or RTSP passwords.

## Testing

Run the unit tests with:

```bash
npm install
npm test
```

Validate the Homey manifest with:

```bash
homey app validate
```

Run the app on a Homey Pro with:

```bash
homey app run
```

The GitHub Actions test workflow runs the same unit tests on every push and pull request.

## License

MIT
