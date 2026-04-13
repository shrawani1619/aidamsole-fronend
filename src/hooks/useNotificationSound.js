import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'notification_sound_enabled';

export default function useNotificationSound(src = '/sounds/notification.mp3') {
  const audioRef = useRef(null);
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved == null ? true : saved === 'true';
  });
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.7;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const play = useCallback(async () => {
    if (!enabled || !audioRef.current) return;

    try {
      // Prevent overlap by restarting clip from the beginning.
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (err) {
      // Browser may block autoplay until user interaction.
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
    setEnabled,
    isUnlocked,
    play,
    unlock,
  };
}
