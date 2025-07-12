import { ADD_PEER, REMOVE_PEER } from "./peerActions";

export type PeerState = Record<string, { stream: MediaStream }>;

type AddPeerAction = {
  type: typeof ADD_PEER;
  payload: { peerId: string; stream: MediaStream };
};

type RemovePeerAction = {
  type: typeof REMOVE_PEER;
  payload: { peerId: string };
};

type PeerAction = AddPeerAction | RemovePeerAction;

export const peerReducer = (state: PeerState, action: PeerAction) => {
  console.log("peerReducer received:", action);
  switch (action.type) {
    case ADD_PEER:
      console.log("Adding peer:", action.payload.peerId);
      return {
        ...state,
        [action.payload.peerId]: {
          stream: action.payload.stream,
        },
      };
    case REMOVE_PEER: {
      console.log("Removing peer:", action.payload.peerId);
      const { [action.payload.peerId]: deleted, ...rest } = state;
      return rest;
    }
    default:
      return { ...state };
  }
};
