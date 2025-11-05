
import { useState, useRef, useCallback } from 'react';

export const useMediaStream = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async (constraints: MediaStreamConstraints) => {
    try {
      if (streamRef.current) {
        stopStream();
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error("Error accessing media devices.", err);
      if (err instanceof DOMException) {
        setError(`Error: ${err.name} - ${err.message}. Please check permissions.`);
      } else {
        setError("An unknown error occurred while accessing media devices.");
      }
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  return { stream, startStream, stopStream, error };
};
