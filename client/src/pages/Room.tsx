import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useEffect } from "react";
import VideoPlayer from "../components/VideoPlayer";

function Room() {
  const { ws, me, stream } = useRoom();
  const { id } = useParams();

  useEffect(() => {
    if (me) ws.emit("join-room", { roomId: id, peerId: me?.id });
  }, [id, me, ws]);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-white">
      <p>Room Id {id}</p>
      <VideoPlayer stream={stream} />
    </div>
  );
}

export default Room;
