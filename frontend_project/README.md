# Artistry

## Camera access during local development

Vite uses HTTPS with a self-signed development certificate so camera capture can work on phones over your local network. Start the app with `npm run dev -- --host`; open the `https://<your-computer-LAN-IP>:5173` URL printed by Vite (not `http://`). On the phone, accept/continue past the browser's self-signed certificate warning for this development site, then reload and allow camera and microphone access when prompted. Camera access is not available over plain HTTP on a LAN IP.
