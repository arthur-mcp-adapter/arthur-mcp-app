import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { DynamicMcpModule } from '../dynamic-mcp/dynamic-mcp.module';
import { SwaggerProject, SwaggerProjectSchema } from './swagger-project.schema';
import { SwaggerController } from './swagger.controller';
import { SwaggerService } from './swagger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SwaggerProject.name, schema: SwaggerProjectSchema },
    ]),
    AuthModule,
    DynamicMcpModule,
  ],
  controllers: [SwaggerController],
  providers: [SwaggerService],
  exports: [SwaggerService],
})
export class SwaggerModule {}
