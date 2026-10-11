import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { MapPin } from 'lucide-react'
import { PrintButton } from '@/components/PrintButton'

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
  const items = estimate.cbmItems ? JSON.parse(estimate.cbmItems) : []
  const labors = envObj.labors || []
  const vehicles = envObj.vehicles || []

  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    const locName = item.locationName || '기타/미지정'
    if (!acc[locName]) acc[locName] = []
    acc[locName].push(item)
    return acc
  }, {})

  // 각 위치별로 품목명 기준 가나다순 정렬
  for (const locName in groupedItems) {
    groupedItems[locName].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 print:max-w-none print:space-y-4 print:pb-0 print:m-0 print:pt-4">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">견적 상세 - {estimate.id}</h1>
        <div className="flex gap-2">
          <PrintButton />
          <Link href="/estimates" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300 shadow-sm">
            목록으로
          </Link>
          <Link href={`/estimates/${estimate.id}/edit`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
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
          <p className="text-sm text-gray-500 mt-1">견적번호: {estimate.id}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 print:p-0 print:border-none print:shadow-none print:space-y-4">
        {/* 기본 정보 및 주소/일정 */}
        <section>
          <div className="flex justify-between items-center border-b pb-2 mb-4 print:mb-2 print:pb-1">
            <h2 className="text-lg font-bold text-blue-600 print:text-base">기본 정보 및 주소/일정</h2>
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
          
          <table className="w-full text-sm border-collapse border border-gray-300 print:text-xs">
            <tbody>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700 w-1/4 sm:w-1/6">고객명</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900 w-1/4 sm:w-2/6">{estimate.customerName}</td>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700 w-1/4 sm:w-1/6">연락처</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900 w-1/4 sm:w-2/6">{estimate.contact}</td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">이사종류</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {estimate.movingType === 'P' ? '포장이사' : estimate.movingType === 'G' ? '일반이사' : '보관이사'}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">접수일자</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {format(new Date(estimate.estimateDate), 'yyyy-MM-dd')}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">방문 견적일정</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {estimate.visitDate ? format(new Date(estimate.visitDate), 'yyyy-MM-dd HH:mm') : '-'}
                </td>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">이사 예정일</th>
                <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                  {estimate.movingDate ? format(new Date(estimate.movingDate), 'yyyy-MM-dd') : '-'}
                </td>
              </tr>
              {estimate.movingType === 'K' && (
                <tr>
                  <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">정리 예정일(보관)</th>
                  <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                    {estimate.organizeDate ? format(new Date(estimate.organizeDate), 'yyyy-MM-dd') : '-'}
                  </td>
                  <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">정리 여부</th>
                  <td className="border border-gray-300 px-3 py-2 print:px-2 print:py-1 font-semibold text-gray-900">
                    {envObj.organizeStatus || '-'}
                  </td>
                </tr>
              )}
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">출발지</th>
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
                <th className="border border-gray-300 bg-gray-50 px-3 py-2 print:px-2 print:py-1 text-left font-medium text-gray-700">도착지</th>
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
            </tbody>
          </table>
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
                      <div className="bg-gray-100 px-4 py-2 font-bold text-gray-700 flex justify-between items-center print:bg-gray-50 print:py-1">
                        <span>{locName}</span>
                        <span className="text-sm font-medium text-blue-600">
                          {catItems.reduce((acc: number, item: any) => acc + ((Number(item.cbm) || 0) + (Number(item.innerBoxCbm) || 0)) * (item.quantity !== undefined ? Number(item.quantity) : 1), 0).toFixed(2)} CBM
                        </span>
                      </div>
                      <table className="w-full text-sm text-left print:text-xs">
                        <thead className="bg-gray-50 text-gray-600 border-b print:bg-transparent">
                          <tr>
                            <th className="px-4 py-2 font-medium print:px-2 print:py-1">품목</th>
                            <th className="px-4 py-2 font-medium print:px-2 print:py-1">규격</th>
                            <th className="px-4 py-2 font-medium text-right w-20 print:px-2 print:py-1">수량</th>
                            <th className="px-4 py-2 font-medium text-right w-24 print:px-2 print:py-1">기본 CBM</th>
                            <th className="px-4 py-2 font-medium text-right w-24 print:px-2 print:py-1">추가 CBM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 print:divide-gray-200">
                          {catItems.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 print:px-2 print:py-1">{item.name}</td>
                              <td className="px-4 py-2 text-gray-600 print:px-2 print:py-1">{item.spec || '-'}</td>
                              <td className="px-4 py-2 text-right print:px-2 print:py-1">{item.quantity !== undefined ? item.quantity : 1}</td>
                              <td className="px-4 py-2 text-right print:px-2 print:py-1">{item.cbm}</td>
                              <td className="px-4 py-2 text-right print:px-2 print:py-1">{item.innerBoxCbm}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                <span className="text-gray-500">기본 이사 비용</span>
                <span className="font-semibold">{estimate.movingCost.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">가산 비용 (사다리차/거리 등)</span>
                <span className="font-semibold">{estimate.additionalCost.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">보관 비용</span>
                <span className="font-semibold">{estimate.storageCost.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">부가세</span>
                <span className="font-semibold">{estimate.vat.toLocaleString()} 원</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold text-blue-800">
                <span>총 합계 (공급대가)</span>
                <span>{estimate.totalAmount.toLocaleString()} 원</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-3 print:bg-transparent print:p-0 print:border print:border-gray-300 print:p-3 print:space-y-2">
              <div className="font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2 print:mb-1 print:pb-1">결제 플랜 ({payPlanObj.targetType === 'supply' ? '공급가액 기준' : '공급대가 기준'})</div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">계약금 {payPlanObj.downPaymentDate ? `(${payPlanObj.downPaymentDate})` : ''}</span>
                <div className="flex items-center gap-2">
                  {payPlanObj.downPaymentPaid ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">입금완료</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-medium">미입금</span>
                  )}
                  <span className="font-semibold">{Number(payPlanObj.downPayment || 0).toLocaleString()} 원</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">중도금 {payPlanObj.intermediateDate ? `(${payPlanObj.intermediateDate})` : ''}</span>
                <div className="flex items-center gap-2">
                  {payPlanObj.intermediatePaymentPaid ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">입금완료</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-medium">미입금</span>
                  )}
                  <span className="font-semibold">{Number(payPlanObj.intermediatePayment || 0).toLocaleString()} 원</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">잔금 {payPlanObj.balanceDate ? `(${payPlanObj.balanceDate})` : ''}</span>
                <div className="flex items-center gap-2">
                  {payPlanObj.balancePaid ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">입금완료</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-medium">미입금</span>
                  )}
                  <span className="font-semibold">{Number(payPlanObj.balance || 0).toLocaleString()} 원</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
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
