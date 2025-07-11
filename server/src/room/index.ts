import { Socket } from "socket.io";
import { v4 as uuidV4 } from "uuid";

export const roomHandler = (socket: Socket) => {
  const createRoom = () => {
    const roomId = uuidV4();
    socket.emit("room-created", { roomId });
    console.log(`user create the room ${roomId}`);
  };

  const joinRoom = ({ roomId }: { roomId: string }) => {
    socket.join(roomId);
    console.log(`user joined the room${roomId}`);
  };

  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
};
