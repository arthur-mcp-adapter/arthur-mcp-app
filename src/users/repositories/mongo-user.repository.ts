import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user.schema';
import { IUserRepository, UserRecord } from '../user.repository';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  private toRecord(doc: UserDocument): UserRecord {
    const obj = doc.toObject();
    return {
      _id: String(obj._id),
      username: obj.username,
      email: obj.email,
      password: obj.password,
      role: obj.role,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const doc = await this.model.findOne({ username: username.toLowerCase().trim() });
    return doc ? this.toRecord(doc) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const doc = await this.model.findOne({ email: email.toLowerCase().trim() });
    return doc ? this.toRecord(doc) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? this.toRecord(doc) : null;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Omit<UserRecord, 'password'>[]> {
    const docs = await this.model.find().select('-password').sort({ createdAt: -1 }).exec();
    return docs.map((doc) => {
      const obj = doc.toObject() as any;
      return {
        _id: String(obj._id),
        username: obj.username,
        email: obj.email,
        role: obj.role,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
      };
    });
  }

  async create(data: { username: string; email: string; password: string; role?: string }): Promise<UserRecord> {
    const doc = await this.model.create(data);
    return this.toRecord(doc);
  }

  async update(id: string, data: Partial<Omit<UserRecord, '_id'>>): Promise<UserRecord> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('User not found.');
    Object.assign(doc, data);
    await doc.save();
    return this.toRecord(doc);
  }

  async delete(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('User not found.');
  }
}
