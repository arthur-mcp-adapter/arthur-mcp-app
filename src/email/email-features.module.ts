import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { DigestService } from './digest.service';
import { ExecutionLogsModule } from '../execution-logs/execution-logs.module';

@Module({
  imports: [ScheduleModule.forRoot(), ExecutionLogsModule],
  providers: [EmailService, DigestService],
  exports: [EmailService, DigestService],
})
export class EmailFeaturesModule {}
