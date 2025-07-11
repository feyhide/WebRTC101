import { Socket } from "socket.io";
import { v4 as uuidV4 } from "uuid";

const rooms: Record<string, string[]> = {};

interface IRoomParams {
  roomId: string;
  peerId: string;
}

export const roomHandler = (socket: Socket) => {
  const createRoom = () => {
    const roomId = uuidV4();
    rooms[roomId] = [];
    socket.emit("room-created", { roomId });
    console.log(`user create the room ${roomId}`);
  };

  const joinRoom = ({ roomId, peerId }: IRoomParams) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].push(peerId);

      socket.data.roomId = roomId;
      socket.data.peerId = peerId;

      console.log(`user joined the room ${roomId} with peerId ${peerId}`);
      socket.emit("get-users", { roomId, participants: rooms[roomId] });
    }

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      const peerId = socket.data.peerId;
      if (roomId && peerId) {
        leaveRoom({ roomId, peerId });
      }
    });
  };

  const leaveRoom = ({ roomId, peerId }: IRoomParams) => {
    rooms[roomId] = rooms[roomId].filter((id) => id !== peerId);
    socket.to(roomId).emit("user-leaved", { peerId });
  };

  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
};
