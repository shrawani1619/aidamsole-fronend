import { useCallback, useEffect, useRef } from 'react';

function getSoundPath() {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}sounds/notification.mp3`;
}

export default function useNotificationSound() {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const soundPathRef = useRef(getSoundPath());

  useEffect(() => {
    const audio = new Audio(soundPathRef.current);
    audio.preload = 'auto';
    audio.volume = 1;
    audio.load();
    audioRef.current = audio;
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();

    console.log('[NotificationSound] initialized', {
      src: soundPathRef.current,
      volume: audio.volume,
      audioCtxState: audioCtxRef.current?.state,
    });

    return () => {
      audio.pause();
      audioRef.current = null;
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    };
  }, []);

  const playFallbackBeep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      console.log('[NotificationSound] fallback beep skipped (no audio context)');
      return;
    }

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
    console.log('[NotificationSound] fallback beep played');
  }, []);

  const unlock = useCallback(async () => {
    if (!audioRef.current) {
      console.log('[NotificationSound] unlock skipped (audio not ready)');
      return;
    }

    try {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'running') {
        await audioCtxRef.current.resume();
      }
      audioRef.current.muted = true;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      console.log('[NotificationSound] unlock success', {
        audioCtxState: audioCtxRef.current?.state,
      });
    } catch (error) {
      console.log('[NotificationSound] unlock failed', {
        message: error?.message,
        name: error?.name,
      });
    } finally {
      // Never leave audio muted after an unlock attempt.
      if (audioRef.current) audioRef.current.muted = false;
    }
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) {
      console.log('[NotificationSound] play skipped (audio not ready)');
      return;
    }

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      console.log('[NotificationSound] mp3 play success', {
        muted: audioRef.current.muted,
        volume: audioRef.current.volume,
        readyState: audioRef.current.readyState,
      });
    } catch (error) {
      console.log('[NotificationSound] mp3 play failed, trying unlock+retry', {
        message: error?.message,
        name: error?.name,
      });
      try {
        await unlock();
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        console.log('[NotificationSound] mp3 play success after unlock retry');
      } catch (retryError) {
        console.log('[NotificationSound] mp3 play failed after unlock retry', {
          message: retryError?.message,
          name: retryError?.name,
        });
        playFallbackBeep();
      }
    }
  }, [unlock, playFallbackBeep]);

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
