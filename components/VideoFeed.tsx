import React, { useEffect, forwardRef } from 'react';

interface VideoFeedProps {
  stream: MediaStream | null;
}

const VideoFeed = forwardRef<HTMLVideoElement, VideoFeedProps>(({ stream }, ref) => {
  const videoRef = ref as React.RefObject<HTMLVideoElement> | null;

  useEffect(() => {
    if (videoRef && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain"
    />
  );
});

VideoFeed.displayName = 'VideoFeed';

export default VideoFeed;
