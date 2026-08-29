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

## Aqara login

The app uses Aqara's official OAuth2 account authorization. The user's Aqara password, access token and camera Subject ID are not entered into device settings. Homey opens the Aqara authorization page and receives OAuth2 tokens through the configured Aqara developer application.

A one-time developer setup is still required for a development/self-hosted build:

- AppID
- AppKey
- Key ID

Create `env.json` from `env.json.example`. It is gitignored and must never be committed.

Register the OAuth callback required by the Aqara application:

```text
https://callback.athom.com/oauth2/callback
```

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
- Aqara camera with a working local RTSP endpoint for local video
- Aqara Developer Platform application for OAuth2 developer credentials

## Security

- Aqara user passwords are never stored by this app.
- `env.json` is gitignored.
- RTSP URLs may contain credentials; never commit real RTSP URLs with passwords.
- Logging must not contain OAuth tokens, AppKeys, Key IDs or RTSP passwords.

## Testing

Run the unit tests with:

```bash
npm install
npm test
```

The GitHub Actions test workflow runs the same unit tests on every push and pull request.

## License

MIT
