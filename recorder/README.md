# Aqara Camera Recorder (companion service)

The Homey app deliberately does **not** act as a 24/7 video recorder. Homey orchestrates cameras, events and commands; a NAS/Proxmox/Docker host should handle continuous RTSP ingestion and storage.

This directory documents the companion recorder architecture using MediaMTX. MediaMTX can pull one or more RTSP camera sources, record them as fragmented MP4, expose playback endpoints, and invoke rclone for remote copies.

## Why MediaMTX

- native RTSP ingest, without transcoding when codecs are compatible;
- per-camera paths, so one camera failing does not stop the others;
- fragmented MP4 recording with configurable segment/retention settings;
- HTTP playback API for time-range playback;
- rclone hooks for NAS/cloud workflows.

## Recommended topology

```text
Aqara cameras
   │ RTSP
   ▼
MediaMTX on NAS / Proxmox
   │
   ├── recordings/<camera>/...
   │
   └── optional rclone → Google Drive

Homey
   │
   ├── Aqara OAuth2 / device control
   ├── Homey Flow events
   └── recorder API integration (next phase)
```

## Multi-camera rule

Every camera gets a unique MediaMTX path. Never use one shared recording path for all cameras.

Example:

```text
woonkamer
slaapkamer
buiten
```

The Homey device's Aqara DID remains the stable identity; a friendly camera name can be used for the recorder path.

## NAS

Mount the NAS share on the recorder host, for example:

```text
/mnt/nas/aqara-recordings
```

Then point MediaMTX's `recordPath` at that location.

## Google Drive

Google Drive should be an optional secondary target, not the primary recorder. rclone can upload completed segments and retry interrupted transfers. For large files, Google's Drive API itself recommends resumable uploads; rclone handles the transport details for this companion-service design.

## Event recordings

Continuous recording and event clips are intentionally separate concepts:

- continuous: retained for a short local period;
- motion/person/sound: retained longer;
- important events: optionally copied off-site.

Pre-event/post-event buffering will be implemented in the recorder integration layer rather than in the Homey process.

## Security

Never commit RTSP URLs containing real passwords. Use an environment file or secret store on the recorder host. Do not expose MediaMTX's management/playback APIs directly to the internet without authentication and TLS.
