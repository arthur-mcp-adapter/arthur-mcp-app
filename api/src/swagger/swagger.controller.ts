/// <reference types="multer" />
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthConfig, DbConnectionConfig, DbQuery, EndpointRef, ExecutionRef } from '../dynamic-mcp/types';
import { SwaggerService } from './swagger.service';
import {
  AlertConfigDto,
  AvailabilityWindowDto,
  ChainDto,
  CreateServerDto,
  DbQueryDto,
  MaintenanceModeDto,
  OAuthClientDto,
  RateLimitDto,
  ResponseConfigDto,
  ResourceDto,
  ShareSlugDto,
  TenantConfigDto,
  ToolEndpointDto,
  UpdateServerInfoDto,
  UpdateToolMetaDto,
} from './dto/swagger.dto';

@Controller('swagger')
@UseGuards(JwtAuthGuard)
export class SwaggerController {
  constructor(private readonly swaggerService: SwaggerService) {}

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Query('baseUrl') baseUrl?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.yaml') && !lower.endsWith('.yml') && !lower.endsWith('.json')) {
      throw new BadRequestException('Invalid format. Please upload a .yaml, .yml, or .json file.');
    }
    return this.swaggerService.previewSpec(
      file.buffer.toString('utf-8'),
      file.originalname,
      baseUrl,
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('baseUrl') baseUrl?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');

    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.yaml') && !lower.endsWith('.yml') && !lower.endsWith('.json')) {
      throw new BadRequestException('Invalid format. Please upload a .yaml, .yml, or .json file.');
    }

    const server = await this.swaggerService.create(
      file.buffer.toString('utf-8'),
      file.originalname,
      baseUrl,
    );

    // Return a compact summary without rawSpec and the full parameterMap.
    return {
      _id: server._id,
      name: server.name,
      baseUrl: server.baseUrl,
      description: server.description,
      version: server.version,
      status: server.status,
      toolCount: server.tools.length,
      tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
    };
  }

  @Post('servers')
  createEmpty(@Body() dto: CreateServerDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Name is required.');
    return this.swaggerService.createEmpty({
      name: dto.name,
      description: dto.description,
      baseUrl: dto.baseUrl?.trim() || '',
      tags: dto.tags,
    });
  }

  @Get('servers')
  findAll(@Query('tags') tags?: string) {
    const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    return this.swaggerService.findAll(tagList);
  }

  @Get('servers/:id')
  findOne(@Param('id') id: string) {
    return this.swaggerService.findOne(id);
  }

  @Patch('servers/:id/info')
  updateInfo(
    @Param('id') id: string,
    @Body() dto: UpdateServerInfoDto,
  ) {
    return this.swaggerService.updateInfo(id, dto);
  }

  @Patch('servers/:id/tools/:toolName')
  updateToolMeta(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() dto: UpdateToolMetaDto,
  ) {
    return this.swaggerService.updateToolMeta(id, toolName, dto);
  }

  @Patch('servers/:id/tools/:toolName/output-schema')
  updateToolOutputSchema(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body('outputSchema') outputSchema: Record<string, unknown> | null,
  ) {
    return this.swaggerService.updateToolOutputSchema(id, decodeURIComponent(toolName), outputSchema);
  }

  @Put('servers/:id/tools/:toolName')
  updateTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() dto: ToolEndpointDto,
  ) {
    return this.swaggerService.updateTool(id, toolName, dto);
  }

  @Post('servers/:id/tools')
  addTool(@Param('id') id: string, @Body() dto: ToolEndpointDto) {
    return this.swaggerService.addTool(id, dto);
  }

  @Delete('servers/:id/tools/:toolName')
  removeTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
  ) {
    return this.swaggerService.removeTool(id, toolName);
  }

  // ── Legacy single-key endpoints (backward-compat) ─────────────────────────

  @Post('servers/:id/api-key')
  generateApiKey(@Param('id') id: string) {
    return this.swaggerService.generateApiKey(id);
  }

  @Delete('servers/:id/api-key')
  @HttpCode(204)
  revokeApiKey(@Param('id') id: string) {
    return this.swaggerService.revokeApiKey(id);
  }

  // ── Multi-key endpoints ────────────────────────────────────────────────────

  @Post('servers/:id/api-keys')
  addApiKey(
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('name is required.');
    return this.swaggerService.addApiKey(id, name);
  }

  @Delete('servers/:id/api-keys/:keyId')
  @HttpCode(204)
  removeApiKey(
    @Param('id') id: string,
    @Param('keyId') keyId: string,
  ) {
    return this.swaggerService.removeApiKey(id, keyId);
  }

  // ── Re-import spec ─────────────────────────────────────────────────────────

  @Post('servers/:id/reimport')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async reimport(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('baseUrl') baseUrl?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.yaml') && !lower.endsWith('.yml') && !lower.endsWith('.json')) {
      throw new BadRequestException('Invalid format. Please upload a .yaml, .yml, or .json file.');
    }
    return this.swaggerService.reimportSpec(
      id,
      file.buffer.toString('utf-8'),
      file.originalname,
      baseUrl,
    );
  }

  @Patch('servers/:id/auth')
  updateAuth(@Param('id') id: string, @Body() auth: AuthConfig) {
    return this.swaggerService.updateAuth(id, auth);
  }

  @Patch('servers/:id/base-url')
  updateBaseUrl(
    @Param('id') id: string,
    @Body('baseUrl') baseUrl: string,
  ) {
    if (!baseUrl?.trim()) throw new BadRequestException('baseUrl cannot be empty.');
    return this.swaggerService.updateBaseUrl(id, baseUrl.trim());
  }

  @Patch('servers/:id/oauth-client')
  @UseGuards(PermissionsGuard)
  @RequirePermission('servers_edit_settings')
  updateOAuthClient(
    @Param('id') id: string,
    @Body() dto: OAuthClientDto,
  ) {
    return this.swaggerService.updateOAuthClient(id, dto);
  }

  @Patch('servers/:id/share-slug')
  updateShareSlug(
    @Param('id') id: string,
    @Body() dto: ShareSlugDto,
  ) {
    return this.swaggerService.updateShareSlug(id, dto.shareSlug);
  }

  @Patch('servers/:id/rate-limit')
  updateRateLimit(
    @Param('id') id: string,
    @Body() dto: RateLimitDto,
  ) {
    return this.swaggerService.updateRateLimit(id, dto);
  }

  @Patch('servers/:id/response-config')
  updateResponseConfig(
    @Param('id') id: string,
    @Body() dto: ResponseConfigDto,
  ) {
    return this.swaggerService.updateResponseConfig(id, dto);
  }

  @Post('servers/:id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.swaggerService.duplicate(id);
  }

  @Patch('servers/:id/tags')
  updateTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    if (!Array.isArray(tags)) throw new BadRequestException('tags must be an array of strings.');
    return this.swaggerService.updateTags(id, tags);
  }

  @Delete('servers/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.swaggerService.remove(id);
  }

  // ── Pause ────────────────────────────────────────────────────────────────────

  @Patch('servers/:id/pause')
  setPaused(@Param('id') id: string, @Body('isPaused') isPaused: boolean) {
    return this.swaggerService.setPaused(id, !!isPaused);
  }

  // ── Maintenance mode ─────────────────────────────────────────────────────────

  @Patch('servers/:id/maintenance')
  setMaintenanceMode(@Param('id') id: string, @Body() dto: MaintenanceModeDto) {
    return this.swaggerService.setMaintenanceMode(id, dto);
  }

  // ── Availability window ───────────────────────────────────────────────────────

  @Patch('servers/:id/availability')
  setAvailabilityWindow(@Param('id') id: string, @Body() dto: AvailabilityWindowDto) {
    return this.swaggerService.setAvailabilityWindow(id, dto);
  }

  // ── Alert config ─────────────────────────────────────────────────────────────

  @Patch('servers/:id/alert-config')
  setAlertConfig(@Param('id') id: string, @Body() dto: AlertConfigDto) {
    return this.swaggerService.setAlertConfig(id, dto);
  }

  // ── Tenant config ─────────────────────────────────────────────────────────────

  @Patch('servers/:id/tenant-config')
  setTenantConfig(
    @Param('id') id: string,
    @Body() dto: TenantConfigDto,
  ) {
    return this.swaggerService.setTenantConfig(id, dto);
  }

  // ── Resources ─────────────────────────────────────────────────────────────────

  @Post('servers/:id/resources')
  @HttpCode(201)
  addResource(@Param('id') id: string, @Body() dto: ResourceDto) {
    return this.swaggerService.addResource(id, dto);
  }

  @Put('servers/:id/resources/:resourceId')
  updateResource(@Param('id') id: string, @Param('resourceId') resourceId: string, @Body() dto: Partial<ResourceDto>) {
    return this.swaggerService.updateResource(id, resourceId, dto);
  }

  @Patch('servers/:id/resources/:resourceId')
  patchResource(@Param('id') id: string, @Param('resourceId') resourceId: string, @Body() dto: Partial<ResourceDto>) {
    return this.swaggerService.updateResource(id, resourceId, dto);
  }

  @Delete('servers/:id/resources/:resourceId')
  @HttpCode(204)
  deleteResource(@Param('id') id: string, @Param('resourceId') resourceId: string) {
    return this.swaggerService.deleteResource(id, resourceId);
  }

  // ── Prompt references (link global prompts to a project) ─────────────────────

  @Post('servers/:id/prompts')
  @HttpCode(201)
  addPromptRef(@Param('id') id: string, @Body('promptId') promptId: string) {
    return this.swaggerService.addPromptRef(id, promptId);
  }

  @Patch('servers/:id/prompts/:promptId')
  @HttpCode(204)
  togglePromptEnabled(@Param('id') id: string, @Param('promptId') promptId: string, @Body('enabled') enabled: boolean) {
    return this.swaggerService.togglePromptEnabled(id, promptId, enabled);
  }

  @Delete('servers/:id/prompts/:promptId')
  @HttpCode(204)
  removePromptRef(@Param('id') id: string, @Param('promptId') promptId: string) {
    return this.swaggerService.removePromptRef(id, promptId);
  }

  // ── Tool Chains ───────────────────────────────────────────────────────────────

  @Post('servers/:id/chains')
  @HttpCode(201)
  addChain(@Param('id') id: string, @Body() dto: ChainDto) {
    return this.swaggerService.addChain(id, dto);
  }

  @Patch('servers/:id/chains/:chainId')
  updateChain(
    @Param('id') id: string,
    @Param('chainId') chainId: string,
    @Body() dto: Partial<ChainDto>,
  ) {
    return this.swaggerService.updateChain(id, chainId, dto);
  }

  @Delete('servers/:id/chains/:chainId')
  @HttpCode(204)
  deleteChain(@Param('id') id: string, @Param('chainId') chainId: string) {
    return this.swaggerService.deleteChain(id, chainId);
  }

  // ── Tool comments ─────────────────────────────────────────────────────────────

  @Post('servers/:id/tools/:toolName/comments')
  addToolComment(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body('text') text: string,
    @Body('author') author: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('text is required.');
    return this.swaggerService.addToolComment(id, toolName, text, author ?? 'Unknown');
  }

  @Delete('servers/:id/tools/:toolName/comments/:commentId')
  @HttpCode(204)
  deleteToolComment(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Param('commentId') commentId: string,
  ) {
    return this.swaggerService.deleteToolComment(id, toolName, commentId);
  }

  // ── Auto-discover spec ────────────────────────────────────────────────────────

  @Post('discover')
  discoverSpec(@Body('baseUrl') baseUrl: string) {
    if (!baseUrl?.trim()) throw new BadRequestException('baseUrl is required.');
    return this.swaggerService.discoverSpec(baseUrl.trim());
  }

  // ── Test connection ───────────────────────────────────────────────────────────

  @Post('test-connection')
  testConnection(@Body() dto: { baseUrl: string; auth?: AuthConfig }) {
    if (!dto?.baseUrl?.trim()) throw new BadRequestException('baseUrl is required.');
    return this.swaggerService.testConnection(dto.baseUrl.trim(), dto.auth);
  }

  // ── Postman import ────────────────────────────────────────────────────────────

  @Post('parse-postman')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async parsePostman(@UploadedFile() file: Express.Multer.File, @Query('baseUrl') baseUrl?: string) {
    if (!file) throw new BadRequestException('No file uploaded.');
    return this.swaggerService.previewPostman(file.buffer.toString('utf-8'), baseUrl);
  }

  @Post('import-postman')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importPostman(@UploadedFile() file: Express.Multer.File, @Query('baseUrl') baseUrl?: string) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const server = await this.swaggerService.fromPostman(file.buffer.toString('utf-8'), baseUrl);
    return { _id: server._id, name: server.name, baseUrl: server.baseUrl, toolCount: server.tools.length };
  }

  // ── Test endpoint (for dynamic resource wizard) ───────────────────────────────

  @Post('servers/:id/test-endpoint')
  testEndpoint(
    @Param('id') id: string,
    @Body('endpointRef') endpointRef: EndpointRef,
    @Body('args') args: Record<string, unknown>,
  ) {
    if (!endpointRef) throw new BadRequestException('endpointRef is required.');
    return this.swaggerService.testEndpoint(id, endpointRef, args ?? {});
  }

  // ── DB connection management ──────────────────────────────────────────────────

  @Patch('servers/:id/connection')
  updateConnection(@Param('id') id: string, @Body() cfg: DbConnectionConfig) {
    return this.swaggerService.updateConnectionConfig(id, cfg);
  }

  @Post('servers/:id/test-db-connection')
  @HttpCode(200)
  testDbConnection(@Param('id') id: string) {
    return this.swaggerService.testDbConnection(id);
  }

  @Post('servers/:id/introspect')
  @HttpCode(200)
  introspect(@Param('id') id: string) {
    return this.swaggerService.introspectDbSchema(id);
  }

  @Post('servers/:id/test-db-query')
  @HttpCode(200)
  testDbQuery(
    @Param('id') id: string,
    @Body('executionRef') executionRef: ExecutionRef,
    @Body('args') args: Record<string, unknown>,
  ) {
    if (!executionRef) throw new BadRequestException('executionRef is required.');
    return this.swaggerService.testDbQuery(id, executionRef, args ?? {});
  }

  // ── DbQuery CRUD ──────────────────────────────────────────────────────────────

  @Get('servers/:id/queries')
  listDbQueries(@Param('id') id: string) {
    return this.swaggerService.listDbQueries(id);
  }

  @Post('servers/:id/queries')
  addDbQuery(@Param('id') id: string, @Body() dto: DbQueryDto) {
    if (!dto.name?.trim()) throw new BadRequestException('name is required.');
    if (!dto.sourceType) throw new BadRequestException('sourceType is required.');
    return this.swaggerService.addDbQuery(id, dto);
  }

  @Put('servers/:id/queries/:queryId')
  updateDbQuery(
    @Param('id') id: string,
    @Param('queryId') queryId: string,
    @Body() dto: Partial<DbQueryDto>,
  ) {
    return this.swaggerService.updateDbQuery(id, queryId, dto);
  }

  @Delete('servers/:id/queries/:queryId')
  @HttpCode(204)
  deleteDbQuery(@Param('id') id: string, @Param('queryId') queryId: string) {
    return this.swaggerService.deleteDbQuery(id, queryId);
  }

  @Post('servers/:id/queries/:queryId/run')
  @HttpCode(200)
  runDbQuery(
    @Param('id') id: string,
    @Param('queryId') queryId: string,
    @Body('args') args: Record<string, unknown>,
  ) {
    return this.swaggerService.runDbQuery(id, queryId, args ?? {});
  }

  @Post('servers/:id/run-query-inline')
  @HttpCode(200)
  runQueryInline(
    @Param('id') id: string,
    @Body('query') query: DbQuery,
    @Body('args') args: Record<string, unknown>,
  ) {
    if (!query) throw new BadRequestException('query is required.');
    return this.swaggerService.runQueryInline(id, query, args ?? {});
  }

  // ── Share link ────────────────────────────────────────────────────────────────

  @Post('servers/:id/share-link')
  async generateShareLink(@Param('id') id: string) {
    return this.swaggerService.generateShareLink(id);
  }
}
