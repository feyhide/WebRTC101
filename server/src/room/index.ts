import { Socket } from "socket.io";
import { v4 as uuidV4 } from "uuid";

const rooms: Record<string, string[]> = {};
const screenSharers: Record<string, string> = {};

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
      rooms[roomId].push(peerId);
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", { peerId });
      socket.data.roomId = roomId;
      socket.data.peerId = peerId;

      socket.emit("get-users", { roomId, participants: rooms[roomId] });

      const currentSharer = screenSharers[roomId];
      if (currentSharer) {
        socket.emit("user-started-sharing", { peerId: currentSharer });
      }

      console.log(`user joined the room ${roomId} with peerId ${peerId}`);
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
    if (screenSharers[roomId] === peerId) {
      delete screenSharers[roomId];
      socket.to(roomId).emit("user-stopped-sharing");
      console.log(`Screen sharing stopped by ${peerId} on disconnect`);
    }
  };

  const startSharing = ({ peerId, roomId }: IRoomParams) => {
    if (screenSharers[roomId]) return;
    screenSharers[roomId] = peerId;
    socket.to(roomId).emit("user-started-sharing", { peerId });
  };

  const stopSharing = (roomId: string) => {
    delete screenSharers[roomId];
    socket.to(roomId).emit("user-stopped-sharing");
  };

  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
  socket.on("start-sharing", startSharing);
  socket.on("stop-sharing", stopSharing);
};
