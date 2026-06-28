import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ErrorTrackingProviderDocument = ErrorTrackingProvider & Document;

@Schema({ timestamps: true })
export class ErrorTrackingProvider {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  tool: string;

  @Prop({ required: true })
  dsn: string;

  @Prop()
  projectName?: string;

  @Prop()
  environment?: string;

  @Prop({ default: false })
  isActive: boolean;
}

export const ErrorTrackingProviderSchema = SchemaFactory.createForClass(ErrorTrackingProvider);
