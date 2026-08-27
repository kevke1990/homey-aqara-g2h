# Aqara G2H Camera for Homey Self-Hosted Server

Native Homey camera integration for an Aqara G2H that exposes an RTSP stream.

## Design

This app intentionally uses Homey's native RTSP Video API:

Aqara G2H
-> RTSP
-> Homey `createVideoRTSP()`
-> Homey Self-Hosted Server WebRTC proxy
-> Homey frontend

There is deliberately no:

- Nest Hub
- Google Home
- Home Assistant
- go2rtc
- Scrypted
- external RTSP server
- HLS server
- FFmpeg transcoding
- external cloud service

The goal is to keep the original camera audio intact and let Homey handle the frontend streaming path.

## Requirements

- Homey Self-Hosted Server 12.0+ (tested conceptually against current SDK; user target: SHS 13.4.1)
- Aqara G2H with a working RTSP endpoint
- Homey CLI on the development computer
- Node.js 18+ recommended

## Aqara G2H RTSP

The G2H does not expose RTSP as a normal official Aqara feature on all firmware versions. This app assumes that RTSP is already working on the camera.

A commonly used high-resolution path for modified G2H firmware is:

`rtsp://CAMERA-IP/ch0_0.h264`

A low-resolution path is commonly:

`rtsp://CAMERA-IP/ch0_1.h264`

Use the exact URL that already works in your environment.

## Install for development

Clone:

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/homey-aqara-g2h-camera.git
cd homey-aqara-g2h-camera
```

Install Homey CLI if necessary:

```bash
npm install --global --no-optional homey
```

Log in:

```bash
homey login
```

Select your Homey Self-Hosted Server:

```bash
homey select
```

Then run:

```bash
homey app run
```

Choose **Aqara G2H** in Homey when adding a new device.

Enter:

- Camera name
- RTSP URL

Example:

```text
rtsp://192.168.1.50/ch0_0.h264
```

## Why RTSP instead of HLS?

The previous architecture used:

RTSP -> FFmpeg -> HLS -> Homey

That can make video work while audio disappears, especially when the original camera audio is converted to AAC and then passed through Homey's WebRTC proxy.

Homey's current SDK has a native `createVideoRTSP()` API. The app therefore avoids unnecessary transcoding and gives Homey's native video stack the original RTSP stream.

Homey documents `createVideoRTSP()` and `registerVideoUrlListener()` for exactly this type of integration.

## Important

Keep `disableWebRTCProxy` at its default (`false`).

Homey's SDK documents that when the WebRTC proxy is enabled, supported frontends can use Homey's proxy. Disabling it forces direct playback and prevents playback on web platforms or outside the local network.

## Troubleshooting

### Video works but no audio

First test the exact RTSP URL with VLC or ffplay on the LAN.

Then inspect the Homey app log after opening the camera. The app logs whenever Homey requests the RTSP URL.

If VLC/ffplay has audio but Homey does not, the problem is in Homey's RTSP/WebRTC handling rather than the camera source.

### No video

Verify:

1. Camera IP is correct.
2. RTSP service is running.
3. Port 554 is reachable.
4. The RTSP path is correct.
5. The Homey SHS container can reach the camera on the LAN.

## Security

If the RTSP URL contains credentials, the credentials are stored in the Homey device settings. Do not commit your real RTSP URL containing a password to GitHub.

Prefer a dedicated local camera credential if the camera supports it.

## License

MIT
