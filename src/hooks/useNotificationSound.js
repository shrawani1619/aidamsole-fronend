import { useCallback, useEffect, useRef } from 'react';

function getSoundPath() {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}sounds/notification.mp3`;
}

export default function useNotificationSound() {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const blobUrlRef = useRef(null);
  const loadPromiseRef = useRef(null);

  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtxRef.current = null;
    }
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      loadPromiseRef.current = null;
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    };
  }, []);

  const ensureAudio = useCallback(async () => {
    if (audioRef.current) return audioRef.current;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    loadPromiseRef.current = (async () => {
      const path = getSoundPath();
      try {
        const res = await fetch(path, { cache: 'no-store', mode: 'same-origin' });
        if (!res.ok) return null;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = 1;
        audioRef.current = audio;
        return audio;
      } catch {
        return null;
      } finally {
        loadPromiseRef.current = null;
      }
    })();

    return loadPromiseRef.current;
  }, []);

  const playFallbackBeep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.2);
  }, []);

  const unlock = useCallback(async () => {
    try {
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    } catch {
      /* ignore */
    }

    const audio = await ensureAudio();
    if (!audio) return;

    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* decode / autoplay policy — beep may still work */
    } finally {
      audio.muted = false;
    }
  }, [ensureAudio]);

  const play = useCallback(async () => {
    const audio = (await ensureAudio()) || audioRef.current;
    if (!audio) {
      playFallbackBeep();
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      try {
        await unlock();
        audio.currentTime = 0;
        await audio.play();
      } catch {
        playFallbackBeep();
      }
    }
  }, [ensureAudio, unlock, playFallbackBeep]);

  useEffect(() => {
    const onFirstInteraction = () => {
      void unlock();
      window.removeEventListener('click', onFirstInteraction);
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };

    window.addEventListener('click', onFirstInteraction, { once: true, passive: true });
    window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', onFirstInteraction);
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, [unlock]);

  return { play, unlock };
}
