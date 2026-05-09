import { Schema, model, Types } from 'mongoose';

export interface IMedia {
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

const mediaSchema = new Schema<IMedia>({
  title: { type: String, required: true },
  caption: { type: String, required: true },
  location: String,
  tags: [{ type: String }],
  taggedPeople: [{ type: String }],
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, required: true },
  uploaderId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: () => new Date(), index: true }
});

mediaSchema.index({ title: 'text', caption: 'text', location: 'text', tags: 'text', taggedPeople: 'text' });

export default model<IMedia>('Media', mediaSchema);
