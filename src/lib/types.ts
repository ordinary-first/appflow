/** Plain serializable feed card passed from server components to the client
 * feed. One item = one post (the content unit) + its app's identity fields. */
export type FeedItem = {
  /** Post id — the like/comment target. */
  postId: string;
  /** App id — the save/follow/Try target. */
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  url: string;
  mediaType: "video" | "images";
  demoVideoUrl: string | null;
  youtubeUrl: string | null;
  /** Screenshot slideshow (mediaType 'images'): 2–5 R2/external URLs. */
  imageUrls: string[] | null;
  thumbnailUrl: string | null;
  /** App logo for the rail avatar; falls back to thumbnail, then initial. */
  iconUrl: string | null;
  makerName: string;
  embeddable: boolean;
  likes: number;
  saves: number;
  feedbackCount: number;
  commentCount: number;
};
