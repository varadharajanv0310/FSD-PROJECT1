/**
 * Seeds the demo account with a realistic practice history so the dashboard,
 * trends and reports have data to show. Safe to run repeatedly.
 *
 *   npm run seed
 */
import { connectDatabase, disconnectDatabase } from "../db/connect";
import { DEMO_EMAIL, resetDemoUser } from "../services/demo.service";
import { logger } from "../utils/logger";

async function main() {
  await connectDatabase();
  await resetDemoUser();
  logger.info(`Demo account ready: ${DEMO_EMAIL} — use “Explore the demo” on the sign-in page.`);
  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error("Seeding failed.", error);
  await disconnectDatabase();
  process.exit(1);
});
