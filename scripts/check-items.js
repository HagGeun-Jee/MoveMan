const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const items = await prisma.standardItem.findMany({
    include: { locations: true },
    orderBy: [{ name: 'asc' }, { spec: 'asc' }]
  });
  const categories = await prisma.locationCategory.findMany({
    include: { items: true },
    orderBy: { order: 'asc' }
  });

  console.log('=== 1. 기본 현황 통계 ===');
  console.log('총 등록 물품 품목/규격 수:', items.length);
  const uniqueNames = Array.from(new Set(items.map(i => i.name)));
  console.log('고유 품목명 수:', uniqueNames.length);
  console.log('등록된 공간(카테고리) 수:', categories.length, categories.map(c => `${c.name}(${c.items.length})`).join(', '));

  console.log('\n=== 2. 위치 미지정(비어있는) 물품 ===');
  const noLoc = items.filter(i => !i.locations || i.locations.length === 0);
  console.log(`위치 미지정 물품 (${noLoc.length}개):`);
  noLoc.forEach(i => console.log(` - ${i.name} [규격: ${i.spec || '없음'}] (CBM: ${i.defaultCbm})`));

  console.log('\n=== 3. CBM 관련 이상치 점검 ===');
  const zeroCbm = items.filter(i => i.defaultCbm === 0 && i.defaultInnerCbm === 0);
  console.log(`기본 CBM 및 내품 CBM이 둘 다 0인 품목 (${zeroCbm.length}개):`);
  zeroCbm.forEach(i => console.log(` - ${i.name} [규격: ${i.spec || '없음'}]`));

  console.log('\n=== 4. 품목명 중복/유사어 점검 ===');
  // 품목명이 쪼개져 있거나 유사한 것 (예: 안마 vs 안마의자, 세탁기 vs 세탁기-건조기 등)
  uniqueNames.forEach(name1 => {
    uniqueNames.forEach(name2 => {
      if (name1 !== name2 && name1.length > 1 && name2.length > 1) {
        if (name1.includes(name2) && name1.length > name2.length) {
          console.log(` - 유사 품목명 발견: [${name2}] vs [${name1}]`);
        }
      }
    });
  });

  console.log('\n=== 5. 위치 카테고리 명칭과 실제 평형 템플릿과의 불일치 점검 ===');
  // 카테고리 이름들 (예: 방1, 방2 vs 침실2, 침실3 등)
  console.log('현재 카테고리 목록:', categories.map(c => c.name));

  console.log('\n=== 6. 주요 생활 필수 가전/가구 누락 여부 점검 ===');
  const commonHouseholdItems = [
    'TV', '냉장고', '김치냉장고', '세탁기', '건조기', '에어컨', '공기청정기', '청소기',
    '전자레인지', '전기밥솥', '식기세척기', '인덕션', '오븐', '정수기', '비데',
    '침대', '매트리스', '장롱', '옷장', '서랍장', '화장대', '행거',
    '소파', '거실장', 'TV장', '테이블', '식탁', '식탁의자', '책상', '책장', '책상의자',
    '신발장', '베란다선반', '팬트리', '빨래건조대', '빨래바구니',
    '운동기구', '자전거', '유모차', '캠핑용품', '골프백', '여행용캐리어', '캣타워', '반려동물용품'
  ];
  const missingCommon = commonHouseholdItems.filter(ci => !uniqueNames.some(un => un.includes(ci) || ci.includes(un)));
  console.log('미등록 또는 명칭 상이 가능성이 있는 일반 가구/가전/잡화:', missingCommon);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
