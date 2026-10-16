import prisma from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { EstimateRow } from './EstimateRow'
import { formatPhoneNumber } from '@/lib/format'
import { OfflineEstimatesNotice } from '@/components/OfflineEstimatesNotice'

export default async function EstimatesPage() {
  const estimates = await prisma.estimate.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">견적 목록</h1>
        <Link 
          href="/estimates/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          + 새 견적 작성
        </Link>
      </div>

      {/* 오프라인 저장된 미동기화 견적 배너 */}
      <OfflineEstimatesNotice />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
          <input 
            type="text" 
            placeholder="식별코드, 고객명 검색..." 
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none"
          />
          <select className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none">
            <option value="">모든 종류</option>
            <option value="P">포장이사</option>
            <option value="G">일반이사</option>
            <option value="K">보관이사</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/90 text-gray-800 text-sm font-semibold border-b border-gray-200">
                <th className="p-4 font-bold whitespace-nowrap">식별코드</th>
                <th className="p-4 font-bold whitespace-nowrap">고객명</th>
                <th className="p-4 font-bold whitespace-nowrap">연락처</th>
                <th className="p-4 font-bold whitespace-nowrap">이사종류</th>
                <th className="p-4 font-bold whitespace-nowrap">접수일자</th>
                <th className="p-4 font-bold whitespace-nowrap">이사예정일</th>
                <th className="p-4 font-bold whitespace-nowrap">결제상태</th>
                <th className="p-4 font-bold text-right whitespace-nowrap">총 금액</th>
              </tr>
            </thead>
            <tbody>
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-600 font-medium">
                    등록된 견적이 없습니다.
                  </td>
                </tr>
              ) : (
                estimates.map(est => {
                  const payPlanObj = est.paymentPlan ? JSON.parse(est.paymentPlan) : {}
                  let paymentStatusText = "미입금"
                  let paymentStatusClass = "bg-gray-100 text-gray-800 border border-gray-300"
                  
                  if (payPlanObj.balancePaid) {
                    paymentStatusText = "정산완료"
                    paymentStatusClass = "bg-green-100 text-green-800 border border-green-300"
                  } else if (payPlanObj.intermediatePaymentPaid) {
                    paymentStatusText = "중도금 완료"
                    paymentStatusClass = "bg-blue-100 text-blue-800 border border-blue-300"
                  } else if (payPlanObj.downPaymentPaid) {
                    paymentStatusText = "계약금 완료"
                    paymentStatusClass = "bg-amber-100 text-amber-900 border border-amber-300"
                  }

                  const envObj = est.environment ? JSON.parse(est.environment) : {}
                  const estDistance = envObj.distance

                  return (
                    <EstimateRow key={est.id} id={est.id}>
                      <td className="p-4 font-bold text-blue-600">{est.id}</td>
                      <td className="p-4 font-bold text-gray-900">{est.customerName}</td>
                      <td className="p-4 font-medium text-gray-900">{formatPhoneNumber(est.contact)}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-900 rounded-md text-xs font-bold border border-gray-200">
                            {est.movingType === 'P' ? '포장이사' : est.movingType === 'G' ? '일반이사' : '보관이사'}
                          </span>
                          {estDistance ? (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {estDistance}km
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-900">{format(new Date(est.estimateDate), 'yyyy-MM-dd', { locale: ko })}</td>
                      <td className="p-4 font-medium text-gray-900">{est.movingDate ? format(new Date(est.movingDate), 'yyyy-MM-dd', { locale: ko }) : '-'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${paymentStatusClass}`}>
                          {paymentStatusText}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900">{est.totalAmount.toLocaleString()}원</td>
                    </EstimateRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
