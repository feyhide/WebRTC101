import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useEffect } from "react";
import VideoPlayer from "../components/VideoPlayer";
import type { PeerState } from "../context/peerReducer";

function Room() {
  const { ws, me, stream, peers } = useRoom();
  const { id } = useParams();

  useEffect(() => {
    if (me) ws.emit("join-room", { roomId: id, peerId: me?.id });
  }, [id, me, ws]);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-white">
      <p>Room Id {id}</p>
      <div className="grid grid-cols-2 gap-2">
        <VideoPlayer stream={stream} />
        {Object.values(peers as PeerState).map((peer) => (
          <VideoPlayer stream={peer.stream} />
        ))}
      </div>
    </div>
  );
}

export default Room;
