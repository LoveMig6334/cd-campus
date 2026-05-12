import { assertEnvAllows, getRootAdminId, getServiceRoleClient } from "./util";
import { seedHouses } from "./houses";
import { seedRooms } from "./rooms";

async function main(): Promise<void> {
  assertEnvAllows();
  const db = getServiceRoleClient();
  console.log("Seeding cd-campus database ...");

  const adminId = await getRootAdminId(db);
  console.log(`  · root admin id: ${adminId}`);

  await seedHouses(db);
  await seedRooms(db);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
