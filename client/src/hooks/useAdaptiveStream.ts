import { useEffect, useRef, useCallback } from "react";
import Peer, { type MediaConnection } from "peerjs";

export function useAdaptiveStream({
  me,
  stream,
  screenSharingId,
  peerConnections,
  setStream,
  meScreen,
}: {
  me?: Peer;
  stream?: MediaStream;
  screenSharingId: string;
  peerConnections: ReturnType<typeof useRef<Map<string, MediaConnection>>>;
  setStream: React.Dispatch<React.SetStateAction<MediaStream | undefined>>;
  meScreen?: Peer;
}) {
  const isLowQualityRef = useRef(false);

  const switchCameraStream = useCallback(
    async (low: boolean) => {
      if (meScreen?.id) {
        console.log(
          "[AdaptiveStream] Skipping stream switch for screen-sharing peer"
        );
        return;
      }

      console.log(
        `[AdaptiveStream] Switching camera to ${low ? "LOW" : "HIGH"} quality`
      );

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: low
            ? { width: { ideal: 320 }, height: { ideal: 180 }, frameRate: 10 }
            : { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: 15 },
          audio: true,
        });

        peerConnections.current?.forEach((conn, peerId) => {
          const sender = conn.peerConnection
            .getSenders()
            .find((s) => s.track?.kind === "video");

          const newTrack = newStream.getVideoTracks()[0];
          if (sender && newTrack) {
            sender
              .replaceTrack(newTrack)
              .then(() =>
                console.log(`[AdaptiveStream] Replaced track for ${peerId}`)
              )
              .catch((err) =>
                console.error(
                  `[AdaptiveStream] Failed replacing track for ${peerId}:`,
                  err
                )
              );
          }
        });

        stream?.getTracks().forEach((t) => t.stop());
        setStream(newStream);
        console.log("[AdaptiveStream] Stream switched and set");
      } catch (err) {
        console.error("[AdaptiveStream] Error switching camera stream:", err);
      }
    },
    [peerConnections, stream, setStream, meScreen?.id]
  );

  useEffect(() => {
    if (!me || !stream) {
      console.warn("[AdaptiveStream] Waiting for peer and stream...");
      return;
    }

    const monitorStats = setInterval(async () => {
      if (meScreen?.id) {
        console.log(
          "[AdaptiveStream] Skipping stat check for screen-sharing peer"
        );
        return;
      }

      console.log("[AdaptiveStream] Checking network stats...");
      let lowBitrate = false;

      for (const [peerId, call] of peerConnections.current?.entries() ?? []) {
        try {
          const stats = await call.peerConnection.getStats();

          stats.forEach((report) => {
            if (
              report.type === "outbound-rtp" &&
              "kind" in report &&
              report.kind === "video"
            ) {
              const bitrate =
                "bitrateMean" in report ? report.bitrateMean : undefined;
              const bytesSent = "bytesSent" in report ? report.bytesSent : 0;
              const packetLoss =
                "packetsLost" in report ? report.packetsLost : 0;
              const fps =
                "framesPerSecond" in report ? report.framesPerSecond : 15;

              const effectiveBitrate = bitrate ?? bytesSent;
              console.log(
                `[Stats][${peerId}] Bitrate: ${effectiveBitrate}, FPS: ${fps}, PacketLoss: ${packetLoss}`
              );

              if (effectiveBitrate < 100_000 || packetLoss > 20 || fps < 7) {
                lowBitrate = true;
              }
            }
          });
        } catch (err) {
          console.error(
            `[AdaptiveStream] Failed to get stats from ${peerId}:`,
            err
          );
        }
      }

      const shouldUseLow = screenSharingId !== "" || lowBitrate;

      if (shouldUseLow !== isLowQualityRef.current) {
        console.log(
          `[AdaptiveStream] Changing quality mode to: ${
            shouldUseLow ? "LOW" : "HIGH"
          }`
        );
        await switchCameraStream(shouldUseLow);
        isLowQualityRef.current = shouldUseLow;
      } else {
        console.log("[AdaptiveStream] Quality mode unchanged");
      }
    }, 8000);

    return () => {
      clearInterval(monitorStats);
      console.log("[AdaptiveStream] Cleaned up interval");
    };
  }, [
    me,
    stream,
    screenSharingId,
    peerConnections,
    switchCameraStream,
    meScreen?.id,
  ]);
}
