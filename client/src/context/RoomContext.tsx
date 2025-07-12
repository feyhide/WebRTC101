/* eslint-disable react-refresh/only-export-components */
import Peer, { type MediaConnection } from "peerjs";
import {
  createContext,
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

const WS = "http://localhost:3000";

interface RoomContextType {
  ws: Socket;
  me?: Peer;
  stream?: MediaStream;
  peers: PeerState;
  shareScreen: () => void;
}

interface Props {
  children: ReactNode;
}

const RoomContext = createContext<RoomContextType | null>(null);
const ws = socketIOClient(WS);

const RoomProvider: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const [me, setMe] = useState<Peer>();
  const [stream, setStream] = useState<MediaStream>();
  const [peers, dispatch] = useReducer(peerReducer, {});
  const [screenSharingId, setScreenSharingId] = useState<string>("");
  const peerConnections = useRef<Map<string, MediaConnection>>(new Map());

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
    dispatch(removePeerAction(peerId));
    peerConnections.current.delete(peerId);
  };

  const switchStream = (newStream: MediaStream) => {
    stream?.getTracks().forEach((track) => track.stop());

    peerConnections.current.forEach((conn) => {
      const sender = conn.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (sender && newVideoTrack) {
        sender.replaceTrack(newVideoTrack).catch(console.error);
      }
    });

    setStream(newStream);
  };

  const shareScreen = () => {
    if (screenSharingId) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((camStream) => {
          switchStream(camStream);
          setScreenSharingId("");
        });
    } else {
      navigator.mediaDevices
        .getDisplayMedia({ video: true })
        .then((screenStream) => {
          switchStream(screenStream);
          if (me?.id) setScreenSharingId(me.id);

          screenStream.getVideoTracks()[0].addEventListener("ended", () => {
            navigator.mediaDevices
              .getUserMedia({ video: true, audio: true })
              .then((camStream) => {
                switchStream(camStream);
                setScreenSharingId("");
              });
          });
        });
    }
  };

  useEffect(() => {
    const meId = uuidV4();
    console.log("Generated Peer ID:", meId);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((localStream) => {
        console.log("Got local stream");
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
          console.log("Peer connection opened with ID:", id);

          peer.on("call", (call) => {
            console.log("Incoming call from:", call.peer);
            call.answer(localStream);
            peerConnections.current.set(call.peer, call);

            call.on("stream", (peerStream) => {
              console.log("Received remote stream from:", call.peer);
              dispatch(addPeerAction(call.peer, peerStream));
            });

            call.on("close", () => {
              peerConnections.current.delete(call.peer);
            });
          });

          setMe(peer);
        });

        peer.on("error", (err) => {
          console.error("Peer error:", err);
        });
      })
      .catch((err) => {
        console.error("Error getting user media:", err);
      });

    ws.on("room-created", enterRoom);
    ws.on("get-users", getUsers);
    ws.on("user-leaved", leavedUser);
  }, []);

  useEffect(() => {
    if (!me || !stream) {
      console.log("Waiting for peer and stream...");
      return;
    }

    ws.on("user-joined", ({ peerId }) => {
      console.log("User joined room:", peerId);

      setTimeout(() => {
        const call = me.call(peerId, stream);
        if (!call) {
          console.warn("Call object is undefined");
          return;
        }
        peerConnections.current.set(peerId, call);

        console.log("Calling peer:", peerId);

        call.on("stream", (peerStream) => {
          console.log("Got remote stream from:", peerId);
          dispatch(addPeerAction(peerId, peerStream));
        });

        call.on("error", (err) => {
          console.error("Call error:", err);
        });

        call.on("close", () => {
          peerConnections.current.delete(peerId);
          console.log("Call with", peerId, "closed");
        });
      }, 500);
    });
  }, [me, stream]);

  console.log("Peers:", peers);

  return (
    <RoomContext.Provider value={{ ws, me, stream, peers, shareScreen }}>
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
