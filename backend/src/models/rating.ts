import { Schema, model } from 'mongoose';

export interface IRating {
  mediaId: string;
  userId: string;
  score: number;
  createdAt: Date;
}

const ratingSchema = new Schema<IRating>({
  mediaId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: () => new Date() }
});

ratingSchema.index({ mediaId: 1, userId: 1 }, { unique: true });

export default model<IRating>('Rating', ratingSchema);
