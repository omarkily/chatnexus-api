import Channel, { IChannel } from '../models/Channel';
import { ConflictError, NotFoundError, DatabaseError, ValidationError } from '../utils/errors';
import mongoose from 'mongoose';

export class ChannelService {
  async getAllChannels(userId?: string): Promise<IChannel[]> {
    try {
      let query = {};
      if (userId) {
        // Validate if userId is a valid ObjectId (except for master key)
        if (userId !== 'master' && !mongoose.isValidObjectId(userId)) {
          throw new ValidationError('Invalid user ID format');
        }
        query = { user_id: userId };
      }
      
      const channels = await Channel.find(query)
        .sort({ created_at: -1 });

      // Only populate user for channels that don't have master user_id
      for (const channel of channels) {
        if (channel.user_id !== 'master') {
          await channel.populate('user', 'username email');
        }
      }

      return channels;
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch channels', error);
    }
  }

  async getChannelById(id: string, includeUser = false): Promise<IChannel | null> {
    try {
      // Validate if id is a valid ObjectId
      if (!mongoose.isValidObjectId(id)) {
        throw new ValidationError('Invalid channel ID format');
      }
      
      let query = Channel.findById(id);
      
      if (includeUser) {
        query = query.populate('user', 'username email');
      }
      
      const channel = await query;
      return channel;
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch channel', error);
    }
  }

  async getChannelsByUserId(userId: string): Promise<IChannel[]> {
    try {
      // Validate if userId is a valid ObjectId (except for master key)
      if (userId !== 'master' && !mongoose.isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      return await Channel.find({ user_id: userId })
        .sort({ created_at: -1 });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch user channels', error);
    }
  }

  async createChannel(name: string, type: string, data: any, userId: string): Promise<IChannel> {
    try {
      // Validate if userId is a valid ObjectId (except for master key)
      if (userId !== 'master' && !mongoose.isValidObjectId(userId)) {
        throw new ValidationError('Invalid user ID format');
      }

      // Check if channel with this name already exists for this user
      const existingChannel = await Channel.findOne({ 
        name: name.trim(), 
        user_id: userId 
      });
      
      if (existingChannel) {
        throw new ConflictError('Channel with this name already exists for this user');
      }

      // Validate WhatsApp channel requirements
      if (type.toLowerCase() === 'whatsapp') {
        if (!data) {
          throw new ValidationError('Data object is required for WhatsApp channels');
        }
        if (!data.phone) {
          throw new ValidationError('Phone number is required in data for WhatsApp channels');
        }
      }

      // Create new channel with default status as 'active'
      const channel = new Channel({
        name: name.trim(),
        type: type.trim(),
        data: data || {},
        status: 'active', // Always set to active by default
        user_id: userId
      });

      return await channel.save();
    } catch (error: any) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      
      if (error.code === 11000) { // MongoDB duplicate key error
        throw new ConflictError('Channel with this name already exists for this user');
      }
      
      throw new DatabaseError('Failed to create channel', error);
    }
  }

  async updateChannel(id: string, updates: Partial<IChannel>): Promise<IChannel | null> {
    try {
      // Validate if id is a valid ObjectId
      if (!mongoose.isValidObjectId(id)) {
        throw new ValidationError('Invalid channel ID format');
      }
      
      // Check if channel exists
      const existingChannel = await this.getChannelById(id);
      if (!existingChannel) {
        throw new NotFoundError('Channel not found');
      }

      // If name is being updated, check if new name already exists for this user
      if (updates.name && updates.name !== existingChannel.name) {
        const channelWithName = await Channel.findOne({ 
          name: updates.name.trim(), 
          user_id: existingChannel.user_id,
          _id: { $ne: id } // Exclude current channel
        });
        if (channelWithName) {
          throw new ConflictError('Channel with this name already exists for this user');
        }
      }

      // Validate status if being updated
      if (updates.status) {
        const validStatuses = ['active', 'inactive', 'draft', 'archived'];
        if (!validStatuses.includes(updates.status)) {
          throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
      }

      // Validate WhatsApp channel requirements if type is being updated to whatsapp
      // or if data is being updated for an existing whatsapp channel
      const finalType = updates.type ? updates.type.toLowerCase() : existingChannel.type.toLowerCase();
      const finalData = updates.data !== undefined ? updates.data : existingChannel.data;
      
      if (finalType === 'whatsapp') {
        if (!finalData) {
          throw new ValidationError('Data object is required for WhatsApp channels');
        }
        if (!finalData.phone) {
          throw new ValidationError('Phone number is required in data for WhatsApp channels');
        }
      }

      // Trim name if provided
      if (updates.name) {
        updates.name = updates.name.trim();
      }

      // Update the channel
      const channel = await Channel.findByIdAndUpdate(
        id,
        { ...updates, updated_at: new Date() },
        { new: true, runValidators: true }
      );

      // Only populate user if it's not a master key
      if (channel && channel.user_id !== 'master') {
        await channel.populate('user', 'username email');
      }

      return channel;
    } catch (error: any) {
      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof ConflictError) {
        throw error;
      }
      
      if (error.code === 11000) { // MongoDB duplicate key error
        throw new ConflictError('Channel with this name already exists for this user');
      }
      
      throw new DatabaseError('Failed to update channel', error);
    }
  }

  async deleteChannel(id: string): Promise<void> {
    try {
      // Validate if id is a valid ObjectId
      if (!mongoose.isValidObjectId(id)) {
        throw new ValidationError('Invalid channel ID format');
      }
      
      // Check if channel exists
      const existingChannel = await this.getChannelById(id);
      if (!existingChannel) {
        throw new NotFoundError('Channel not found');
      }

      await Channel.findByIdAndDelete(id);
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete channel', error);
    }
  }


} 