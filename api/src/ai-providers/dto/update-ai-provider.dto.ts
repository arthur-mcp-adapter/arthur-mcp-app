export class UpdateAiProviderDto {
  name?: string;
  description?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  isActive?: boolean;
}
