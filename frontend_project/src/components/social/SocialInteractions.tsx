import { memo, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Heart, Link2, X } from 'lucide-react';
import type { Artwork } from '@/pages/MainApp';
import { cn } from '@/utils/cn';
import { goToProfile } from '@/utils/navigation';
import { useCloseOnBackButton } from '@/hooks/useCloseOnBackButton';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { canonicalizeUserKey } from '@/services/storyService';

export type SampleReply = { id: number; user: string; text: string; time: string };
export type SampleComment = {
  id: number;
  user: string;
  text: string;
  likes: number;
  time: string;
  liked: boolean;
  replies: SampleReply[];
};

export const SAMPLE_COMMENTS: SampleComment[] = [
  { id: 1, user: '@ariasole', text: 'This is stunning, love the color palette!', likes: 12, time: '2h', liked: false, replies: [] },
  { id: 2, user: '@theom', text: 'The composition here is incredible 🔥', likes: 8, time: '4h', liked: false, replies: [
    { id: 21, user: '@linapaints', text: 'Thank you so much! 🙏', time: '3h' },
  ] },
  { id: 3, user: '@yukitanaka', text: 'How long did this piece take you?', likes: 3, time: '6h', liked: false, replies: [] },
  { id: 4, user: '@linapaints', text: 'Saved for inspiration, amazing work', likes: 20, time: '1d', liked: false, replies: [] },
];

export function useCommentCountOnly(work: Artwork) {
  const [extraCount, setExtraCount] = useState(0);

  return {
    displayCount: work.comments + extraCount,
    bumpCount: () => setExtraCount((count) => count + 1),
  };
}

const commentStore = new Map<number, SampleComment[]>();

const CommentStoryAvatar = memo(function CommentStoryAvatar({ user, navigate, size }: { user: string; navigate: ReturnType<typeof useNavigate>; size: number }) {
  const userKey = canonicalizeUserKey(user);
  const displayName = user.trim().startsWith('@') ? user.trim().slice(1) : user.trim();
  return <StoryAvatar userKey={userKey} name={displayName} size={size} className="shrink-0" onNoStoryClick={() => goToProfile(navigate, user)} />;
});

function cloneComments(source: SampleComment[] = SAMPLE_COMMENTS): SampleComment[] {
  return source.map((comment) => ({ ...comment, replies: [...comment.replies] }));
}

export function useCommentsState(workId: number, initialCommentCount: number) {
  const [comments, setComments] = useState<SampleComment[]>(() => {
    const stored = commentStore.get(workId);
    return cloneComments(stored ?? SAMPLE_COMMENTS);
  });
  const baseCommentCount = Math.max(0, initialCommentCount - SAMPLE_COMMENTS.length);
  const displayCount = baseCommentCount + comments.length;

  useEffect(() => {
    const stored = commentStore.get(workId);
    setComments(cloneComments(stored ?? SAMPLE_COMMENTS));
  }, [workId]);

  useEffect(() => {
    commentStore.set(workId, cloneComments(comments));
  }, [workId, comments]);

  const toggleCommentLike = (commentId: number) => {
    setComments((previous) => previous.map((comment) => (
      comment.id === commentId
        ? { ...comment, liked: !comment.liked, likes: comment.liked ? comment.likes - 1 : comment.likes + 1 }
        : comment
    )));
  };

  const addComment = (text: string) => {
    if (!text.trim()) return;
    setComments((previous) => [
      ...previous,
      { id: Date.now(), user: '@you', text: text.trim(), likes: 0, time: 'now', liked: false, replies: [] },
    ]);
  };

  const addReply = (commentId: number, text: string) => {
    if (!text.trim()) return;
    setComments((previous) => previous.map((comment) => (
      comment.id === commentId
        ? { ...comment, replies: [...comment.replies, { id: Date.now(), user: '@you', text: text.trim(), time: 'now' }] }
        : comment
    )));
  };

  return { comments, displayCount, toggleCommentLike, addComment, addReply };
}

export type CommentsState = ReturnType<typeof useCommentsState>;

export const CommentItem = memo(function CommentItem({
  comment,
  onToggleLike,
  onAddReply,
}: {
  comment: SampleComment;
  onToggleLike: (id: number) => void;
  onAddReply: (id: number, text: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const navigate = useNavigate();

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onAddReply(comment.id, replyText);
    setReplyText('');
    setReplyOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5 text-sm">
        <CommentStoryAvatar user={comment.user} navigate={navigate} size={28} />
        <div className="min-w-0 flex-1">
          <p className="leading-relaxed text-ink-200">
            <button type="button" onClick={() => goToProfile(navigate, comment.user)} className="font-semibold text-white">{comment.user}</button>{' '}
            <span className="text-ink-300">{comment.text}</span>
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs text-ink-400">
            <span>{comment.time}</span>
            {comment.likes > 0 && <span>{comment.likes} likes</span>}
            <button type="button" onClick={() => setReplyOpen((value) => !value)} className="font-medium hover:text-white">Reply</button>
          </div>
        </div>
        <button type="button" aria-label="Like comment" aria-pressed={comment.liked} onClick={() => onToggleLike(comment.id)} className="mt-0.5 shrink-0">
          <Heart className={cn('h-3.5 w-3.5', comment.liked ? 'fill-brand-pink text-brand-pink' : 'text-ink-400')} />
        </button>
      </div>

      {comment.replies.length > 0 && (
        <div className="ml-9 space-y-2 border-l border-white/10 pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2 text-sm">
              <CommentStoryAvatar user={reply.user} navigate={navigate} size={24} />
              <div>
                <p className="leading-relaxed text-ink-200">
                  <button type="button" onClick={() => goToProfile(navigate, reply.user)} className="font-semibold text-white">{reply.user}</button>{' '}
                  <span className="text-ink-300">{reply.text}</span>
                </p>
                <span className="text-xs text-ink-400">{reply.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {replyOpen && (
        <div className="ml-9 flex items-center gap-2">
          <input type="text" value={replyText} onChange={(event) => setReplyText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleSubmitReply(); }} placeholder={`Reply to ${comment.user}...`} className="flex-1 rounded-full border border-white/10 bg-ink-950/50 px-3 py-1.5 text-xs text-white placeholder:text-ink-500 focus:border-brand-pink/40 focus:outline-none" />
          <button type="button" onClick={handleSubmitReply} className="text-xs font-semibold text-brand-pink hover:text-brand-pink/80">Post</button>
        </div>
      )}
    </div>
  );
});

export function CommentsSheet({
  work,
  onClose,
  onCommentAdded,
  scrollContainerRef,
}: {
  work: Artwork;
  onClose: () => void;
  onCommentAdded?: () => void;
  scrollContainerRef?: RefObject<HTMLElement>;
}) {
  useCloseOnBackButton(true, onClose);
  const [newComment, setNewComment] = useState('');
  const savedScrollRef = useRef(0);
  const savedOverflowRef = useRef('');
  const { comments, toggleCommentLike, addComment, addReply } = useCommentsState(work.id, work.comments);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    savedScrollRef.current = container ? container.scrollTop : window.scrollY;

    if (container) {
      savedOverflowRef.current = container.style.overflow;
      container.style.overflow = 'hidden';
    } else {
      savedOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (container) {
        container.style.overflow = savedOverflowRef.current;
        container.scrollTop = savedScrollRef.current;
      } else {
        document.body.style.overflow = savedOverflowRef.current;
        window.scrollTo({ top: savedScrollRef.current, behavior: 'auto' });
      }
    };
  }, [scrollContainerRef]);

  const submitComment = () => {
    if (!newComment.trim()) return;
    addComment(newComment);
    onCommentAdded?.();
    setNewComment('');
  };

  const submitReply = (commentId: number, text: string) => {
    if (!text.trim()) return;
    addReply(commentId, text);
    onCommentAdded?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div role="dialog" aria-label={`Comments for ${work.title}`} onClick={(event) => event.stopPropagation()} className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl border-t border-white/10 bg-ink-900 shadow-premium">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Comments</h2>
          <button type="button" aria-label="Close comments" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {comments.map((comment) => <CommentItem key={comment.id} comment={comment} onToggleLike={toggleCommentLike} onAddReply={submitReply} />)}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <input type="text" value={newComment} onChange={(event) => setNewComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitComment(); }} placeholder="Add a comment..." className="flex-1 bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none" />
          <button type="button" onClick={submitComment} disabled={!newComment.trim()} className="text-sm font-semibold text-brand-pink disabled:opacity-40">Post</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ShareModal({ work, onClose, onShared }: { work: Artwork; onClose: () => void; onShared: () => void }) {
  useCloseOnBackButton(true, onClose);
  const [search, setSearch] = useState('');
  const [sentTo, setSentTo] = useState<number[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const friends = [
    { id: 1, name: 'Aria Solé', handle: '@ariasole' },
    { id: 2, name: 'Theo Marchetti', handle: '@theom' },
    { id: 3, name: 'Yuki Tanaka', handle: '@yukitanaka' },
    { id: 4, name: 'Lina Park', handle: '@linapaints' },
    { id: 5, name: 'Kenji Arai', handle: '@kenji.arai' },
  ];
  const filteredFriends = friends.filter((friend) => friend.name.toLowerCase().includes(search.toLowerCase()) || friend.handle.toLowerCase().includes(search.toLowerCase()));
  const handleCopyLink = () => {
    const textarea = document.createElement('textarea');
    textarea.value = `${window.location.origin}/profile?post=${work.id}`;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const copied = document.execCommand('copy');
      setLinkCopied(copied);
      if (copied) onShared();
    } catch {
      setLinkCopied(false);
    }
    document.body.removeChild(textarea);
  };
  const toggleSend = (id: number) => {
    if (sentTo.includes(id)) return;
    setSentTo((previous) => [...previous, id]);
    onShared();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Share" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-premium">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><h3 className="text-sm font-semibold text-white">Share</h3><button type="button" aria-label="Close share" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="px-4 py-3"><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="w-full rounded-full border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-white placeholder:text-ink-500 focus:border-brand-pink/40 focus:outline-none" /></div>
        <div className="max-h-64 space-y-1 overflow-y-auto px-2 pb-2">{filteredFriends.map((friend) => { const sent = sentTo.includes(friend.id); return <div key={friend.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]"><div className="flex items-center gap-2.5"><div className="h-9 w-9 rounded-full bg-brand-gradient-soft" /><div><p className="text-sm font-medium text-white">{friend.name}</p><p className="text-xs text-ink-400">{friend.handle}</p></div></div><button type="button" onClick={() => toggleSend(friend.id)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', sent ? 'bg-ink-700 text-ink-300' : 'bg-brand-gradient text-white')}>{sent ? 'Sent' : 'Send'}</button></div>; })}</div>
        <div className="border-t border-white/10 px-4 py-3"><button type="button" onClick={handleCopyLink} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-white hover:bg-white/[0.04]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700"><Link2 className="h-4 w-4" /></span>{linkCopied ? 'Link copied!' : 'Copy link'}</button></div>
      </div>
    </div>,
    document.body,
  );
}
