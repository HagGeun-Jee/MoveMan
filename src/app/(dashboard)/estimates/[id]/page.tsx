import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { MapPin } from 'lucide-react'
import { PrintButton } from '@/components/PrintButton'
import { formatPhoneNumber } from '@/lib/format'

import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `컨택이사_${id}`
  }
}

export default async function EstimateViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const estimate = await prisma.estimate.findUnique({
    where: { id }
  })
  
  if (!estimate) {
    notFound()
  }

  const envObj = estimate.environment ? JSON.parse(estimate.environment) : {}
  const payPlanObj = estimate.paymentPlan ? JSON.parse(estimate.paymentPlan) : {}
  const rawItems = estimate.cbmItems ? JSON.parse(estimate.cbmItems) : []
  const items = Array.isArray(rawItems)
    ? rawItems.filter((item: any) => {
        const qty = item.quantity !== undefined ? Number(item.quantity) : 1
        const unitCbm = (Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)
        return unitCbm > 0 && qty > 0
      })
    : []
  const labors = envObj.labors || []
  const vehicles = envObj.vehicles || []

  // 사다리차 운임 세부 산출
  const ladderTotalCost = Number(envObj.ladderTotalCost) || 0
  const ladderFromCost = Number(envObj.ladderFromCost) || 0
  const ladderToCost = Number(envObj.ladderToCost) || 0
  const ladderTonnage = envObj.ladderTonnage || '5'

  // 거리가산 운임 세부 산출
  const distanceKm = Number(envObj.distance) || 0
  const baseDistanceKm = Number(envObj.baseDistanceKm) || 30
  const ratePerKm = Number(envObj.ratePerKm) || 2000
  const extraDistanceKm = (envObj.extraDistanceKm !== undefined && Number(envObj.extraDistanceKm) > 0)
    ? Number(envObj.extraDistanceKm) 
    : Math.max(0, Math.round((distanceKm - baseDistanceKm) * 10) / 10)
  const distanceExtraCost = (envObj.distanceExtraCost !== undefined && Number(envObj.distanceExtraCost) > 0)
    ? Number(envObj.distanceExtraCost) 
    : Math.round(extraDistanceKm * ratePerKm)

  const knownAddCost = ladderTotalCost + distanceExtraCost
  const otherAdditionalCost = Math.max(0, (estimate.additionalCost || 0) - knownAddCost)

  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    const locName = item.locationName || '기타/미지정'
    if (!acc[locName]) acc[locName] = []
    acc[locName].push(item)
    return acc
  }, {})

  // 각 위치별로 품목, 규격 순 가나다 정렬
  for (const locName in groupedItems) {
    groupedItems[locName].sort((a: any, b: any) => {
      const nameComp = (a.name || '').localeCompare(b.name || '', 'ko')
      if (nameComp !== 0) return nameComp
      return (a.spec || '').localeCompare(b.spec || '', 'ko')
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 print:max-w-none print:space-y-4 print:pb-0 print:m-0 print:pt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">견적 상세 - {estimate.id}</h1>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <Link href="/estimates" className="px-3.5 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm sm:text-base font-medium transition-colors border border-gray-300 shadow-sm">
            목록으로
          </Link>
          <Link href={`/estimates/${estimate.id}/edit`} className="px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors shadow-sm">
            수정하기
          </Link>
        </div>
      </div>

      {/* 인쇄용 헤더 */}
      <div className="hidden print:flex justify-between items-end border-b-2 border-gray-900 pb-4 mb-4">
        <div className="flex flex-col items-start">
          <img src="/esti_image.png" alt="Logo" className="h-8 object-contain mb-1" />
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-black">이사 견적서</h1>
          <p className="text-sm text-gray-700 font-semibold mt-1">견적번호: {estimate.id}</p>
        </div>
      </div>

      <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 print:p-0 print:border-none print:shadow-none print:space-y-4">
        {/* 기본 정보 및 주소/일정 */}
        <section>
          <div className="flex justify-between items-center border-b pb-2 mb-4 print:mb-2 print:pb-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-blue-600 print:text-base">기본 정보 및 주소/일정</h2>
              {envObj.distance ? (
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 print:hidden">
                  주행거리: {envObj.distance}km
                </span>
              ) : null}
            </div>
            {estimate.fromAddress && estimate.toAddress && (
              <a 
                href={`https://map.kakao.com/?sName=${encodeURIComponent(estimate.fromAddress)}&eName=${encodeURIComponent(estimate.toAddress)}`} 
                target="_blank" 
                rel="noreferrer" 
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 font-medium text-sm shadow-sm print:hidden"
              >
                <MapPin size={16}/> 경로 길찾기
              </a>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-300 print:text-xs min-w-[500px] print:min-w-0">
            <tbody>
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 w-1/4 sm:w-1/6 whitespace-nowrap">고객명</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900 w-1/4 sm:w-2/6">{estimate.customerName}</td>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 w-1/4 sm:w-1/6 whitespace-nowrap">연락처</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900 w-1/4 sm:w-2/6">{formatPhoneNumber(estimate.contact)}</td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">이사종류</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {estimate.movingType === 'P' ? '포장이사' : estimate.movingType === 'G' ? '일반이사' : '보관이사'}
                </td>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">접수일자</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {format(new Date(estimate.estimateDate), 'yyyy-MM-dd')}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">방문 견적일정</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {estimate.visitDate ? format(new Date(estimate.visitDate), 'yyyy-MM-dd HH:mm') : '-'}
                </td>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">이사 예정일</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {estimate.movingDate ? format(new Date(estimate.movingDate), 'yyyy-MM-dd') : '-'}
                </td>
              </tr>
              {estimate.movingType === 'K' && (
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">정리 예정일(보관)</th>
                  <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                    {estimate.organizeDate ? format(new Date(estimate.organizeDate), 'yyyy-MM-dd') : '-'}
                  </td>
                  <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">정리 여부</th>
                  <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                    {envObj.organizeStatus || '-'}
                  </td>
                </tr>
              )}
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">출발지</th>
                <td colSpan={3} className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>{estimate.fromAddress || '-'}</span>
                    {(envObj.fromFloor || (envObj.fromWorkTypes && envObj.fromWorkTypes.length > 0)) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal">
                        {envObj.fromFloor && (
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold border border-gray-300 print:bg-transparent print:border-none print:px-0">
                            {envObj.fromFloor}층
                          </span>
                        )}
                        {envObj.fromWorkTypes?.map((type: string) => (
                          <span key={type} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200 print:bg-transparent print:border print:border-gray-400 print:text-black">
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">도착지</th>
                <td colSpan={3} className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>{estimate.toAddress || '-'}</span>
                    {(envObj.toFloor || (envObj.toWorkTypes && envObj.toWorkTypes.length > 0)) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal">
                        {envObj.toFloor && (
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold border border-gray-300 print:bg-transparent print:border-none print:px-0">
                            {envObj.toFloor}층
                          </span>
                        )}
                        {envObj.toWorkTypes?.map((type: string) => (
                          <span key={type} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-200 print:bg-transparent print:border print:border-gray-400 print:text-black">
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              {(envObj.ladderTotalCost > 0 || envObj.fromWorkTypes?.includes('사다리차') || envObj.toWorkTypes?.includes('사다리차')) && (
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">사다리차</th>
                  <td colSpan={3} className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-amber-700 font-bold">
                          {envObj.ladderTotalCost ? `${Number(envObj.ladderTotalCost).toLocaleString()} 원` : '작업 포함'}
                        </span>
                        <span className="text-xs text-gray-600 font-normal">
                          ({envObj.ladderTonnage || '5'}톤 기준
                          {envObj.ladderFromCost ? ` · 출발지: ${Number(envObj.ladderFromCost).toLocaleString()}원` : ''}
                          {envObj.ladderToCost ? ` · 도착지: ${Number(envObj.ladderToCost).toLocaleString()}원` : ''})
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        표준 운임표 적용
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-3 py-2 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">이동 거리</th>
                <td colSpan={3} className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base text-blue-700 font-bold">
                        {distanceKm > 0 ? `${distanceKm} km` : (envObj.distance ? `${envObj.distance} km` : '-')}
                      </span>
                      {envObj.distanceDuration && (
                        <span className="text-xs text-gray-600 font-normal">
                          ({envObj.distanceDuration})
                        </span>
                      )}
                      {distanceExtraCost > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          거리가산운임 {distanceExtraCost.toLocaleString()}원 (+{extraDistanceKm}km 초과)
                        </span>
                      )}
                    </div>
                    {estimate.fromAddress && estimate.toAddress && (
                      <a 
                        href={`https://map.kakao.com/?sName=${encodeURIComponent(estimate.fromAddress)}&eName=${encodeURIComponent(estimate.toAddress)}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 inline-flex items-center gap-1 font-medium text-xs shadow-sm print:hidden"
                      >
                        <MapPin size={13}/> 카카오맵 경로보기
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </section>

        {/* 물품 및 작업 환경 */}
        <section>
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2 mb-4 print:mb-2 print:pb-1 print:text-base">물품 및 작업 환경</h2>
          <div className="space-y-6 print:space-y-3">
            <div>
              <h3 className="font-medium text-gray-900 mb-2 print:mb-1">산출 물품 목록 (총 {items.reduce((acc: number, item: any) => acc + ((Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)) * (item.quantity !== undefined ? Number(item.quantity) : 1), 0).toFixed(2)} CBM)</h3>
              {items.length > 0 ? (
                <div className="space-y-4 print:space-y-2">
                  {Object.entries(groupedItems).map(([locName, catItems]: [string, any]) => (
                    <div key={locName} className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-300">
                      <div className="bg-blue-50/80 px-4 py-2.5 font-bold text-gray-900 flex justify-between items-center border-b border-blue-100 print:bg-gray-100 print:border-gray-300 print:py-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-blue-600 rounded-sm inline-block print:hidden"></span>
                          <span className="text-gray-900 font-bold">{locName}</span>
                        </div>
                        <span className="text-sm font-bold text-blue-700 bg-white/90 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs print:bg-transparent print:border-none print:p-0 print:text-black">
                          {catItems.reduce((acc: number, item: any) => acc + ((Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)) * (item.quantity !== undefined ? Number(item.quantity) : 1), 0).toFixed(2)} CBM
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left print:text-xs min-w-[480px] print:min-w-0">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 print:bg-transparent">
                          <tr>
                            <th className="px-4 py-2 print:px-2 print:py-1">품목</th>
                            <th className="px-4 py-2 print:px-2 print:py-1">규격</th>
                            <th className="px-4 py-2 text-right w-20 print:px-2 print:py-1">수량</th>
                            <th className="px-4 py-2 text-right w-24 print:px-2 print:py-1">기본 CBM</th>
                            <th className="px-4 py-2 text-right w-24 print:px-2 print:py-1">추가 CBM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 print:divide-gray-200">
                          {catItems.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2 font-bold text-gray-900 print:px-2 print:py-1">{item.name}</td>
                              <td className="px-4 py-2 text-gray-800 font-medium print:px-2 print:py-1">{item.spec || '-'}</td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-900 print:px-2 print:py-1">{item.quantity !== undefined ? item.quantity : 1}</td>
                              <td className="px-4 py-2 text-right text-gray-900 font-medium print:px-2 print:py-1">{item.cbm}</td>
                              <td className="px-4 py-2 text-right text-gray-900 font-medium print:px-2 print:py-1">{item.innerBoxCbm}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">등록된 물품이 없습니다.</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4 print:text-xs">
              <div>
                <h3 className="font-medium text-gray-900 mb-2 print:mb-1">투입 인력</h3>
                {labors.length > 0 ? (
                  <ul className="text-sm space-y-1">
                    {labors.map((labor: any, idx: number) => (
                      <li key={idx} className="flex justify-between border-b pb-1">
                        <span>{labor.name}</span>
                        <span className="font-semibold">{labor.count} 명</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">등록된 인력이 없습니다.</div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">투입 차량</h3>
                {vehicles.length > 0 ? (
                  <ul className="text-sm space-y-1">
                    {vehicles.map((vehicle: any, idx: number) => (
                      <li key={idx} className="flex justify-between border-b pb-1">
                        <span>{vehicle.name}</span>
                        <span className="font-semibold">{vehicle.count} 대</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">등록된 차량이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 이사 비용 및 부가세 */}
        <section>
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2 mb-4 print:mb-2 print:pb-1 print:text-base">이사 비용 및 결제 플랜</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm print:gap-4 print:text-xs">
            <div className="space-y-2 print:space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-800 font-medium">기본 이사 비용</span>
                <span className="font-bold text-gray-900">{estimate.movingCost.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-gray-800 font-medium">가산비용 내역</span>
                  {(ladderTotalCost > 0 || distanceExtraCost > 0) && (
                    <span className="text-xs text-gray-500 font-normal">
                      ({[
                        ladderTotalCost > 0 ? `사다리차 ${ladderTotalCost.toLocaleString()}원` : null,
                        distanceExtraCost > 0 ? `거리가산 ${distanceExtraCost.toLocaleString()}원` : null,
                        otherAdditionalCost > 0 ? `기타 ${otherAdditionalCost.toLocaleString()}원` : null,
                      ].filter(Boolean).join(' + ')})
                    </span>
                  )}
                </div>
                <span className="font-bold text-gray-900">{estimate.additionalCost.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-800 font-medium">보관 비용</span>
                <span className="font-bold text-gray-900">{estimate.storageCost.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-800 font-medium">부가세</span>
                <span className="font-bold text-gray-900">{estimate.vat.toLocaleString()} 원</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold text-blue-900">
                <span>총 합계 (공급대가)</span>
                <span>{estimate.totalAmount.toLocaleString()} 원</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-3 print:bg-transparent print:p-0 print:border print:border-gray-300 print:p-3 print:space-y-2">
              <div className="font-bold text-gray-900 border-b border-gray-200 pb-2 print:mb-1 print:pb-1 flex justify-between items-center">
                <span>결제 플랜</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  {payPlanObj.targetType === 'supply' ? '공급가액 기준' : '공급대가 기준'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200 print:bg-transparent">
                    <tr>
                      <th className="px-2.5 py-1.5 text-left whitespace-nowrap">구분</th>
                      <th className="px-2.5 py-1.5 text-right whitespace-nowrap">금액</th>
                      <th className="px-2.5 py-1.5 text-center whitespace-nowrap">일자</th>
                      <th className="px-2.5 py-1.5 text-center whitespace-nowrap">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-2.5 py-1.5 font-bold text-gray-800 whitespace-nowrap">계약금</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {Number(payPlanObj.downPayment || 0).toLocaleString()} 원
                      </td>
                      <td className="px-2.5 py-1.5 text-center text-gray-700 whitespace-nowrap">
                        {payPlanObj.downPaymentDate || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                        {payPlanObj.downPaymentPaid ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-900 text-xs rounded font-bold border border-green-300">입금완료</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium border border-gray-300">미입금</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 font-bold text-gray-800 whitespace-nowrap">중도금</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {Number(payPlanObj.intermediatePayment || 0).toLocaleString()} 원
                      </td>
                      <td className="px-2.5 py-1.5 text-center text-gray-700 whitespace-nowrap">
                        {payPlanObj.intermediateDate || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                        {payPlanObj.intermediatePaymentPaid ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-900 text-xs rounded font-bold border border-green-300">입금완료</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium border border-gray-300">미입금</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 font-bold text-gray-800 whitespace-nowrap">잔금</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {Number(payPlanObj.balance || 0).toLocaleString()} 원
                      </td>
                      <td className="px-2.5 py-1.5 text-center text-gray-700 whitespace-nowrap">
                        {payPlanObj.balanceDate || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                        {payPlanObj.balancePaid ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-900 text-xs rounded font-bold border border-green-300">입금완료</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium border border-gray-300">미입금</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-xs sm:text-sm">
                <span className="text-gray-800">미할당 잔액</span>
                <span className={`${payPlanObj.remainingAmount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(payPlanObj.remainingAmount || 0).toLocaleString()} 원
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 서명란 */}
        {estimate.signature && (
          <section className="mt-8 print:mt-6 flex justify-end">
            <div className="text-center w-48 border border-gray-200 rounded-lg p-2 print:border-none print:p-0">
              <div className="text-sm font-bold text-gray-700 border-b pb-1 mb-2 print:border-b-2 print:border-gray-800">고객 확인 및 서명</div>
              <img src={estimate.signature} alt="고객 서명" className="w-full h-20 object-contain" />
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
