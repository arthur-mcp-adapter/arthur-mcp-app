import { Module } from '@nestjs/common'
import { ErrorTrackingController } from './error-tracking.controller'
import { ErrorTrackingService } from './error-tracking.service'

@Module({
  controllers: [ErrorTrackingController],
  providers: [ErrorTrackingService],
  exports: [ErrorTrackingService],
})
export class ErrorTrackingModule {}
