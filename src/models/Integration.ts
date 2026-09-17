import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

interface IntegrationUser {
  user_id?: string; // Replaces id field - String field, not MongoDB ObjectId
  referrenceId: string; // Mandatory field
  email?: string; // Optional field
}

export interface IIntegration extends Document {
  service: string;
  accountId: string;
  user: IntegrationUser;
  status: 'active' | 'inactive' | 'deleted';
  version: number;
  created_at: Date;
  updated_at: Date;
}

const IntegrationSchema: Schema = new Schema({
  service: {
    type: String,
    required: true,
    trim: true
  },
  accountId: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: {
      user_id: {
        type: String, // Replaces id field - String field, not MongoDB ObjectId
        required: false
      },
      referrenceId: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: false
      }
    },
    required: true,
    _id: false // Prevent MongoDB from adding an _id to this subdocument
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
    required: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for service and accountId
IntegrationSchema.index({ 
  service: 1, 
  accountId: 1 
}, { 
  unique: true
});

// Pre-save middleware to update timestamps
IntegrationSchema.pre<IIntegration>('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model<IIntegration>('Integration', IntegrationSchema); 