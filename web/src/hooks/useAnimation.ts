import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAnimationOptions {
  totalFrames: number;
  onFrameChange: (index: number) => void;
}

export function useAnimation({ totalFrames, onFrameChange }: UseAnimationOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [speed, setSpeed] = useState(200);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const clearAnimationInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const animate = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= totalFrames) {
        if (!isLooping) {
          setIsPlaying(false);
          clearAnimationInterval();
          return prev;
        }
        return 0;
      }
      return next;
    });
  }, [totalFrames, isLooping, clearAnimationInterval]);

  // Start/stop animation when isPlaying changes
  useEffect(() => {
    clearAnimationInterval();
    if (isPlaying && totalFrames > 0) {
      intervalRef.current = window.setInterval(animate, speed);
    }
    return clearAnimationInterval;
  }, [isPlaying, speed, animate, clearAnimationInterval, totalFrames]);

  // Call onFrameChange when currentIndex changes
  useEffect(() => {
    onFrameChange(currentIndex);
  }, [currentIndex, onFrameChange]);

  const play = useCallback(() => {
    if (totalFrames > 0) {
      setIsPlaying(true);
    }
  }, [totalFrames]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    play();
  }, [play]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const goToFrame = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalFrames - 1)));
    pause();
  }, [totalFrames, pause]);

  const updateSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  return {
    isPlaying,
    isLooping,
    speed,
    currentIndex,
    play,
    pause,
    togglePlayPause,
    restart,
    toggleLoop,
    goToFrame,
    updateSpeed,
  };
}
