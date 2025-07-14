/* eslint-disable react-refresh/only-export-components */
import Peer, { type MediaConnection } from "peerjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io as socketIOClient } from "socket.io-client";
import { v4 as uuidV4 } from "uuid";
import { peerReducer, type PeerState } from "./peerReducer";
import { addPeerAction, removePeerAction } from "./peerActions";
import { limitSenderBitrate } from "../helper/VideoBitRateLimiter";
import { useAdaptiveStream } from "../hooks/useAdaptiveStream";

const WS = "http://localhost:3000";
const ws = socketIOClient(WS);

interface RoomContextType {
  ws: Socket;
  me?: Peer;
  meScreen?: Peer;
  stream?: MediaStream;
  peers: PeerState;
  shareScreen: () => void;
  screenSharingId: string;
  setRoomId: React.Dispatch<React.SetStateAction<string>>;
  stopScreenShare: () => void;
}

interface Props {
  children: ReactNode;
}

const RoomContext = createContext<RoomContextType | null>(null);

const RoomProvider: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const [me, setMe] = useState<Peer>();
  const [meScreen, setMeScreen] = useState<Peer>();
  const [stream, setStream] = useState<MediaStream>();
  const [peers, dispatch] = useReducer(peerReducer, {});
  const [screenSharingId, setScreenSharingId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const peerConnections = useRef<Map<string, MediaConnection>>(new Map());
  const screenSocketRef = useRef<Socket | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useAdaptiveStream({
    me,
    stream,
    screenSharingId,
    peerConnections,
    setStream,
    meScreen,
  });

  // screen impersonating as another cute peer trying to connect
  // little does my app knows how weird this second cute peer is hehe

  const shareScreen = () => {
    if (screenSharingId) {
      alert("Someone is already sharing their screen.");
      return;
    }

    if (screenSharingId === meScreen?.id) {
      alert("Bruhhh.");
      return;
    }

    const screenId = uuidV4();
    console.info(`[Screen] Generated ID: ${screenId}`);

    navigator.mediaDevices
      .getDisplayMedia({
        video: {
          frameRate: 10,
          width: { max: 1280 },
          height: { max: 720 },
        },
        audio: false,
      })
      .then((screenStream) => {
        console.info("[Screen] Got display media stream");
        screenStreamRef.current = screenStream;

        const peer = new Peer(screenId, {
          host: "localhost",
          port: 9000,
          path: "/myapp",
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          },
        });

        peer.on("open", (id) => {
          setMeScreen(peer);
          console.info(`[Screen] Peer open with ID: ${id}`);

          const screenSocket = socketIOClient(WS);
          screenSocketRef.current = screenSocket;

          screenSocket.emit("join-room", { roomId, peerId: id });

          screenSocket.emit("start-sharing", { peerId: id, roomId });

          screenSocket.on("user-joined", ({ peerId }) => {
            if (peerId === me?.id) return;

            console.info(`[Screen] Calling new joiner ${peerId}`);
            const call = peer.call(peerId, screenStream);
            if (call) {
              limitSenderBitrate(call);
              peerConnections.current.set(peerId, call);
            }
          });

          peer.on("call", (call) => {
            console.info(`[Screen] Incoming call from ${call.peer}`);
            call.answer(screenStream);
            peerConnections.current.set(call.peer, call);

            call.on("stream", () => {
              console.log("[Screen] got stream from main cam (ignored).");
            });

            call.on("close", () => {
              peerConnections.current.delete(call.peer);
            });
          });

          screenStream.getVideoTracks()[0].addEventListener("ended", () => {
            stopScreenShare();
          });
        });

        peer.on("error", (err) => {
          console.error("[Screen] Peer error:", err);
        });
      })
      .catch((err) => console.error("[Screen] Failed to share screen:", err));
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    if (meScreen) {
      meScreen.destroy();
      setMeScreen(undefined);
    }

    if (screenSocketRef.current) {
      screenSocketRef.current.emit("stop-sharing", roomId);
      screenSocketRef.current.disconnect();
      screenSocketRef.current = null;
    }

    console.info("[Screen] Stopped sharing and cleaned up");
  };

  // ----- ended screen peer thingy -----

  const callPeer = useCallback(
    (peerId: string, localStream: MediaStream) => {
      if (!me) return;

      const call = me.call(peerId, localStream);
      if (!call) {
        console.warn("[Call] Call object is undefined");
        return;
      }

      limitSenderBitrate(call);
      peerConnections.current.set(peerId, call);
      console.info(`[Call] Calling ${peerId}`);

      call.on("stream", (peerStream) => {
        if (!peers[peerId]) {
          console.info(`[Call] Received remote stream from ${peerId}`);
          dispatch(addPeerAction(peerId, peerStream));
        }
      });

      call.on("error", (err) =>
        console.error(`[Call] Error with ${peerId}:`, err)
      );

      call.on("close", () => {
        peerConnections.current.delete(peerId);
        console.info(`[Call] Call with ${peerId} closed`);
      });
    },
    [me, peers]
  );

  const enterRoom = ({ roomId }: { roomId: string }) => {
    console.info(`[Room] Entered: ${roomId}`);
    navigate(`/room/${roomId}`);
  };

  const getUsers = ({
    roomId,
    participants,
  }: {
    roomId: string;
    participants: string[];
  }) => {
    console.info(`[Room] ${roomId} users:`, participants);
  };

  const leavedUser = ({ peerId }: { peerId: string }) => {
    console.info(`[Room] ${peerId} left`);
    dispatch(removePeerAction(peerId));
    peerConnections.current.delete(peerId);
  };

  const userStartSharing = ({ peerId }: { peerId: string }) => {
    setScreenSharingId(peerId);
  };

  const userStopSharing = () => {
    setScreenSharingId("");
  };

  useEffect(() => {
    const meId = uuidV4();
    console.info(`[Init] Peer ID: ${meId}`);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 15 },
        },
        audio: true,
      })
      .then((localStream) => {
        console.info("[Init] Got user media");
        setStream(localStream);

        const peer = new Peer(meId, {
          host: "localhost",
          port: 9000,
          path: "/myapp",
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          },
        });

        peer.on("open", (id) => {
          setMe(peer);
          console.info(`[Init] Peer connected: ${id}`);

          peer.on("call", (call) => {
            console.info(`[Call] Incoming from ${call.peer}`);
            call.answer(localStream);
            peerConnections.current.set(call.peer, call);

            call.on("stream", (peerStream) => {
              console.info(`[Call] Got stream from ${call.peer}`);
              if (!peers[call.peer]) {
                dispatch(addPeerAction(call.peer, peerStream));
              }
            });

            call.on("close", () => {
              peerConnections.current.delete(call.peer);
            });
          });
        });

        peer.on("error", (err) => console.error("[Init] Peer error:", err));
      })
      .catch((err) => console.error("[Init] Failed to get user media:", err));

    ws.on("room-created", enterRoom);
    ws.on("get-users", getUsers);
    ws.on("user-leaved", leavedUser);
    ws.on("user-started-sharing", userStartSharing);
    ws.on("user-stopped-sharing", userStopSharing);

    return () => {
      ws.off("room-created");
      ws.off("get-users");
      ws.off("user-leaved");
      ws.off("user-started-sharing");
      ws.off("user-stopped-sharing");
    };
  }, []);

  useEffect(() => {
    if (!me || !stream) return;

    ws.on("user-joined", ({ peerId }) => {
      setTimeout(() => callPeer(peerId, stream), 500);
    });
  }, [callPeer, me, meScreen?.id, stream]);

  useEffect(() => {
    return () => {
      me?.destroy();
      stream?.getTracks().forEach((t) => t.stop());
      stopScreenShare();
    };
  }, []);

  return (
    <RoomContext.Provider
      value={{
        ws,
        me,
        stream,
        peers,
        stopScreenShare,
        shareScreen,
        screenSharingId,
        setRoomId,
        meScreen,
      }}
    >
      {children}
    </RoomContext.Provider>
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
