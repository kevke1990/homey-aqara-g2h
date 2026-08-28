'use strict';

const video = document.getElementById('video-player');
const talkBtn = document.getElementById('talk-btn');

async function initStream() {
  try {
    const streamUrl = await Homey.emit('get_stream_url');

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', function() {
        video.play();
      });
    }
  } catch (error) {
    console.error('Failed to init stream', error);
  }
}

let mediaRecorder;

talkBtn.addEventListener('mousedown', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = async (e) => {
      const arrayBuffer = await e.data.arrayBuffer();
      await Homey.emit('send_audio_chunk', Array.from(new Uint8Array(arrayBuffer)));
    };
    mediaRecorder.start(100);
  } catch (err) {
    console.error('Microphone access denied', err);
  }
});

talkBtn.addEventListener('mouseup', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
});

initStream();
