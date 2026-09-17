import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  type: string;
  data: any; // JSON Object
  status: string;
  user_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ChannelSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: Schema.Types.Mixed, // JSON Object
    default: {}
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active'
  },
  user_id: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string for master key
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  // Add virtual fields when converting to JSON
  toJSON: { virtuals: true },
  // Add virtual fields when converting to Object
  toObject: { virtuals: true }
});

// Compound index to ensure name uniqueness per user
ChannelSchema.index({ user_id: 1, name: 1 }, { unique: true });

// Pre-save middleware to update timestamps
ChannelSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

// Create a virtual field for user relationship
ChannelSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model<IChannel>('Channel', ChannelSchema); 