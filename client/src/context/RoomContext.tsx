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

const WS = "http://localhost:3000";
const ws = socketIOClient(WS);

interface RoomContextType {
  ws: Socket;
  me?: Peer;
  stream?: MediaStream;
  peers: PeerState;
  shareScreen: () => void;
  screenSharingId: string;
  setRoomId: React.Dispatch<React.SetStateAction<string>>;
}

interface Props {
  children: ReactNode;
}

const RoomContext = createContext<RoomContextType | null>(null);

const RoomProvider: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const [me, setMe] = useState<Peer>();
  const [stream, setStream] = useState<MediaStream>();
  const [peers, dispatch] = useReducer(peerReducer, {});
  const [screenSharingId, setScreenSharingId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const peerConnections = useRef<Map<string, MediaConnection>>(new Map());

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
    if (screenSharingId && screenSharingId !== me?.id) {
      alert("Someone is already sharing their screen.");
      return;
    }
    if (screenSharingId === me?.id) {
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

  const callPeer = useCallback(
    (peerId: string, localStream: MediaStream) => {
      if (!me) return;
      const call = me.call(peerId, localStream);
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
    },
    [me, dispatch]
  );

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

  const userStartSharing = ({ peerId }: { peerId: string }) => {
    setScreenSharingId(peerId);
  };

  const userStopSharing = () => {
    setScreenSharingId("");
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
          setMe(peer);
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
    if (screenSharingId === "") return;

    console.log("sending everyone that i start sharing or stop");
    ws.emit(
      screenSharingId ? "start-sharing" : "stop-sharing",
      screenSharingId ? { peerId: screenSharingId, roomId } : roomId
    );
  }, [screenSharingId, roomId]);

  useEffect(() => {
    if (!me || !stream) {
      console.log("Waiting for peer and stream...");
      return;
    }

    ws.on("user-joined", ({ peerId }) => {
      console.log("User joined room:", peerId);

      setTimeout(() => callPeer(peerId, stream), 500);
    });
  }, [callPeer, me, stream]);

  console.log("Peers:", peers);

  useEffect(() => {
    return () => {
      me?.destroy();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <RoomContext.Provider
      value={{ ws, me, stream, peers, shareScreen, screenSharingId, setRoomId }}
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
