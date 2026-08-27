# Aqara G2H Camera voor Homey Self-Hosted Server

Dit is een native Homey-app voor een Aqara G2H met een werkende RTSP-stream.

De app gebruikt rechtstreeks Homey's native RTSP Video API. Er is dus geen Nest, Home Assistant, go2rtc, Scrypted, FFmpeg of externe cloudservice nodig.

## Installeren

Op je Mac/pc:

```bash
git clone https://github.com/JOUW-GITHUB-NAAM/homey-aqara-g2h-camera.git
cd homey-aqara-g2h-camera
npm install --global --no-optional homey
homey login
homey select
homey app run
```

Selecteer daarna in Homey:

**Een apparaat toevoegen → Aqara G2H**

Vul je cameranaam en RTSP URL in.

Bij een G2H met de bekende RTSP-modificatie zijn dit veelgebruikte paden:

```text
rtsp://CAMERA-IP/ch0_0.h264
rtsp://CAMERA-IP/ch0_1.h264
```

Gebruik de URL die bij jou al werkt.

## Waarom geen HLS?

De eerdere oplossing gebruikte RTSP → FFmpeg → HLS. Dat kan video goed laten werken terwijl audio verloren gaat.

Deze versie gebruikt:

```text
Aqara G2H
   ↓
RTSP
   ↓
Homey createVideoRTSP()
   ↓
Homey SHS WebRTC proxy
   ↓
Homey
```

Daardoor blijft de originele audio van de RTSP-stream behouden en hoeft Homey geen door ons gemaakte AAC/HLS-keten af te spelen.

## Belangrijk

`disableWebRTCProxy` staat bewust uit. Homey gebruikt daarmee zijn eigen WebRTC-proxy voor de RTSP-stream.

De Homey SDK documenteert `createVideoRTSP()` en `registerVideoUrlListener()` voor native RTSP-camera's.

## Virtual Devices

Deze app maakt bewust een **eigen Homey-camera-apparaat**. Dat is nog steeds volledig native in Homey.

Je hebt de Virtual Devices-app voor deze camera dus niet nodig.

Je bestaande Virtual Devices-apparaten en flows kunnen gewoon blijven bestaan.
