# Development roadmap

Status: 2026-08-30

## Phase 1 — foundation

- [x] Aqara OAuth2 account discovery
- [x] Shared OAuth2 session for multiple cameras
- [x] Unique Homey device identity based on Aqara DID
- [x] Central camera model registry
- [x] Aqara signature implementation isolated and unit-tested
- [x] Exponential retry/backoff for transient API failures
- [x] Secret-safe logging utility
- [x] Safer device pagination
- [x] Flow action listeners registered once at driver level
- [x] Camera lifecycle cleanup for video/health timers
- [x] Unit-test workflow
- [ ] Region selection in the OAuth UI (Aqara uses region-specific OAuth/API domains; this needs an explicit product decision before implementation)
- [ ] Live Aqara API integration test with non-public credentials

## Phase 2 — camera integration

- [x] Native local RTSP integration path
- [x] Snapshot implementation
- [x] Custom camera view stream hook
- [x] Privacy, IR/light and microphone control hooks
- [ ] Validate resource IDs against each supported camera model
- [ ] PTZ service for models that expose PTZ resources
- [ ] Model-aware capability enable/disable
- [ ] Aqara push/event bridge for motion/person/sound
- [ ] Two-way audio transport after Aqara camera call/WebRTC resources are validated

## Phase 3 — recording

- [x] Companion recorder architecture documented
- [x] MediaMTX multi-camera example
- [x] NAS/local recording topology
- [ ] Homey ↔ recorder API integration
- [ ] Continuous recording policy
- [ ] Motion/person/sound event recording
- [ ] Pre-event/post-event buffering
- [ ] Recording browser/timeline
- [ ] Export/download API

## Phase 4 — storage

- [x] NAS as primary-storage architecture
- [ ] SMB/NFS configuration helper
- [ ] Per-camera retention and storage limits
- [ ] Automatic cleanup/quotas
- [ ] Recording metadata index

## Phase 5 — cloud backup

- [x] Google Drive feasibility confirmed
- [x] rclone/Drive architecture documented
- [ ] Google Drive OAuth configuration
- [ ] Resumable upload queue
- [ ] Retry/backoff and upload state
- [ ] Events-only cloud backup option
- [ ] Per-camera Drive folders

## Phase 6 — professional UI

- [ ] Camera health dashboard
- [ ] Recording timeline
- [ ] Multi-camera selector
- [ ] Storage status
- [ ] Recorder connection status
- [ ] PTZ controls
- [ ] Two-way audio UI

## Non-negotiable design rules

1. Every camera is independent and keyed by Aqara DID.
2. One broken camera must never stop another camera.
3. Homey is the orchestrator, not the 24/7 NVR.
4. Aqara credentials and RTSP passwords never enter Git.
5. Unsupported Aqara resources must be reported as unsupported, never simulated.
6. Generated `app.json` must remain derived from Compose sources.
7. CI must test before a change is considered complete.
