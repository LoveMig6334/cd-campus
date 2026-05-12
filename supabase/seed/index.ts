import { assertEnvAllows, getRootAdminId, getServiceRoleClient } from "./util";
import { seedHouses } from "./houses";
import { seedRooms } from "./rooms";
import { seedEvents } from "./events";
import { seedSportResults } from "./sportResults";

async function main(): Promise<void> {
  assertEnvAllows();
  const db = getServiceRoleClient();
  console.log("Seeding cd-campus database ...");

  const adminId = await getRootAdminId(db);
  console.log(`  · root admin id: ${adminId}`);

  await seedHouses(db);
  await seedRooms(db);
  await seedEvents(db, adminId);
  await seedSportResults(db, adminId);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
