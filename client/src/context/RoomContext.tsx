/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io as socketIOClient } from "socket.io-client";
const WS = "http://localhost:3000";

interface RoomContextType {
  ws: Socket;
}

interface Props {
  children: ReactNode;
}

const RoomContext = createContext<RoomContextType | null>(null);
const ws = socketIOClient(WS);

const RoomProvider: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const enterRoom = ({ roomId }: { roomId: "string" }) => {
    console.log({ roomId });
    navigate(`/room/${roomId}`);
  };

  useEffect(() => {
    ws.on("room-created", enterRoom);
  }, []);

  return <RoomContext.Provider value={{ ws }}>{children}</RoomContext.Provider>;
};

const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
};

export { RoomProvider, useRoom };
