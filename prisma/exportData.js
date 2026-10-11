const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  const admins = await prisma.admin.findMany();
  const permissions = await prisma.menuPermission.findMany();
  const categories = await prisma.locationCategory.findMany({
    include: { items: true }
  });
  const items = await prisma.standardItem.findMany({
    include: { locations: true }
  });
  const vehicles = await prisma.vehicleMaster.findMany();
  const labors = await prisma.laborMaster.findMany();
  const estimates = await prisma.estimate.findMany();

  const data = {
    admins,
    permissions,
    categories,
    items,
    vehicles,
    labors,
    estimates
  };

  const outputPath = path.join(__dirname, 'backup_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Successfully exported data to ${outputPath}`);
}

exportData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
