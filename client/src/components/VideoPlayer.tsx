/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from "react";

interface Props {
  stream?: MediaStream;
  videoStyling?: string;
  label?: string;
}

export default function VideoPlayer({ videoStyling, stream, label }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video && stream && currentStreamRef.current !== stream) {
      video.srcObject = stream;
      currentStreamRef.current = stream;

      const handleLoaded = () => {
        video.play().catch((err) => console.error("Play failed:", err));
      };

      video.addEventListener("loadedmetadata", handleLoaded);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoaded);
      };
    }
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      {label && <p className="text-xs text-gray-700">{label}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`${videoStyling} object-contain rounded-md shadow-md border`}
      />
    </div>
  );
}
