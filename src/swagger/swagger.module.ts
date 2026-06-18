import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DynamicMcpModule } from '../dynamic-mcp/dynamic-mcp.module';
import { SwaggerController } from './swagger.controller';
import { SwaggerService } from './swagger.service';

@Module({
  imports: [AuthModule, DynamicMcpModule],
  controllers: [SwaggerController],
  providers: [SwaggerService],
  exports: [SwaggerService],
})
export class SwaggerModule {}
