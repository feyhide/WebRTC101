import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useEffect } from "react";

function Room() {
  const { ws } = useRoom();
  const { id } = useParams();

  useEffect(() => {
    ws.emit("join-room", { roomId: id });
  }, []);
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-b from-blue-500 to-white">
      Room Id {id}
    </div>
  );
}

export default Room;
