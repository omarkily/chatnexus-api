import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  api_key: string;
  scopes: string[];
  status: "active" | "inactive" | "deleted";
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const ApplicationSchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  api_key: {
    type: String,
    unique: true,
    required: true,
  },
  scopes: {
    type: [String],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "deleted"],
    default: "active",
  },
  last_used_at: {
    type: Date,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure name uniqueness per user
ApplicationSchema.index({ user_id: 1, name: 1 }, { unique: true });

// Pre-save middleware to update timestamps
ApplicationSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model<IApplication>("Application", ApplicationSchema);
