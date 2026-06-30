import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

/** Singleton document — always fetched/updated by the same logical _id */
@Schema({ timestamps: true })
export class Settings {
  /** Fixed slug to enforce the singleton record */
  @Prop({ default: 'global', unique: true }) key: string;

  /** Public server URL (used in curl examples on the frontend) */
  @Prop({ default: '' }) serverBaseUrl: string;

  /** Default timeout for tool HTTP calls (ms) */
  @Prop({ default: 30000 }) defaultTimeoutMs: number;

  /** SMTP settings for password reset */
  @Prop({ default: '' }) smtpHost: string;
  @Prop({ default: 587 }) smtpPort: number;
  @Prop({ default: '' }) smtpUser: string;
  @Prop({ default: '' }) smtpPass: string;
  @Prop({ default: '' }) smtpFrom: string;
  @Prop({ default: '' }) jwtSecret: string;

  @Prop({ type: [{ name: String, value: String }], default: [] })
  globalRequestHeaders: { name: string; value: string }[];

  @Prop({ type: Object, default: {} })
  observabilityEnvironment?: Record<string, string>;

}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
