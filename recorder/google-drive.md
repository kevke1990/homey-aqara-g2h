# Google Drive backup design

Google Drive is planned as an optional off-site copy target for the recorder, not as the live recording destination.

## Recommended policy

```text
Continuous recordings → NAS only
Motion/person/sound clips → NAS + optional Google Drive
Important clips → NAS + Google Drive
```

This keeps local recording fast and avoids unnecessary cloud bandwidth.

## Recommended implementation

Use rclone on the recorder host:

```text
MediaMTX segment complete
        ↓
recording metadata / event filter
        ↓
local NAS recording
        ↓
rclone upload queue
        ↓
Google Drive
```

Do not put Google OAuth credentials in the Homey app's Aqara OAuth session. Google Drive authorization is a separate concern and should live on the recorder host or a dedicated storage service.

Google's Drive API recommends resumable uploads for large files or unreliable connections. rclone can be used by the companion recorder to handle retries and remote storage.

## Folder layout

```text
Aqara Cameras/
  Woonkamer/
    2026/
      08/
        30/
  Slaapkamer/
    2026/
      08/
        30/
```

The Aqara DID should remain the machine identity even if the display name changes.

## Retention

Example policy:

- NAS continuous: 7 days
- NAS events: 30 days
- Google Drive events: 180 days

These values are examples, not hard-coded defaults yet.
