import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IAccount extends Document {
  name: string;
  referrenceId: string;
  users: mongoose.Types.ObjectId[] | string[];
  created_at: Date;
  updated_at: Date;
}

const AccountSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  referrenceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  users: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Index on referrenceId for faster lookups
AccountSchema.index({ referrenceId: 1 }, { unique: true });

// Pre-save middleware to update timestamps
AccountSchema.pre<IAccount>('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Virtual property to populate users
AccountSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'users',
  foreignField: '_id',
  justOne: false // Set to false since an account can have multiple users
});

export default mongoose.model<IAccount>('Account', AccountSchema); 