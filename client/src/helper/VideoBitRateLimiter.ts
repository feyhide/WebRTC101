import type { MediaConnection } from "peerjs";

export function limitSenderBitrate(
  call: MediaConnection,
  maxBitrate = 600_000
) {
  try {
    const sender = call.peerConnection
      .getSenders()
      .find((s) => s.track?.kind === "video");

    if (!sender) return;

    const parameters = sender.getParameters();
    if (!parameters.encodings) parameters.encodings = [{}];

    parameters.encodings[0].maxBitrate = maxBitrate;
    sender.setParameters(parameters).catch(console.error);
  } catch (err) {
    console.error("[Bitrate] Failed to set bitrate:", err);
  }
}
