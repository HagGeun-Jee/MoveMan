const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- 팬트리선반 품목 등록 시작 ---');

  // 1. 카테고리 조회 (팬트리, 주방, 베란다)
  const categories = await prisma.locationCategory.findMany({
    where: {
      name: { in: ['팬트리', '주방', '베란다'] }
    }
  });
  console.log('매핑할 카테고리 목록:', categories.map(c => `${c.name}(${c.id})`));

  const categoryConnect = categories.map(c => ({ id: c.id }));

  // 2. 등록할 팬트리선반 품목 정의
  // 5단 1자, 5단 ㄴ자, 5단 ㄷ자
  const pantryItems = [
    {
      name: '팬트리선반',
      spec: '5단 1자형',
      defaultCbm: 0.3,
      defaultInnerCbm: 0.8,
    },
    {
      name: '팬트리선반',
      spec: '5단 ㄴ자형',
      defaultCbm: 0.6,
      defaultInnerCbm: 1.5,
    },
    {
      name: '팬트리선반',
      spec: '5단 ㄷ자형',
      defaultCbm: 1.0,
      defaultInnerCbm: 2.5,
    }
  ];

  for (const item of pantryItems) {
    const upserted = await prisma.standardItem.upsert({
      where: {
        name_spec: {
          name: item.name,
          spec: item.spec
        }
      },
      update: {
        defaultCbm: item.defaultCbm,
        defaultInnerCbm: item.defaultInnerCbm,
        locations: {
          set: categoryConnect
        }
      },
      create: {
        name: item.name,
        spec: item.spec,
        defaultCbm: item.defaultCbm,
        defaultInnerCbm: item.defaultInnerCbm,
        locations: {
          connect: categoryConnect
        }
      },
      include: {
        locations: true
      }
    });

    console.log(`등록/갱신 완료: [${upserted.name} / ${upserted.spec}] - 기본CBM: ${upserted.defaultCbm}, 내품CBM: ${upserted.defaultInnerCbm}, 연결위치: ${upserted.locations.map(l => l.name).join(', ')}`);
  }

  console.log('--- 팬트리선반 품목 등록 완료 ---');
}

main()
  .catch((e) => {
    console.error('오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
