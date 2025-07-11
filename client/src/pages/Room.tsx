import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useEffect } from "react";

function Room() {
  const { ws, me } = useRoom();
  const { id } = useParams();

  useEffect(() => {
    if (me) ws.emit("join-room", { roomId: id, peerId: me?.id });
  }, [id, me, ws]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-b from-blue-500 to-white">
      Room Id {id}
    </div>
  );
}

export default Room;
