const Homey = require('homey');

class AqaraG2HDriver extends Homey.Driver {
  async onPair(session) {
    session.setHandler('validate', async (data) => {
      const rtspUrl = String(data?.rtsp_url || '').trim();
      const cameraName = String(data?.camera_name || '').trim() || 'Aqara G2H';

      if (!/^rtsp:\/\//i.test(rtspUrl)) {
        throw new Error('The RTSP URL must start with rtsp://');
      }

      // We deliberately do not open the camera during pairing.
      // Homey itself will request the RTSP URL when the video is opened.
      return {
        name: cameraName,
        data: {
          id: rtspUrl
        },
        settings: {
          rtsp_url: rtspUrl,
          camera_name: cameraName
        }
      };
    });
  }
}

module.exports = AqaraG2HDriver;
