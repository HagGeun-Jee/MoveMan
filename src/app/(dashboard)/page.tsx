import prisma from '@/lib/prisma'
import Link from 'next/link'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { EstimateRow } from './estimates/EstimateRow'
import { formatPhoneNumber } from '@/lib/format'

export default async function DashboardPage() {
  const recentEstimates = await prisma.estimate.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const today = new Date()
  
  const todayVisitsCount = await prisma.estimate.count({
    where: {
      visitDate: {
        gte: startOfDay(today),
        lte: endOfDay(today)
      }
    }
  })

  const thisMonthMovingsCount = await prisma.estimate.count({
    where: {
      movingDate: {
        gte: startOfMonth(today),
        lte: endOfMonth(today)
      }
    }
  })

  const allPayPlans = await prisma.estimate.findMany({
    select: { paymentPlan: true }
  })
  
  const pendingCount = allPayPlans.filter(e => {
    const pay = e.paymentPlan ? JSON.parse(e.paymentPlan) : {}
    return !pay.downPaymentPaid
  }).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <Link 
          href="/estimates/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          + 새 견적 작성
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-gray-700 text-xs sm:text-sm font-semibold">오늘 예정된 방문견적</h2>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{todayVisitsCount}건</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-gray-700 text-xs sm:text-sm font-semibold">이번 달 이사 건수</h2>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{thisMonthMovingsCount}건</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-gray-700 text-xs sm:text-sm font-semibold">대기 중인 견적 (미계약)</h2>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{pendingCount}건</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">최근 작성된 견적</h2>
          <Link href="/estimates" className="text-xs sm:text-sm text-blue-600 hover:underline">전체 보기</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/90 text-gray-800 text-sm font-semibold border-b border-gray-200">
                <th className="p-4 font-bold whitespace-nowrap">식별코드</th>
                <th className="p-4 font-bold whitespace-nowrap">고객명</th>
                <th className="p-4 font-bold whitespace-nowrap">연락처</th>
                <th className="p-4 font-bold whitespace-nowrap">접수일자</th>
                <th className="p-4 font-bold whitespace-nowrap">이사종류</th>
                <th className="p-4 font-bold whitespace-nowrap">결제상태</th>
              </tr>
            </thead>
            <tbody>
              {recentEstimates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-600 font-medium">
                    최근 작성된 견적이 없습니다.
                  </td>
                </tr>
              ) : (
                recentEstimates.map(est => {
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

                  return (
                    <EstimateRow key={est.id} id={est.id}>
                      <td className="p-4 font-bold text-blue-600 hover:underline">{est.id}</td>
                      <td className="p-4 font-bold text-gray-900">{est.customerName}</td>
                      <td className="p-4 font-medium text-gray-900">{formatPhoneNumber(est.contact)}</td>
                      <td className="p-4 font-medium text-gray-900">{format(new Date(est.estimateDate), 'yyyy-MM-dd', { locale: ko })}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-900 rounded-md text-xs font-bold border border-gray-200">
                          {est.movingType === 'P' ? '포장이사' : est.movingType === 'G' ? '일반이사' : '보관이사'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${paymentStatusClass}`}>
                          {paymentStatusText}
                        </span>
                      </td>
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
