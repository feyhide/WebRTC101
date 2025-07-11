import type React from "react";
import { useRoom } from "../context/RoomContext";

const CreateButton: React.FC = () => {
  const { ws } = useRoom();

  const createRoom = () => {
    ws.emit("create-room");
  };

  return (
    <button
      onClick={createRoom}
      className="w-fit h-fit rounded-lg px-8 py-2 bg-black/30 text-white"
    >
      Start New Meeting
    </button>
  );
};

export default CreateButton;
