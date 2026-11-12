import { createContext, useContext, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

type EngagementSeedItem = {
  id: number;
  likes: number;
  shares: number;
  comments: number;
};

type EngagementState = {
  likedById: Record<number, boolean>;
  likeCountById: Record<number, number>;
  shareCountById: Record<number, number>;
  commentCountById: Record<number, number>;
};

type EngagementContextValue = EngagementState & {
  toggleLike: (id: number) => void;
  addShare: (id: number) => void;
  bumpComment: (id: number) => void;
};

type EngagementAction =
  | { type: 'toggleLike'; id: number; seedItems: EngagementSeedItem[] }
  | { type: 'addShare'; id: number; seedItems: EngagementSeedItem[] }
  | { type: 'bumpComment'; id: number; seedItems: EngagementSeedItem[] };

const EngagementContext = createContext<EngagementContextValue | null>(null);

function buildSeed(seedItems: EngagementSeedItem[] = []) {
  return {
    likedById: Object.fromEntries(seedItems.map((item) => [item.id, false])),
    likeCountById: Object.fromEntries(seedItems.map((item) => [item.id, item.likes])),
    shareCountById: Object.fromEntries(seedItems.map((item) => [item.id, item.shares])),
    commentCountById: Object.fromEntries(seedItems.map((item) => [item.id, item.comments])),
  };
}

function engagementReducer(state: EngagementState, action: EngagementAction): EngagementState {
  switch (action.type) {
    case 'toggleLike': {
      const id = action.id;
      const nextLiked = !Boolean(state.likedById[id]);
      const baseLikeCount = state.likeCountById[id] ?? action.seedItems.find((item) => item.id === id)?.likes ?? 0;
      return {
        ...state,
        likedById: { ...state.likedById, [id]: nextLiked },
        likeCountById: { ...state.likeCountById, [id]: Math.max(0, baseLikeCount + (nextLiked ? 1 : -1)) },
      };
    }
    case 'addShare': {
      const id = action.id;
      const baseShareCount = state.shareCountById[id] ?? action.seedItems.find((item) => item.id === id)?.shares ?? 0;
      return {
        ...state,
        shareCountById: { ...state.shareCountById, [id]: baseShareCount + 1 },
      };
    }
    case 'bumpComment': {
      const id = action.id;
      const baseCommentCount = state.commentCountById[id] ?? action.seedItems.find((item) => item.id === id)?.comments ?? 0;
      return {
        ...state,
        commentCountById: { ...state.commentCountById, [id]: baseCommentCount + 1 },
      };
    }
    default:
      return state;
  }
}

export function EngagementProvider({ children, seedItems = [] }: { children: ReactNode; seedItems?: EngagementSeedItem[] }) {
  const [state, dispatch] = useReducer(engagementReducer, seedItems, buildSeed);

  const value = useMemo<EngagementContextValue>(() => ({
    likedById: state.likedById,
    likeCountById: state.likeCountById,
    shareCountById: state.shareCountById,
    commentCountById: state.commentCountById,
    toggleLike: (id: number) => dispatch({ type: 'toggleLike', id, seedItems }),
    addShare: (id: number) => dispatch({ type: 'addShare', id, seedItems }),
    bumpComment: (id: number) => dispatch({ type: 'bumpComment', id, seedItems }),
  }), [seedItems, state]);

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement() {
  const context = useContext(EngagementContext);
  if (!context) throw new Error('useEngagement must be used within EngagementProvider');
  return context;
}
