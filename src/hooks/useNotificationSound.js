import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'notification_sound_enabled';

/** Files in `public/sounds/` — first one that loads is used (see public/sounds/README.txt). */
const NOTIFICATION_FILENAMES = ['notification.mp3', 'notification.wav', 'notification.ogg', 'notification.m4a'];

function soundUrl(filename) {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}sounds/${filename}`;
}

/** Pick the first URL the browser can decode (404 skips to next). */
function pickPlayableSrc(urls) {
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) {
        resolve(null);
        return;
      }
      const url = urls[i];
      const a = new Audio();
      const onOk = () => {
        cleanup();
        resolve(url);
      };
      const onErr = () => {
        cleanup();
        i += 1;
        tryNext();
      };
      const cleanup = () => {
        a.removeEventListener('canplaythrough', onOk);
        a.removeEventListener('error', onErr);
      };
      a.addEventListener('canplaythrough', onOk, { once: true });
      a.addEventListener('error', onErr, { once: true });
      a.preload = 'auto';
      a.src = url;
      a.load();
    };
    tryNext();
  });
}

export default function useNotificationSound() {
  const audioRef = useRef(null);
  /** Sound is always on — do not persist or allow turning off. */
  const enabled = true;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(null);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const urls = NOTIFICATION_FILENAMES.map(soundUrl);
    pickPlayableSrc(urls).then((src) => {
      if (cancelled || !src) return;
      setResolvedSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!resolvedSrc) return undefined;
    const audio = new Audio(resolvedSrc);
    audio.preload = 'auto';
    audio.volume = 0.7;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [resolvedSrc]);

  const lastPlayAt = useRef(0);

  const play = useCallback(async () => {
    if (!enabled || !audioRef.current) return;
    const now = Date.now();
    // Avoid double beep when room + personal notify fire close together
    if (now - lastPlayAt.current < 400) return;
    lastPlayAt.current = now;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (err) {
      console.debug('Notification audio blocked until interaction:', err?.message || err);
    }
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (!audioRef.current || isUnlocked) return;
    try {
      audioRef.current.muted = true;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = false;
      setIsUnlocked(true);
    } catch (err) {
      console.debug('Audio unlock pending user gesture:', err?.message || err);
    }
  }, [isUnlocked]);

  useEffect(() => {
    const onFirstInteraction = () => {
      unlock();
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };

    window.addEventListener('pointerdown', onFirstInteraction, { passive: true });
    window.addEventListener('keydown', onFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, [unlock]);

  return {
    enabled,
    /** Kept for API compatibility; sound cannot be disabled. */
    setEnabled: () => {},
    isUnlocked,
    resolvedSrc,
    play,
    unlock,
  };
}
