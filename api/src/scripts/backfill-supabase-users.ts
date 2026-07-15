import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

/** One-off: provisions a Supabase Auth user for every existing account created before Supabase linking existed. */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  try {
    const { linked, skipped } = await app.get(UsersService).backfillSupabaseLinks();
    console.log(`Supabase backfill: ${linked} linked, ${skipped} skipped.`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
