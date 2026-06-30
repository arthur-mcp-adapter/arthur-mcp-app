export class CreateAiProviderDto {
  name: string;
  description?: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  isActive?: boolean;
}
