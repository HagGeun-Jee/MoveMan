import React from 'react'
import { getCostStandards } from '@/app/actions/costStandards'
import CostStandardsForm from './CostStandardsForm'
import { Coins, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CostStandardsPage() {
  const costStandards = await getCostStandards()

  return (
    <div className="space-y-6">
      {/* 헤더 카드 */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              원가 기준정보 설정
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                마스터 기준단가
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              이사 원가(인건비/유류비/통행료/자재비) 산출 및 마진율 관리를 위한 기초 단가입니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/60 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>견적 작성 시 실시간 자동 반영</span>
        </div>
      </div>

      {/* 폼 본체 */}
      <CostStandardsForm initialData={costStandards} />
    </div>
  )
}
