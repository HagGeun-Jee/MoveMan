import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { MapPin, Phone } from 'lucide-react'
import { PrintButton } from '@/components/PrintButton'
import { formatPhoneNumber } from '@/lib/format'
import { EstimateContractItemsView } from '@/components/EstimateContractItemsView'

import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `컨택이사_${id}`
  }
}

const isBaseCbmExcluded = (treatment?: string): boolean => 
  treatment === '폐기' || treatment === '내림' || treatment === '존치'

const getItemEffectiveCbm = (item: any): number => {
  const qty = item.quantity !== undefined ? Number(item.quantity) : 1
  const baseCbm = isBaseCbmExcluded(item.treatment) ? 0 : (Number(item.cbm) || 0)
  const innerCbm = Number(item.innerBoxCbm) || 0
  return (baseCbm + innerCbm) * qty
}

export default async function EstimateViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const [estimate, locationCategories] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id }
    }),
    prisma.locationCategory.findMany({
      orderBy: { order: 'asc' }
    })
  ])
  
  if (!estimate) {
    notFound()
  }

  const safeJsonParse = (str: string | null | undefined, fallback: any = {}): any => {
    if (!str || str === 'null' || str === 'undefined') return fallback
    try {
      const parsed = JSON.parse(str)
      return parsed && typeof parsed === 'object' ? parsed : fallback
    } catch {
      return fallback
    }
  }

  const envObj = safeJsonParse(estimate.environment, {})
  const specialNotes = typeof envObj.specialNotes === 'string' ? envObj.specialNotes.trim() : ''
  const payPlanObj = safeJsonParse(estimate.paymentPlan, {})
  const rawItems = safeJsonParse(estimate.cbmItems, [])
  const items = Array.isArray(rawItems)
    ? rawItems.filter((item: any) => {
        const qty = item.quantity !== undefined ? Number(item.quantity) : 1
        const unitCbm = (Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)
        return unitCbm > 0 && qty > 0
      })
    : []
  const labors = Array.isArray(envObj.labors) ? envObj.labors : []
  const vehicles = Array.isArray(envObj.vehicles) ? envObj.vehicles : []

  // 사다리차 운임 세부 산출
  const ladderTotalCost = Number(envObj.ladderTotalCost) || 0
  const ladderFromCost = Number(envObj.ladderFromCost) || 0
  const ladderToCost = Number(envObj.ladderToCost) || 0
  const ladderTonnage = envObj.ladderTonnage || '5'

  // 거리가산 운임 세부 산출
  const distanceKm = Number(envObj.distance) || 0
  const baseDistanceKm = Number(envObj.baseDistanceKm) || 30
  const ratePerKm = Number(envObj.ratePerKm) || 1800
  const extraDistanceKm = (envObj.extraDistanceKm !== undefined && Number(envObj.extraDistanceKm) > 0)
    ? Number(envObj.extraDistanceKm) 
    : Math.max(0, Math.round((distanceKm - baseDistanceKm) * 10) / 10)
  const distanceExtraCost = (envObj.distanceExtraCost !== undefined && Number(envObj.distanceExtraCost) > 0)
    ? Number(envObj.distanceExtraCost) 
    : Math.round(extraDistanceKm * ratePerKm)

  const knownAddCost = ladderTotalCost + distanceExtraCost
  const otherAdditionalCost = Math.max(0, (estimate.additionalCost || 0) - knownAddCost)

  const locationOrderMap: Record<string, number> = {}
  locationCategories.forEach((cat, index) => {
    locationOrderMap[cat.name] = index
  })

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

  // 위치(카테고리) 추천 순서 정렬
  const sortedGroupedItems = Object.entries(groupedItems).sort(([locA], [locB]) => {
    const isAOther = locA === '기타/미지정' || !locA
    const isBOther = locB === '기타/미지정' || !locB
    if (isAOther && !isBOther) return 1
    if (!isAOther && isBOther) return -1
    if (isAOther && isBOther) return 0

    const rankA = locationOrderMap[locA] !== undefined ? locationOrderMap[locA] : 999
    const rankB = locationOrderMap[locB] !== undefined ? locationOrderMap[locB] : 999
    if (rankA !== rankB) return rankA - rankB
    return locA.localeCompare(locB, 'ko')
  })

  const totalCbm = items.reduce((acc: number, item: any) => acc + getItemEffectiveCbm(item), 0)

  const treatmentSummary = items.reduce((acc: Record<string, number>, it: any) => {
    const t = it.treatment || '이동'
    const q = Number(it.quantity) || 1
    if (t !== '이동') {
      acc[t] = (acc[t] || 0) + q
    }
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 print:max-w-none print:space-y-2.5 print:pb-0 print:m-0 print:pt-0">
      {/* A4 1페이지 인쇄 최적화 스타일 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `
      }} />

      {/* 상단 액션 바 (태블릿 및 모바일 한 줄 최적화, 인쇄 시 숨김) */}
      <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-gray-200/80 shadow-xs print:hidden">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-black text-gray-900 whitespace-nowrap">
            견적·계약서 상세
          </h1>
          <span className="text-xs sm:text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0">
            {estimate.id}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PrintButton />
          <Link 
            href="/estimates" 
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-bold transition-all border border-gray-300 shadow-xs shrink-0 whitespace-nowrap"
          >
            목록으로
          </Link>
          <Link 
            href={`/estimates/${estimate.id}/edit`} 
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0 whitespace-nowrap"
          >
            수정하기
          </Link>
        </div>
      </div>

      {/* 본문: 견적서 겸 계약서 통합 문서 프레임 */}
      <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 space-y-4 print:p-0 print:border-none print:shadow-none print:space-y-2.5">
        
        {/* 문서 타이틀 헤더 (화면 + 인쇄 겸용 계약서 스타일) */}
        <div className="flex justify-between items-end border-b-2 border-gray-900 pb-2.5 print:pb-2">
          <div className="flex flex-col items-start gap-1">
            <img src="/esti_image.png" alt="Logo" className="h-7 sm:h-8 print:h-7 object-contain" />
            <span className="text-[11px] text-gray-500 font-medium hidden print:inline">
              신뢰와 정성의 포장이사 전문기업
            </span>
          </div>
          <div className="text-right">
            <h1 className="text-lg sm:text-2xl print:text-xl font-black tracking-tight text-gray-900">
              이사 견적서 및 계약서
            </h1>
            <p className="text-xs sm:text-sm print:text-xs text-gray-600 font-semibold mt-0.5">
              문서번호: <span className="font-mono font-bold text-gray-900">{estimate.id}</span>
            </p>
          </div>
        </div>

        {/* 1. 계약 기본 정보 · 작업환경 · 투입인원/차량 통합 표 */}
        <section className="print:break-inside-avoid">
          <div className="flex justify-between items-center mb-1.5 print:mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base print:text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-600 rounded-xs inline-block" />
                <span>1. 계약 기본사항 및 작업환경</span>
              </h2>
              {envObj.distance ? (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 print:hidden">
                  주행거리: {envObj.distance}km
                </span>
              ) : null}
            </div>
            {estimate.fromAddress && estimate.toAddress && (
              <a 
                href={`https://map.kakao.com/?sName=${encodeURIComponent(estimate.fromAddress)}&eName=${encodeURIComponent(estimate.toAddress)}`} 
                target="_blank" 
                rel="noreferrer" 
                className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 font-bold text-xs shadow-2xs print:hidden"
              >
                <MapPin size={13}/> 경로 길찾기
              </a>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse border border-gray-300 print:border-gray-400 print:text-[11px] min-w-[500px] print:min-w-0">
              <tbody>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 w-1/6 whitespace-nowrap">고객명</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-bold text-gray-900 w-2/6">{estimate.customerName}</td>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 w-1/6 whitespace-nowrap">연락처</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900 w-2/6">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
                      <span>{formatPhoneNumber(estimate.contact)}</span>
                      {estimate.contact && (
                        <a
                          href={`tel:${estimate.contact.replace(/[^0-9]/g, '')}`}
                          className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-300 transition-colors shrink-0"
                          title="고객에게 전화 걸기"
                        >
                          <Phone size={11} className="text-emerald-600" />
                          <span>통화</span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">이사종류</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-bold text-blue-800 print:text-black">
                    {estimate.movingType === 'P' ? '포장이사' : estimate.movingType === 'G' ? '일반이사' : '보관이사'}
                    {estimate.movingType === 'K' && envObj.organizeStatus ? ` (${envObj.organizeStatus})` : ''}
                  </td>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">접수 / 방문일</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900">
                    <span>접수: {format(new Date(estimate.estimateDate), 'yyyy-MM-dd')}</span>
                    {estimate.visitDate && (
                      <span className="text-gray-600 ml-1.5">
                        (방문: {format(new Date(estimate.visitDate), 'MM-dd HH:mm')})
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">이사 예정일</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-extrabold text-gray-900">
                    {estimate.movingDate ? format(new Date(estimate.movingDate), 'yyyy-MM-dd') : '-'}
                    {estimate.movingType === 'K' && estimate.organizeDate && (
                      <span className="text-xs text-gray-600 font-normal ml-1.5">
                        (정리일: {format(new Date(estimate.organizeDate), 'yyyy-MM-dd')})
                      </span>
                    )}
                  </td>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">이동 거리</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-blue-700 print:text-black">
                        {distanceKm > 0 ? `${distanceKm} km` : (envObj.distance ? `${envObj.distance} km` : '-')}
                      </span>
                      {envObj.distanceDuration && (
                        <span className="text-xs print:text-[10px] text-gray-500 font-normal">
                          ({envObj.distanceDuration})
                        </span>
                      )}
                      {distanceExtraCost > 0 && (
                        <span className="text-[11px] print:text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 print:bg-transparent print:border-gray-400 print:text-black">
                          +{extraDistanceKm}km ({distanceExtraCost.toLocaleString()}원)
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">출발지</th>
                  <td colSpan={3} className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span>{estimate.fromAddress || '-'}</span>
                      {(envObj.fromFloor || (envObj.fromWorkTypes && envObj.fromWorkTypes.length > 0)) ? (
                        <div className="flex flex-wrap items-center gap-1 text-xs print:text-[10.5px] font-normal shrink-0">
                          {envObj.fromFloor && (
                            <span className="bg-gray-100 text-gray-800 px-1.5 py-0.2 rounded font-bold border border-gray-300">
                              {envObj.fromFloor}층
                            </span>
                          )}
                          {envObj.fromWorkTypes?.map((type: string) => (
                            <span key={type} className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold border border-blue-200 print:bg-transparent print:border-gray-400 print:text-black">
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">도착지</th>
                  <td colSpan={3} className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span>{estimate.toAddress || '-'}</span>
                      {(envObj.toFloor || (envObj.toWorkTypes && envObj.toWorkTypes.length > 0)) ? (
                        <div className="flex flex-wrap items-center gap-1 text-xs print:text-[10.5px] font-normal shrink-0">
                          {envObj.toFloor && (
                            <span className="bg-gray-100 text-gray-800 px-1.5 py-0.2 rounded font-bold border border-gray-300">
                              {envObj.toFloor}층
                            </span>
                          )}
                          {envObj.toWorkTypes?.map((type: string) => (
                            <span key={type} className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold border border-blue-200 print:bg-transparent print:border-gray-400 print:text-black">
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">투입 인력</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900">
                    {labors.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {labors.map((l: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs print:text-[10.5px] print:px-1.5 print:py-0">
                            <span>{l.name}</span>
                            <strong className="text-blue-700 print:text-black">{l.count}명</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">미지정</span>
                    )}
                  </td>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">투입 차량</th>
                  <td className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900">
                    {vehicles.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {vehicles.map((v: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs print:text-[10.5px] print:px-1.5 print:py-0">
                            <span>{v.name}</span>
                            <strong className="text-blue-700 print:text-black">{v.count}대</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">미지정</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap">사다리차</th>
                  <td colSpan={3} className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 font-semibold text-gray-900">
                    {(ladderTotalCost > 0 || envObj.fromWorkTypes?.includes('사다리차') || envObj.toWorkTypes?.includes('사다리차')) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-amber-700 print:text-black font-bold">
                          {ladderTotalCost ? `${ladderTotalCost.toLocaleString()} 원` : '작업 포함'}
                        </span>
                        <span className="text-xs print:text-[10.5px] text-gray-600 font-normal">
                          ({ladderTonnage}톤 기준
                          {ladderFromCost ? ` · 출발지: ${ladderFromCost.toLocaleString()}원` : ''}
                          {ladderToCost ? ` · 도착지: ${ladderToCost.toLocaleString()}원` : ''})
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 font-normal text-xs print:text-[10.5px]">
                        사다리차 미사용 (엘리베이터 / 계단 / 수작업)
                      </span>
                    )}
                  </td>
                </tr>
                {specialNotes && (
                  <tr>
                    <th className="border border-gray-300 bg-amber-50/80 print:bg-gray-100 px-2.5 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-900 whitespace-nowrap align-top">특기사항</th>
                    <td colSpan={3} className="border border-gray-300 px-2.5 py-1.5 print:px-2 print:py-1 text-gray-900 whitespace-pre-wrap break-words leading-snug">
                      {specialNotes}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 이삿날 배차 확정 현황 (배정된 호차 또는 담당 팀장이 있을 때 표시) */}
          {envObj.dispatch && (
            (Array.isArray(envObj.dispatch.assignedVehicles) && envObj.dispatch.assignedVehicles.length > 0) ||
            envObj.dispatch.teamLeader
          ) && (
            <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-transparent print:border-gray-300 print:p-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold print:bg-transparent print:text-black print:border print:border-black">
                  배차 확정
                </span>
                {Array.isArray(envObj.dispatch.assignedVehicles) &&
                  envObj.dispatch.assignedVehicles.map((av: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-950 text-xs print:text-[10.5px] font-extrabold"
                    >
                      🚛 {av.name} {av.vehicleNo ? `[${av.vehicleNo}]` : ''}
                    </span>
                  ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs print:text-[10.5px]">
                {envObj.dispatch.teamLeader && (
                  <span className="font-extrabold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200 print:bg-transparent print:border-gray-300 print:text-black">
                    👤 담당 팀장: {envObj.dispatch.teamLeader}
                    {envObj.dispatch.leaderPhone ? ` (${formatPhoneNumber(envObj.dispatch.leaderPhone)})` : ''}
                  </span>
                )}
                {envObj.dispatch.dispatchMemo && (
                  <span className="text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">
                    📝 {envObj.dispatch.dispatchMemo}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 2. 산출 물품 명세 (계약서 요약형 기본 + 상세 표 전환 지원) */}
        <section>
          <div className="flex items-center gap-1.5 mb-1.5 print:mb-1">
            <span className="w-1.5 h-4 bg-blue-600 rounded-xs inline-block" />
            <h2 className="text-sm sm:text-base print:text-xs font-extrabold text-gray-900">
              2. 산출 물품 명세
            </h2>
          </div>
          {items.length > 0 ? (
            <EstimateContractItemsView
              sortedGroupedItems={sortedGroupedItems}
              totalCbm={totalCbm}
              treatmentSummary={treatmentSummary}
            />
          ) : (
            <div className="text-xs sm:text-sm text-gray-500 p-3 border border-gray-200 rounded-lg">
              등록된 물품이 없습니다.
            </div>
          )}
        </section>

        {/* 3. 이사 비용 및 결제 플랜 (좌우 2단 계약 금액표) */}
        <section className="print:break-inside-avoid">
          <div className="flex items-center gap-1.5 mb-1.5 print:mb-1">
            <span className="w-1.5 h-4 bg-blue-600 rounded-xs inline-block" />
            <h2 className="text-sm sm:text-base print:text-xs font-extrabold text-gray-900">
              3. 계약 금액 및 결제 플랜
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 print:gap-2.5 text-xs sm:text-sm print:text-[11px]">
            {/* 좌측: 비용 명세표 */}
            <div className="border border-gray-300 print:border-gray-400 rounded-lg print:rounded-none overflow-hidden bg-white flex flex-col justify-between">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-gray-200 print:divide-gray-300">
                  <tr>
                    <th className="bg-gray-100 px-3 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-800 w-1/3">기본 이사 비용</th>
                    <td className="px-3 py-1.5 print:px-2 print:py-1 text-right font-bold text-gray-900">
                      {estimate.movingCost.toLocaleString()} 원
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-gray-100 px-3 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-800">
                      <div>가산 비용</div>
                      {(ladderTotalCost > 0 || distanceExtraCost > 0) && (
                        <div className="text-[10px] font-normal text-gray-500">
                          {[
                            ladderTotalCost > 0 ? `사다리차 ${ladderTotalCost.toLocaleString()}` : null,
                            distanceExtraCost > 0 ? `거리 ${distanceExtraCost.toLocaleString()}` : null,
                            otherAdditionalCost > 0 ? `기타 ${otherAdditionalCost.toLocaleString()}` : null,
                          ].filter(Boolean).join(' + ')}
                        </div>
                      )}
                    </th>
                    <td className="px-3 py-1.5 print:px-2 print:py-1 text-right font-bold text-gray-900">
                      {estimate.additionalCost.toLocaleString()} 원
                    </td>
                  </tr>
                  {estimate.storageCost > 0 && (
                    <tr>
                      <th className="bg-gray-100 px-3 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-800">보관 비용</th>
                      <td className="px-3 py-1.5 print:px-2 print:py-1 text-right font-bold text-gray-900">
                        {estimate.storageCost.toLocaleString()} 원
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th className="bg-gray-100 px-3 py-1.5 print:px-2 print:py-1 text-left font-bold text-gray-800">부가세 (VAT)</th>
                    <td className="px-3 py-1.5 print:px-2 print:py-1 text-right font-bold text-gray-900">
                      {estimate.vat.toLocaleString()} 원
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-blue-50/80 print:bg-gray-100 border-t-2 border-gray-300 px-3 py-2 print:px-2 print:py-1.5 flex justify-between items-center font-black text-sm sm:text-base print:text-xs text-blue-950 print:text-black">
                <span>총 합계 (공급대가)</span>
                <span className="text-base sm:text-lg print:text-sm">{estimate.totalAmount.toLocaleString()} 원</span>
              </div>
            </div>
            
            {/* 우측: 결제 플랜표 */}
            <div className="border border-gray-300 print:border-gray-400 rounded-lg print:rounded-none overflow-hidden bg-white flex flex-col justify-between">
              <div>
                <div className="bg-gray-100 px-3 py-1.5 print:px-2 print:py-1 border-b border-gray-300 flex justify-between items-center font-bold text-gray-900">
                  <span>결제 플랜</span>
                  <span className="text-[11px] print:text-[10px] font-semibold px-1.5 py-0.2 bg-white text-blue-700 print:text-black rounded border border-blue-200 print:border-gray-400">
                    {payPlanObj.targetType === 'supply' ? '공급가액 기준' : '공급대가 기준'}
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-2.5 py-1 text-left whitespace-nowrap">구분</th>
                      <th className="px-2.5 py-1 text-right whitespace-nowrap">금액</th>
                      <th className="px-2.5 py-1 text-center whitespace-nowrap">예정일</th>
                      <th className="px-2.5 py-1 text-center whitespace-nowrap">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-2.5 py-1 font-bold text-gray-800 whitespace-nowrap">계약금</td>
                      <td className="px-2.5 py-1 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {Number(payPlanObj.downPayment || 0).toLocaleString()} 원
                      </td>
                      <td className="px-2.5 py-1 text-center text-gray-700 whitespace-nowrap">
                        {payPlanObj.downPaymentDate || '-'}
                      </td>
                      <td className="px-2.5 py-1 text-center whitespace-nowrap">
                        {payPlanObj.downPaymentPaid ? (
                          <span className="px-1.5 py-0.2 bg-green-100 text-green-900 text-[11px] print:text-[10px] rounded font-bold border border-green-300">입금완료</span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[11px] print:text-[10px] rounded font-medium border border-gray-300">미입금</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1 font-bold text-gray-800 whitespace-nowrap">중도금</td>
                      <td className="px-2.5 py-1 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {Number(payPlanObj.intermediatePayment || 0).toLocaleString()} 원
                      </td>
                      <td className="px-2.5 py-1 text-center text-gray-700 whitespace-nowrap">
                        {payPlanObj.intermediateDate || '-'}
                      </td>
                      <td className="px-2.5 py-1 text-center whitespace-nowrap">
                        {payPlanObj.intermediatePaymentPaid ? (
                          <span className="px-1.5 py-0.2 bg-green-100 text-green-900 text-[11px] print:text-[10px] rounded font-bold border border-green-300">입금완료</span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[11px] print:text-[10px] rounded font-medium border border-gray-300">미입금</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1 font-bold text-gray-800 whitespace-nowrap">잔금</td>
                      <td className="px-2.5 py-1 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {Number(payPlanObj.balance || 0).toLocaleString()} 원
                      </td>
                      <td className="px-2.5 py-1 text-center text-gray-700 whitespace-nowrap">
                        {payPlanObj.balanceDate || '-'}
                      </td>
                      <td className="px-2.5 py-1 text-center whitespace-nowrap">
                        {payPlanObj.balancePaid ? (
                          <span className="px-1.5 py-0.2 bg-green-100 text-green-900 text-[11px] print:text-[10px] rounded font-bold border border-green-300">입금완료</span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[11px] print:text-[10px] rounded font-medium border border-gray-300">미입금</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 print:px-2 print:py-1 flex justify-between font-bold text-xs print:text-[11px]">
                <span className="text-gray-700">미할당 잔액</span>
                <span className={`${payPlanObj.remainingAmount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(payPlanObj.remainingAmount || 0).toLocaleString()} 원
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. 계약 유의사항 및 고객 서명란 (인쇄 시 A4 하단 고정 어울림) */}
        <section className="pt-2 border-t border-gray-200 flex flex-col sm:flex-row print:flex-row items-stretch sm:items-end print:items-end justify-between gap-3 print:break-inside-avoid">
          <div className="text-[11px] print:text-[10px] text-gray-500 space-y-0.5 leading-snug flex-1">
            <p className="font-bold text-gray-700">※ 이사 견적 및 계약 안내사항</p>
            <p>1. 위 산출 물품 명세 외 당일 추가되는 대형 가구·가전 및 작업 여건 변경(사다리차 불가 등) 시 실비가 가감될 수 있습니다.</p>
            <p>2. 귀중품, 현금, 유가증권, 고가 골동품 등은 고객님께서 직접 휴대·보관하여 주시기 바랍니다.</p>
            <p>3. 위 견적 및 계약 내용을 확인하고 이에 동의합니다.</p>
          </div>

          <div className="w-full sm:w-48 print:w-44 border border-gray-300 rounded-lg print:rounded-none p-2 print:p-1.5 text-center shrink-0 bg-gray-50/40 print:bg-transparent">
            <div className="text-xs print:text-[11px] font-bold text-gray-800 border-b border-gray-300 pb-1 mb-1">
              고객 확인 및 서명
            </div>
            {estimate.signature ? (
              <img src={estimate.signature} alt="고객 서명" className="w-full h-14 print:h-12 object-contain mx-auto" />
            ) : (
              <div className="h-14 print:h-12 flex items-center justify-center text-xs text-gray-400">
                (서명 / 날인)
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
