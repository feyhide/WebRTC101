import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useEffect, useState } from "react";
import VideoPlayer from "../components/VideoPlayer";
import type { PeerState } from "../context/peerReducer";
import ShareScreenButton from "../components/ShareScreenButton";

const PEERS_PER_PAGE = 2;

function Room() {
  const { ws, me, stream, peers, screenSharingId, setRoomId } = useRoom();
  const { id } = useParams();
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (me) ws.emit("join-room", { roomId: id, peerId: me.id });
  }, [id, me, ws]);

  useEffect(() => {
    if (id) {
      setRoomId(id);
    }
  }, [id, setRoomId]);

  const screenSharingVideo =
    screenSharingId === me?.id ? stream : peers[screenSharingId]?.stream;

  const filteredPeers = Object.entries(peers as PeerState).filter(
    ([peerId]) => peerId !== screenSharingId
  );

  const paginatedPeers = filteredPeers.slice(
    page * PEERS_PER_PAGE,
    (page + 1) * PEERS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredPeers.length / PEERS_PER_PAGE);

  return (
    <div className="relative w-screen h-screen flex flex-col justify-center items-center bg-gradient-to-b from-blue-500 to-white">
      <div className="fixed top-5 right-5">
        <ShareScreenButton />
      </div>

      {screenSharingId && (
        <div className="relative w-full max-w-[800px] max-h-[65%] bg-black rounded overflow-hidden mx-auto">
          <VideoPlayer
            videoStyling="w-full h-full object-contain"
            stream={screenSharingVideo}
            label={`Screen Sharing: ${screenSharingId}`}
          />
        </div>
      )}

      <div
        className={`${
          screenSharingId != "" && ""
        } h-[25%] bg-black/20 w-[90%] m-2 rounded-xl px-4 py-2 shadow-inner`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-blue-700 font-semibold">Participants</span>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-2 py-1 bg-blue-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page === totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="px-2 py-1 bg-blue-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className={`w-full grid gap-4 grid-cols-2 md:grid-cols-4`}>
          <VideoPlayer
            videoStyling="w-auto max-w-full h-32 bg-black"
            stream={stream}
            label={`Me: ${me?.id}`}
          />
          {paginatedPeers.map(([peerId, peer]) => (
            <VideoPlayer
              key={peerId}
              videoStyling="w-auto max-w-full h-32 bg-black"
              stream={peer.stream}
              label={`Peer: ${peerId}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Room;
