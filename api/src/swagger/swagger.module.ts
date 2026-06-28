import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DynamicMcpModule } from '../dynamic-mcp/dynamic-mcp.module';
import { SettingsModule } from '../settings/settings.module';
import { SwaggerController } from './swagger.controller';
import { SwaggerService } from './swagger.service';
import { SwaggerApiKeysService } from './swagger-api-keys.service';
import { SwaggerImportService } from './swagger-import.service';

@Module({
  imports: [AuthModule, DynamicMcpModule, SettingsModule],
  controllers: [SwaggerController],
  providers: [SwaggerService, SwaggerApiKeysService, SwaggerImportService],
  exports: [SwaggerService],
})
export class SwaggerModule {}
