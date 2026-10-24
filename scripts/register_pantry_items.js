const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- 팬트리선반 기본 CBM 0 (붙박이 기준) 수정 시작 ---');

  // 팬트리는 붙박이 시공이 대부분이므로, 
  // 선반 자체를 떼어가지 않으므로 기본 CBM(선반 체적)은 0으로 하고,
  // 오직 선반에 수납된 식료품/주방잡화 짐(내품 CBM)만 실적재량으로 계산되도록 수정
  const pantryItems = [
    {
      name: '팬트리선반',
      spec: '5단 1자형',
      defaultCbm: 0,
      defaultInnerCbm: 0.8,
    },
    {
      name: '팬트리선반',
      spec: '5단 ㄴ자형',
      defaultCbm: 0,
      defaultInnerCbm: 1.5,
    },
    {
      name: '팬트리선반',
      spec: '5단 ㄷ자형',
      defaultCbm: 0,
      defaultInnerCbm: 2.5,
    }
  ];

  for (const item of pantryItems) {
    const updated = await prisma.standardItem.update({
      where: {
        name_spec: {
          name: item.name,
          spec: item.spec
        }
      },
      data: {
        defaultCbm: item.defaultCbm,
        defaultInnerCbm: item.defaultInnerCbm,
      }
    });

    console.log(`수정 완료: [${updated.name} / ${updated.spec}] - 기본CBM: ${updated.defaultCbm} (붙박이), 내품CBM: ${updated.defaultInnerCbm}`);
  }

  console.log('--- 팬트리선반 CBM 수정 완료 ---');
}

main()
  .catch((e) => {
    console.error('오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
