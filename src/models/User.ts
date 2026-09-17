import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  isAdmin?: boolean;
  validatePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
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

// Create a virtual field for integrations
UserSchema.virtual('integrations', {
  ref: 'Integration',
  localField: '_id',
  foreignField: 'user_id',
  justOne: false // Set to false since a user can have multiple integrations
});

// Create a virtual field for applications
UserSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'user_id',
  justOne: false // Set to false since a user can have multiple applications
});

// Pre-save middleware to hash password
UserSchema.pre<IUser>('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updated_at = new Date();
  next();
});

// Method to validate password
UserSchema.methods.validatePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema); 