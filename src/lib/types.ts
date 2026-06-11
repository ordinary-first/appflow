/** Plain serializable app shape passed from server components to the client feed. */
export type FeedItem = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  url: string;
  demoVideoUrl: string | null;
  youtubeUrl: string | null;
  thumbnailUrl: string | null;
  makerName: string;
  embeddable: boolean;
  likes: number;
  saves: number;
  feedbackCount: number;
};
