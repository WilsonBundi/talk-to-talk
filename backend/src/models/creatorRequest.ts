import { Schema, model } from 'mongoose';

export interface ICreatorRequest {
  userId: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

const creatorRequestSchema = new Schema<ICreatorRequest>({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  status: { type: String, required: true, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: () => new Date() },
  reviewedAt: Date,
  reviewedBy: String
});

export default model<ICreatorRequest>('CreatorRequest', creatorRequestSchema);