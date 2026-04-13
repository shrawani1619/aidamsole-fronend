Place your notification audio file in this folder. The app tries, in order:

1. notification.mp3
2. notification.wav
3. notification.ogg
4. notification.m4a

Use one filename above (preferred: short MP3, about 0.5s–2s, small file size).

The URL is served as /sounds/<filename> (with Vite base path prefix if you set one).

The hook preloads the first file that loads successfully and plays it on real-time
notification events (unless the payload is chat/silent).
