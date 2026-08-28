'use strict';

const video = document.getElementById('video-player');
const status = document.getElementById('status');
const talkBtn = document.getElementById('talk-btn');

function setStatus(message) {
  if (status) status.textContent = message;
}

async function initStream() {
  setStatus('Connecting to Aqara stream…');
  try {
    const streamUrl = await Homey.emit('get_stream_url');
    if (!streamUrl) throw new Error('No stream URL returned');

    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setStatus('Live');
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data && data.fatal) setStatus('Stream error — check Aqara stream availability.');
      });
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setStatus('Live');
      }, { once: true });
      return;
    }

    throw new Error('This stream requires HLS.js or native HLS support');
  } catch (error) {
    console.error('Failed to initialize Aqara stream', error);
    setStatus(error.message || 'Unable to start stream');
  }
}

// Two-way audio is deliberately disabled here until the Aqara API exposes a
// documented browser-compatible audio transport. This prevents a misleading
// UI and avoids sending unsupported binary data to the cloud API.
talkBtn.addEventListener('click', () => {
  setStatus('Two-way audio is not available in this view yet.');
});

initStream();
