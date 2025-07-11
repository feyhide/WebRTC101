/* eslint-disable react-refresh/only-export-components */
import Peer from "peerjs";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io as socketIOClient } from "socket.io-client";
import { v4 as uuidV4 } from "uuid";

const WS = "http://localhost:3000";

interface RoomContextType {
  ws: Socket;
  me?: Peer;
}

interface Props {
  children: ReactNode;
}

const RoomContext = createContext<RoomContextType | null>(null);
const ws = socketIOClient(WS);

const RoomProvider: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const [me, setMe] = useState<Peer>();

  const enterRoom = ({ roomId }: { roomId: string }) => {
    console.log({ roomId });
    navigate(`/room/${roomId}`);
  };

  const getUsers = ({
    roomId,
    participants,
  }: {
    roomId: string;
    participants: string[];
  }) => {
    console.log(`Room:${roomId} has participants as follows`, { participants });
  };

  const leavedUser = ({ peerId }: { peerId: string }) => {
    console.log(`User:${peerId} leaved the room`);
  };

  useEffect(() => {
    const meId = uuidV4();
    const peer = new Peer(meId);
    setMe(peer);

    ws.on("room-created", enterRoom);
    ws.on("get-users", getUsers);
    ws.on("user-leaved", leavedUser);
  }, []);

  return (
    <RoomContext.Provider value={{ ws, me }}>{children}</RoomContext.Provider>
  );
};

const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
};

export { RoomProvider, useRoom };
