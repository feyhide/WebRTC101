/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from "react";

interface Props {
  stream?: MediaStream;
}

export default function VideoPlayer({ stream }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      const handleLoaded = () => {
        videoRef.current
          ?.play()
          .catch((err) => console.error("Play failed:", err));
      };

      videoRef.current.addEventListener("loadedmetadata", handleLoaded);

      return () => {
        videoRef.current?.removeEventListener("loadedmetadata", handleLoaded);
      };
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-64 h-48 object-cover rounded-md shadow-md border"
    />
  );
}
