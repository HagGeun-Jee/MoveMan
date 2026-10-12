import prisma from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { EstimateRow } from './estimates/EstimateRow'
import { formatPhoneNumber } from '@/lib/format'
import { Calendar, CalendarDays, FilePlus } from 'lucide-react'

// 한국 표준시(KST, Asia/Seoul) 기준 오늘 날짜 정보 구하기 (Vercel UTC 환경 대응)
function getKoreaToday() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const dateString = formatter.format(now) // "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number)
  
  const dayFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'long'
  })
  const dayOfWeekKorean = dayFormatter.format(now)

  const shortFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short'
  })
  const dayOfWeekShort = shortFormatter.format(now)

  const dayOfWeekNumber = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  return { year, month, day, dateString, dayOfWeekKorean, dayOfWeekShort, dayOfWeekNumber }
}

export default async function DashboardPage() {
  const recentEstimates = await prisma.estimate.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const koreaToday = getKoreaToday()

  // KST(UTC+9) 기준 당일 00:00:00 ~ 23:59:59.999
  const kstStartOfDay = new Date(Date.UTC(koreaToday.year, koreaToday.month - 1, koreaToday.day, 0, 0, 0) - 9 * 3600 * 1000)
  const kstEndOfDay = new Date(Date.UTC(koreaToday.year, koreaToday.month - 1, koreaToday.day, 23, 59, 59, 999) - 9 * 3600 * 1000)

  // KST(UTC+9) 기준 당월 1일 00:00:00 ~ 말일 23:59:59.999
  const kstStartOfMonth = new Date(Date.UTC(koreaToday.year, koreaToday.month - 1, 1, 0, 0, 0) - 9 * 3600 * 1000)
  const kstEndOfMonth = new Date(Date.UTC(koreaToday.year, koreaToday.month, 0, 23, 59, 59, 999) - 9 * 3600 * 1000)

  const todayVisitsCount = await prisma.estimate.count({
    where: {
      visitDate: {
        gte: kstStartOfDay,
        lte: kstEndOfDay
      }
    }
  })

  const thisMonthMovingsCount = await prisma.estimate.count({
    where: {
      movingDate: {
        gte: kstStartOfMonth,
        lte: kstEndOfMonth
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
      {/* 대시보드 헤더 및 금일 날짜/요일 배너 */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200/90 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">대시보드</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              운영 현황
            </span>
          </div>

          {/* 금일 날짜와 요일 강조 표기 */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50/60 px-3 py-1.5 rounded-xl border border-blue-200/80 shadow-2xs">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-gray-500">오늘 :</span>
              <span className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                {koreaToday.year}년 {koreaToday.month}월 {koreaToday.day}일
              </span>
              <span className={`px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow-2xs ${
                koreaToday.dayOfWeekNumber === 0 
                  ? 'bg-red-500 text-white' 
                  : koreaToday.dayOfWeekNumber === 6 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-600 text-white'
              }`}>
                {koreaToday.dayOfWeekKorean}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Link 
            href="/calendar"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors shadow-xs"
          >
            <CalendarDays size={16} className="text-blue-600" />
            일정 캘린더 바로가기
          </Link>
          <Link 
            href="/estimates/new" 
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <FilePlus size={16} />
            새 견적 작성
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-gray-700 text-xs sm:text-sm font-semibold">오늘 예정된 방문견적</h2>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {koreaToday.month}.{koreaToday.day} ({koreaToday.dayOfWeekShort})
            </span>
          </div>
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
