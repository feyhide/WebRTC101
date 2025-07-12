import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useEffect } from "react";
import VideoPlayer from "../components/VideoPlayer";
import type { PeerState } from "../context/peerReducer";
import ShareScreenButton from "../components/ShareScreenButton";

function Room() {
  const { ws, me, stream, peers, shareScreen } = useRoom();
  const { id } = useParams();

  useEffect(() => {
    if (me) ws.emit("join-room", { roomId: id, peerId: me?.id });
  }, [id, me, ws]);

  return (
    <div className="relative w-screen h-screen flex p-5 flex-col items-center bg-gradient-to-b from-blue-500 to-white">
      <div className="bg-white/80 border-4 border-blue-500 px-4 py-2 rounded-xl">
        <p>Room Id {id}</p>
      </div>
      <div className="w-full min-h-[90%] flex flex-col items-center justify-center gap-4">
        <div className="grid grid-cols-2 gap-2">
          <VideoPlayer stream={stream} />
          {Object.values(peers as PeerState).map((peer) => (
            <VideoPlayer stream={peer.stream} />
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
