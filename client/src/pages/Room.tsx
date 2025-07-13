import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useEffect } from "react";
import VideoPlayer from "../components/VideoPlayer";
import type { PeerState } from "../context/peerReducer";
import ShareScreenButton from "../components/ShareScreenButton";

function Room() {
  const { ws, me, stream, peers, shareScreen, screenSharingId, setRoomId } =
    useRoom();
  const { id } = useParams();

  useEffect(() => {
    if (me) ws.emit("join-room", { roomId: id, peerId: me?.id });
  }, [id, me, ws]);

  useEffect(() => {
    if (id) {
      setRoomId(id);
    }
  }, [id, setRoomId]);

  const screenSharingVideo =
    screenSharingId === me?.id ? stream : peers[screenSharingId]?.stream;

  useEffect(() => {
    console.log("screen sharing id: ", screenSharingId);
  }, [screenSharingId]);

  return (
    <div className="relative w-screen h-screen flex p-5 flex-col items-center bg-gradient-to-b from-blue-500 to-white">
      <div className="bg-white/80 border-4 border-blue-500 px-4 py-2 rounded-xl">
        <p>Room Id {id}</p>
      </div>
      <div className="w-full min-h-[90%] flex flex-col items-center justify-center gap-4">
        {screenSharingVideo && (
          <div className="w-full flex max-h-[80%]">
            <VideoPlayer
              videoStyling={"max-w-full max-h-full"}
              stream={screenSharingVideo}
            />
          </div>
        )}
        <div
          className={`max-h-[20%] grid gap-4 ${
            screenSharingVideo ? "w-auto grid-cols-4" : "grid-cols-4"
          }`}
        >
          <VideoPlayer
            videoStyling={"w-auto h-full bg-black"}
            stream={stream}
          />
          {Object.values(peers as PeerState).map((peer) => (
            <VideoPlayer
              videoStyling={"w-auto h-full bg-black"}
              stream={peer.stream}
            />
          ))}
        </div>
      </div>

      <div className="fixed bottom-10">
        <ShareScreenButton handleShareScreen={shareScreen} />
      </div>
    </div>
  );
}

export default Room;
