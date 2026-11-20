import Link from 'next/link'

export default function SmallMoveLanding() {
  return (
    <div className="space-y-6 pt-6">
      <div className="text-center space-y-3">
        <div className="text-5xl">🚚</div>
        <p className="text-sm font-black text-blue-700">톡톡용달이사</p>
        <h1 className="text-2xl font-black leading-tight">
          원룸·투룸 이사
          <br />
          3분이면 예상 견적 확인
        </h1>
        <p className="text-sm text-slate-600">
          물품만 체크하고 사진을 올려 주세요.
          <br />
          예상 견적을 바로 보여드리고, 사진 확인 후 확정 견적을 문자로 보내드립니다.
        </p>
      </div>

      <Link
        href="/s/request"
        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl py-4 shadow"
      >
        견적 받아보기
      </Link>

      <ol className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-sm">
        {[
          ['1', '이사 정보와 출발·도착 주소 입력'],
          ['2', '그림을 보며 짐 체크 (헷갈리면 ⓘ 예시 확인)'],
          ['3', '큰 가구·현관/계단 사진 올리기'],
          ['4', '예상 견적 확인 → 담당자 확정 후 문자 안내'],
        ].map(([n, t]) => (
          <li key={n} className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
              {n}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        올려주신 사진은 견적 확인 용도로만 사용되며,
        <br />
        이사일 2주 후 자동으로 삭제됩니다.
      </p>

      <div className="text-center">
        <Link href="/s/check" className="text-sm font-bold text-blue-700 underline">
          접수 내역 / 확정 견적 조회
        </Link>
      </div>
    </div>
  )
}
