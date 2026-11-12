import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Artwork } from '@/pages/MainApp';

interface PostFeedContextValue {
  posts: Artwork[];
  addPost: (post: Artwork) => void;
}

const PostFeedContext = createContext<PostFeedContextValue | null>(null);

export function PostFeedProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Artwork[]>([]);
  const value = useMemo(() => ({
    posts,
    addPost: (post: Artwork) => setPosts((current) => [post, ...current]),
  }), [posts]);

  return <PostFeedContext.Provider value={value}>{children}</PostFeedContext.Provider>;
}

export function usePostFeed() {
  const context = useContext(PostFeedContext);
  if (!context) throw new Error('usePostFeed must be used within PostFeedProvider');
  return context;
}
