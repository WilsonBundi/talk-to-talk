import { Schema, model } from 'mongoose';

export interface IUser {
  username: string;
  password: string;
  email: string;
  role: 'creator' | 'consumer';
  displayName: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, required: true, enum: ['creator', 'consumer'], default: 'consumer' },
  displayName: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() }
});

export default model<IUser>('User', userSchema);
