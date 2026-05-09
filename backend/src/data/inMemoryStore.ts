export interface MediaItem {
  _id: string;
  title: string;
  caption: string;
  location?: string;
  tags: string[];
  taggedPeople: string[];
  mediaUrl: string;
  mediaType: string;
  uploaderId: string;
  createdAt: Date;
}

export interface CommentItem {
  _id: string;
  mediaId: string;
  userId: string;
  text: string;
  createdAt: Date;
}

export interface RatingItem {
  _id: string;
  mediaId: string;
  userId: string;
  score: number;
}

let nextId = 1000;
const nextItemId = () => String(nextId++);

export const mediaStore: MediaItem[] = [
  {
    _id: nextItemId(),
    title: 'Sunset Over the Lake',
    caption: 'A relaxing evening by the water.',
    location: 'Lakeview',
    tags: ['sunset', 'lake', 'nature'],
    taggedPeople: [],
    mediaUrl: 'https://placekitten.com/800/500',
    mediaType: 'image',
    uploaderId: '1',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
  },
  {
    _id: nextItemId(),
    title: 'City Lights',
    caption: 'Night skyline vibes.',
    location: 'Downtown',
    tags: ['city', 'night', 'lights'],
    taggedPeople: [],
    mediaUrl: 'https://placekitten.com/801/500',
    mediaType: 'image',
    uploaderId: '2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12)
  }
];

export const commentsStore: CommentItem[] = [];
export const ratingsStore: RatingItem[] = [];

export const createMediaItem = (payload: Omit<MediaItem, '_id' | 'createdAt'>) => {
  const item: MediaItem = { ...payload, _id: nextItemId(), createdAt: new Date() };
  mediaStore.unshift(item);
  return item;
};

export const createComment = (payload: Omit<CommentItem, '_id' | 'createdAt'>) => {
  const item: CommentItem = { ...payload, _id: nextItemId(), createdAt: new Date() };
  commentsStore.unshift(item);
  return item;
};

export const createRating = (payload: Omit<RatingItem, '_id'>) => {
  const item: RatingItem = { ...payload, _id: nextItemId() };
  ratingsStore.unshift(item);
  return item;
};
