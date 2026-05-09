import { Schema, model } from 'mongoose';

export interface IComment {
  mediaId: string;
  userId: string;
  text: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>({
  mediaId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date(), index: true }
});

export default model<IComment>('Comment', commentSchema);
