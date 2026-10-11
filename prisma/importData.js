const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData() {
  const filePath = path.join(__dirname, 'backup_data.json');
  if (!fs.existsSync(filePath)) {
    console.error('backup_data.json not found!');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Admins
  for (const admin of data.admins || []) {
    await prisma.admin.upsert({
      where: { userId: admin.userId },
      update: {},
      create: {
        id: admin.id,
        userId: admin.userId,
        password: admin.password,
        name: admin.name,
        role: admin.role,
        level: admin.level
      }
    });
  }

  // 2. Menu Permissions
  for (const perm of data.permissions || []) {
    await prisma.menuPermission.upsert({
      where: { menuPath: perm.menuPath },
      update: {},
      create: {
        id: perm.id,
        menuPath: perm.menuPath,
        menuName: perm.menuName,
        minLevel: perm.minLevel
      }
    });
  }

  // 3. Location Categories
  for (const cat of data.categories || []) {
    await prisma.locationCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        order: cat.order
      }
    });
  }

  // 4. Standard Items
  for (const item of data.items || []) {
    const locationIds = (item.locations || []).map(l => ({ id: l.id }));
    await prisma.standardItem.upsert({
      where: {
        name_spec: {
          name: item.name,
          spec: item.spec || ''
        }
      },
      update: {
        defaultCbm: item.defaultCbm,
        defaultInnerCbm: item.defaultInnerCbm,
        locations: {
          connect: locationIds
        }
      },
      create: {
        id: item.id,
        name: item.name,
        spec: item.spec || '',
        defaultCbm: item.defaultCbm,
        defaultInnerCbm: item.defaultInnerCbm,
        locations: {
          connect: locationIds
        }
      }
    });
  }

  // 5. Vehicle Master
  for (const v of data.vehicles || []) {
    await prisma.vehicleMaster.upsert({
      where: { name: v.name },
      update: {
        defaultCost: v.defaultCost,
        maxCbm: v.maxCbm || 0
      },
      create: {
        id: v.id,
        name: v.name,
        defaultCost: v.defaultCost,
        maxCbm: v.maxCbm || 0
      }
    });
  }

  // 6. Labor Master
  for (const l of data.labors || []) {
    await prisma.laborMaster.upsert({
      where: { name: l.name },
      update: {
        defaultCost: l.defaultCost
      },
      create: {
        id: l.id,
        name: l.name,
        defaultCost: l.defaultCost
      }
    });
  }

  // 7. Estimates
  for (const est of data.estimates || []) {
    await prisma.estimate.upsert({
      where: { id: est.id },
      update: {},
      create: {
        id: est.id,
        movingType: est.movingType,
        customerName: est.customerName,
        contact: est.contact,
        fromAddress: est.fromAddress,
        toAddress: est.toAddress,
        estimateDate: new Date(est.estimateDate),
        movingDate: est.movingDate ? new Date(est.movingDate) : null,
        organizeDate: est.organizeDate ? new Date(est.organizeDate) : null,
        visitDate: est.visitDate ? new Date(est.visitDate) : null,
        cbmItems: est.cbmItems,
        materials: est.materials,
        assemblyItems: est.assemblyItems,
        environment: est.environment,
        paymentPlan: est.paymentPlan,
        adminHistory: est.adminHistory,
        signature: est.signature,
        movingCost: est.movingCost,
        storageCost: est.storageCost,
        storageDays: est.storageDays,
        additionalCost: est.additionalCost,
        vat: est.vat,
        totalAmount: est.totalAmount
      }
    });
  }

  console.log('데이터 마이그레이션 및 임포트가 성공적으로 완료되었습니다.');
}

importData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
