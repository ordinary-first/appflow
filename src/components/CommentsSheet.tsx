"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { useSession } from "@/lib/auth-client";
import type { CommentDTO } from "@/app/api/comments/route";

/**
 * TikTok-style bottom sheet with the post's comment thread.
 * Anonymous users can read; posting requires login (inline Google button).
 * One reply level — "Reply" targets a top-level comment only.
 */
export function CommentsSheet({
  post,
  onClose,
}: {
  post: { postId: string; appName: string } | null;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!post) {
      setComments(null);
      setBody("");
      setReplyTo(null);
      setError(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/comments?postId=${encodeURIComponent(post.postId)}`)
      .then(async (r): Promise<{ comments: CommentDTO[] }> =>
        r.ok ? ((await r.json()) as { comments: CommentDTO[] }) : { comments: [] }
      )
      .then((data) => {
        if (!cancelled) setComments(data.comments);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [post]);

  if (!post) return null;

  const topLevel = (comments ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: string) =>
    (comments ?? []).filter((c) => c.parentId === id);

  const submit = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.postId,
          body: text,
          parentId: replyTo?.id ?? undefined,
        }),
      });
      if (!res.ok) {
        setError("댓글 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
        return; // keep the draft — never silently drop what the user typed
      }
      const data = (await res.json()) as { comment: CommentDTO };
      setComments((prev) => [...(prev ?? []), data.comment]);
      setBody("");
      setReplyTo(null);
    } catch {
      setError("네트워크 오류예요. 연결을 확인하고 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Comments">
      <button
        aria-label="Close comments"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[70dvh] flex-col rounded-t-2xl border-t border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-sm font-semibold">
            {comments === null
              ? "Comments"
              : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
            <span className="ml-2 text-muted-foreground">· {post.appName}</span>
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted-foreground transition hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {comments === null && (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {comments !== null && topLevel.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Be the first to comment.
            </p>
          )}
          {topLevel.map((c) => (
            <div key={c.id} className="py-2.5">
              <CommentRow
                comment={c}
                onReply={session?.user ? () => {
                  setReplyTo(c);
                  inputRef.current?.focus();
                } : undefined}
              />
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="ml-10 mt-2.5">
                  <CommentRow comment={r} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-border px-5 py-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          {session?.user ? (
            <>
              {error && (
                <p className="mb-1.5 text-xs text-red-400" role="alert">
                  {error}
                </p>
              )}
              {replyTo && (
                <p className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  Replying to {replyTo.author.name}
                  <button
                    onClick={() => setReplyTo(null)}
                    className="underline cursor-pointer"
                  >
                    cancel
                  </button>
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    // isComposing: Hangul/IME composition-confirm Enter must
                    // not post the comment mid-word.
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
                  }}
                  maxLength={1000}
                  placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
                  className="h-10 flex-1 rounded-full border border-border bg-muted px-4 text-sm outline-none focus:border-foreground/40"
                />
                <button
                  onClick={submit}
                  disabled={busy || !body.trim()}
                  aria-label="Send"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-xs text-muted-foreground">
                Sign in to join the conversation.
              </p>
              <div className="w-44">
                <GoogleSignIn />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
}: {
  comment: CommentDTO;
  onReply?: () => void;
}) {
  return (
    <div className="flex gap-2.5">
      {comment.author.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar
        <img
          src={comment.author.image}
          alt=""
          className="h-7 w-7 flex-none rounded-full"
        />
      ) : (
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-semibold">
          {comment.author.name[0]?.toUpperCase() ?? "?"}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{comment.author.name}</p>
        <p className="break-words text-sm">{comment.body}</p>
        {onReply && (
          <button
            onClick={onReply}
            className="mt-0.5 text-xs text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}
