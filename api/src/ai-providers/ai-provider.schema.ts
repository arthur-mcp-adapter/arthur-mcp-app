import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiProviderDocument = AiProvider & Document;

@Schema({ timestamps: true })
export class AiProvider {
  @Prop({ required: true }) name: string;
  @Prop() description?: string;
  @Prop({ required: true }) provider: string;
  @Prop({ required: true }) model: string;
  @Prop({ required: true }) apiKey: string;
  @Prop() baseUrl?: string;
  @Prop({ default: true }) isActive: boolean;
}

export const AiProviderSchema = SchemaFactory.createForClass(AiProvider);
