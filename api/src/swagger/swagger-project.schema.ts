import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { AuthConfig, EndpointRef, GeneratedTool, JsonSchema } from '../dynamic-mcp/types';

export type SwaggerProjectDocument = SwaggerProject & Document;

export type { AuthConfig, EndpointRef, GeneratedTool, JsonSchema };

export interface McpApiKeyEntry {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
}

@Schema({ timestamps: true })
export class SwaggerProject {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  baseUrl: string;

  @Prop()
  description?: string;

  @Prop()
  version?: string;

  @Prop({ type: Object })
  rawSpec: Record<string, any>;

  @Prop({ type: [Object], default: [] })
  tools: GeneratedTool[];

  @Prop({ type: Object, default: { type: 'none' } })
  auth: AuthConfig;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'error'] })
  status: string;

  @Prop()
  errorMessage?: string;

  /** Legacy single key — backward-compat */
  @Prop()
  mcpApiKey?: string;

  /** Multi-key list */
  @Prop({ type: [Object], default: [] })
  mcpApiKeys: McpApiKeyEntry[];

  @Prop()
  oauthClientId?: string;

  @Prop()
  oauthClientSecret?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: { enabled: false, requestsPerMinute: 60 } })
  rateLimit: { enabled: boolean; requestsPerMinute: number };

  /** Paused by PM — MCP endpoint returns 503 */
  @Prop({ default: false })
  isPaused: boolean;

  /** Maintenance mode — MCP returns custom message */
  @Prop({ type: Object, default: { enabled: false, message: '' } })
  maintenanceMode: { enabled: boolean; message: string };

  /** Time-window access control */
  @Prop({ type: Object, default: { enabled: false, timezone: 'UTC', schedule: [] } })
  availabilityWindow: { enabled: boolean; timezone: string; schedule: Array<{ day: number; startHour: number; endHour: number }> };

  /** Alert config */
  @Prop({ type: Object, default: { enabled: false, errorThresholdPct: 20, notifyEmail: '' } })
  alertConfig: { enabled: boolean; errorThresholdPct: number; notifyEmail: string };
}

export const SwaggerProjectSchema = SchemaFactory.createForClass(SwaggerProject);
