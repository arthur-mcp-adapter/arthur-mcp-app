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
import type { AuthConfig } from '../dynamic-mcp/types';
import { SwaggerService } from './swagger.service';

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
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
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
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');

    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.yaml') && !lower.endsWith('.yml') && !lower.endsWith('.json')) {
      throw new BadRequestException('Invalid format. Please upload a .yaml, .yml, or .json file.');
    }

    const project = await this.swaggerService.create(
      file.buffer.toString('utf-8'),
      file.originalname,
      baseUrl,
    );

    // Retorna resumo sem o rawSpec e parameterMap completo
    return {
      _id: project._id,
      name: project.name,
      baseUrl: project.baseUrl,
      description: project.description,
      version: project.version,
      status: project.status,
      toolCount: project.tools.length,
      tools: project.tools.map((t) => ({ name: t.name, description: t.description })),
    };
  }

  @Post('projects')
  createEmpty(@Body() dto: { name?: string; description?: string; baseUrl?: string }) {
    if (!dto.name?.trim()) throw new BadRequestException('Name is required.');
    if (!dto.baseUrl?.trim()) throw new BadRequestException('Base URL is required.');
    return this.swaggerService.createEmpty(dto as any);
  }

  @Get('projects')
  findAll(@Query('tags') tags?: string) {
    const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    return this.swaggerService.findAll(tagList);
  }

  @Get('projects/:id')
  findOne(@Param('id') id: string) {
    return this.swaggerService.findOne(id);
  }

  @Patch('projects/:id/info')
  updateInfo(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string },
  ) {
    return this.swaggerService.updateInfo(id, dto);
  }

  @Patch('projects/:id/tools/:toolName')
  updateToolMeta(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() dto: { name?: string; description?: string; enabled?: boolean },
  ) {
    return this.swaggerService.updateToolMeta(id, toolName, dto);
  }

  @Put('projects/:id/tools/:toolName')
  updateTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() dto: any,
  ) {
    return this.swaggerService.updateTool(id, toolName, dto);
  }

  @Post('projects/:id/tools')
  addTool(@Param('id') id: string, @Body() dto: any) {
    return this.swaggerService.addTool(id, dto);
  }

  @Delete('projects/:id/tools/:toolName')
  removeTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
  ) {
    return this.swaggerService.removeTool(id, toolName);
  }

  // ── Legacy single-key endpoints (backward-compat) ─────────────────────────

  @Post('projects/:id/api-key')
  generateApiKey(@Param('id') id: string) {
    return this.swaggerService.generateApiKey(id);
  }

  @Delete('projects/:id/api-key')
  @HttpCode(204)
  revokeApiKey(@Param('id') id: string) {
    return this.swaggerService.revokeApiKey(id);
  }

  // ── Multi-key endpoints ────────────────────────────────────────────────────

  @Post('projects/:id/api-keys')
  addApiKey(
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('name is required.');
    return this.swaggerService.addApiKey(id, name);
  }

  @Delete('projects/:id/api-keys/:keyId')
  @HttpCode(204)
  removeApiKey(
    @Param('id') id: string,
    @Param('keyId') keyId: string,
  ) {
    return this.swaggerService.removeApiKey(id, keyId);
  }

  // ── Re-import spec ─────────────────────────────────────────────────────────

  @Post('projects/:id/reimport')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async reimport(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('baseUrl') baseUrl?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
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

  @Patch('projects/:id/auth')
  updateAuth(@Param('id') id: string, @Body() auth: AuthConfig) {
    return this.swaggerService.updateAuth(id, auth);
  }

  @Patch('projects/:id/base-url')
  updateBaseUrl(
    @Param('id') id: string,
    @Body('baseUrl') baseUrl: string,
  ) {
    if (!baseUrl?.trim()) throw new BadRequestException('baseUrl cannot be empty.');
    return this.swaggerService.updateBaseUrl(id, baseUrl.trim());
  }

  @Patch('projects/:id/rate-limit')
  updateRateLimit(
    @Param('id') id: string,
    @Body() dto: { enabled: boolean; requestsPerMinute: number },
  ) {
    return this.swaggerService.updateRateLimit(id, dto);
  }

  @Post('projects/:id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.swaggerService.duplicate(id);
  }

  @Patch('projects/:id/tags')
  updateTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    if (!Array.isArray(tags)) throw new BadRequestException('tags deve ser um array de strings.');
    return this.swaggerService.updateTags(id, tags);
  }

  @Delete('projects/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.swaggerService.remove(id);
  }

  // ── Pause ────────────────────────────────────────────────────────────────────

  @Patch('projects/:id/pause')
  setPaused(@Param('id') id: string, @Body('isPaused') isPaused: boolean) {
    return this.swaggerService.setPaused(id, !!isPaused);
  }

  // ── Maintenance mode ─────────────────────────────────────────────────────────

  @Patch('projects/:id/maintenance')
  setMaintenanceMode(@Param('id') id: string, @Body() dto: { enabled: boolean; message?: string }) {
    return this.swaggerService.setMaintenanceMode(id, dto);
  }

  // ── Availability window ───────────────────────────────────────────────────────

  @Patch('projects/:id/availability')
  setAvailabilityWindow(@Param('id') id: string, @Body() dto: { enabled: boolean; timezone: string; schedule: Array<{ day: number; startHour: number; endHour: number }> }) {
    return this.swaggerService.setAvailabilityWindow(id, dto);
  }

  // ── Alert config ─────────────────────────────────────────────────────────────

  @Patch('projects/:id/alert-config')
  setAlertConfig(@Param('id') id: string, @Body() dto: { enabled: boolean; errorThresholdPct: number; notifyEmail: string }) {
    return this.swaggerService.setAlertConfig(id, dto);
  }

  // ── Tool comments ─────────────────────────────────────────────────────────────

  @Post('projects/:id/tools/:toolName/comments')
  addToolComment(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body('text') text: string,
    @Body('author') author: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('text is required.');
    return this.swaggerService.addToolComment(id, toolName, text, author ?? 'Unknown');
  }

  @Delete('projects/:id/tools/:toolName/comments/:commentId')
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
    const project = await this.swaggerService.fromPostman(file.buffer.toString('utf-8'), baseUrl);
    return { _id: project._id, name: project.name, baseUrl: project.baseUrl, toolCount: project.tools.length };
  }

  // ── Share link ────────────────────────────────────────────────────────────────

  @Post('projects/:id/share-link')
  generateShareLink(@Param('id') id: string) {
    const token = this.swaggerService.generateShareToken(id);
    return { token, url: `/share/${token}` };
  }
}
