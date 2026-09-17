import mongoose, { Document, Schema } from 'mongoose';

export interface IRequestLog extends Document {
  timestamp: Date;
  apiVersion: string;
  method: string;
  url: string;
  requestData: string;
  responseData: string;
  statusCode: number;
  terminalLogs: string[];
  created_at: Date;
  updated_at: Date;
}

const RequestLogSchema = new Schema<IRequestLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    apiVersion: {
      type: String,
      required: true,
      default: '1'
    },
    method: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    requestData: {
      type: String,
      default: ''
    },
    responseData: {
      type: String,
      default: ''
    },
    statusCode: {
      type: Number,
      required: true
    },
    terminalLogs: {
      type: [String],
      default: []
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Create indexes for better query performance
RequestLogSchema.index({ timestamp: -1 });
RequestLogSchema.index({ method: 1, url: 1 });
RequestLogSchema.index({ statusCode: 1 });

export default mongoose.model<IRequestLog>('RequestLog', RequestLogSchema); 