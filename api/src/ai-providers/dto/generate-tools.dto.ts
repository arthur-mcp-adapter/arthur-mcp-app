export interface AiToolCandidateDto {
  name: string;
  description?: string;
  method: string;
  path: string;
}

export class GenerateToolsDto {
  providerId?: string;
  serverName?: string;
  baseUrl?: string;
  description?: string;
  tools: AiToolCandidateDto[];
}
