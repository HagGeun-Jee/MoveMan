import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay } from 'date-fns'
import { Solar } from 'lunar-javascript'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import { Sun, Star } from 'lucide-react'
import Link from 'next/link'
import { CalendarWeatherProvider, CalendarDayWeatherBadge } from './CalendarWeatherClient'
import { getVehicleCalendarEvents } from '@/app/actions/vehicleLog'
import { formatKstDate, formatKstTime, getKstMonthRange } from '@/lib/kstDate'

// 한국 표준시(KST, Asia/Seoul) 기준 오늘 날짜 정보 구하기 (Vercel/Render UTC 서버 환경 대응)
function getKoreaToday(): { year: number, month: number, day: number, dateString: string } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const dateString = formatter.format(now) // "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number)
  return { year, month, day, dateString }
}

// Fetch weather data (past 31 days + next 16 days forecast for Seoul)
async function getWeatherData() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&past_days=31&forecast_days=16',
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.daily || null
  } catch (error) {
    console.error('Failed to fetch weather data:', error)
    return null
  }
}

import CalendarNavigation from './CalendarNavigation'

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams
  const koreaToday = getKoreaToday()

  let targetYear = koreaToday.year
  let targetMonth = koreaToday.month

  if (params.date && /^\d{4}-\d{1,2}/.test(params.date)) {
    const parts = params.date.split('-').map(Number)
    if (parts[0] && parts[1]) {
      targetYear = parts[0]
      targetMonth = parts[1]
    }
  }

  // targetYear, targetMonth 기준의 1일 날짜 (로컬 컴포넌트로 생성하여 타임존 쉬프트 방지)
  const currentDate = new Date(targetYear, targetMonth - 1, 1)
  
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  // 현재 월의 시작일의 요일을 구해서 앞부분 빈칸 추가
  const startDay = getDay(monthStart)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const prefixDays = Array(startDay).fill(null)
  
  // KST(Asia/Seoul) 기준 해당 월의 시작~말일 범위로 조회하여 UTC/KST 경계 누락 방지
  const { start: kstMonthStart, end: kstMonthEnd } = getKstMonthRange(targetYear, targetMonth)
  const estimates = await prisma.estimate.findMany({
    where: {
      OR: [
        { movingDate: { gte: kstMonthStart, lte: kstMonthEnd } },
        { visitDate: { gte: kstMonthStart, lte: kstMonthEnd } }
      ]
    }
  })

  const targetYearMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
  const [weatherData, vehicleEvents] = await Promise.all([
    getWeatherData(),
    getVehicleCalendarEvents(targetYearMonthStr)
  ])

  function getKoreanHolidayAndJieQi(solar: any, lunar: any): { holidayName: string | null, isRedDay: boolean, jieQi: string | null } {
    let holidayName = null;
    let isRedDay = false;
    
    const JIEQI_KOR: Record<string, string> = {
      '立春': '입춘', '雨水': '우수', '惊蛰': '경칩', '春分': '춘분',
      '清明': '청명', '谷雨': '곡우', '立夏': '입하', '小满': '소만',
      '芒种': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
      '立秋': '입추', '处暑': '처서', '白露': '백로', '秋分': '추분',
      '寒露': '한로', '霜降': '상강', '立冬': '입동', '小雪': '소설',
      '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한'
    };

    const jq = lunar.getJieQi();
    const jieQi = jq ? JIEQI_KOR[jq] || null : null;

    const sMonth = solar.getMonth();
    const sDay = solar.getDay();
    const sDateStr = `${sMonth}-${sDay}`;

    if (sDateStr === '1-1') { holidayName = '신정'; isRedDay = true; }
    else if (sDateStr === '3-1') { holidayName = '삼일절'; isRedDay = true; }
    else if (sDateStr === '5-5') { holidayName = '어린이날'; isRedDay = true; }
    else if (sDateStr === '6-6') { holidayName = '현충일'; isRedDay = true; }
    else if (sDateStr === '8-15') { holidayName = '광복절'; isRedDay = true; }
    else if (sDateStr === '10-3') { holidayName = '개천절'; isRedDay = true; }
    else if (sDateStr === '10-9') { holidayName = '한글날'; isRedDay = true; }
    else if (sDateStr === '12-25') { holidayName = '크리스마스'; isRedDay = true; }

    const lMonth = lunar.getMonth();
    const lDay = lunar.getDay();
    const lDateStr = `${lMonth}-${lDay}`;
    
    if (lDateStr === '1-1') { holidayName = '설날'; isRedDay = true; }
    else if (lDateStr === '1-2') { holidayName = '설날 연휴'; isRedDay = true; }
    const tomorrowLunar = solar.next(1).getLunar();
    if (tomorrowLunar.getMonth() === 1 && tomorrowLunar.getDay() === 1) {
      holidayName = '설날 연휴'; isRedDay = true;
    }

    if (lDateStr === '4-8') { holidayName = '부처님오신날'; isRedDay = true; }

    if (lDateStr === '8-14') { holidayName = '추석 연휴'; isRedDay = true; }
    else if (lDateStr === '8-15') { holidayName = '추석'; isRedDay = true; }
    else if (lDateStr === '8-16') { holidayName = '추석 연휴'; isRedDay = true; }

    return { holidayName, isRedDay, jieQi };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <CalendarNavigation 
          currentDateStr={format(currentDate, 'yyyy-MM-dd')} 
          todayStr={koreaToday.dateString} 
        />
        <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> 손없는날
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Sun className="w-4 h-4 text-orange-500" /> 일기예보
          </div>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span> 방문/견적
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span> 이사/작업
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></span> 차량검사/정비
          </div>
          <Link
            href="/vehicles?tab=LOGBOOK"
            className="ml-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-2xs transition-colors"
          >
            🚛 차량·차계부
          </Link>
        </div>
      </div>

      <CalendarWeatherProvider
        initialDaily={weatherData}
        koreaTodayStr={koreaToday.dateString}
        targetMonthTodayStr={`${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(koreaToday.day).padStart(2, '0')}`}
      >
      <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-300">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={day} className={`p-2.5 sm:p-4 text-center text-xs sm:text-sm font-bold ${idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-800'}`}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[110px] sm:auto-rows-[120px] divide-y divide-x divide-gray-300 border-l border-gray-300">
              {prefixDays.map((_, i) => (
                <div key={`empty-${i}`} className="bg-gray-50/50"></div>
              ))}
              {daysInMonth.map((date, i) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const isCellToday = dateStr === koreaToday.dateString

                const dayEstimates = estimates
                  .filter(e => e.visitDate && formatKstDate(e.visitDate) === dateStr)
                  .sort((a, b) => new Date(a.visitDate!).getTime() - new Date(b.visitDate!).getTime())
                const dayMovings = estimates.filter(e => e.movingDate && formatKstDate(e.movingDate) === dateStr)
                const dayVehicleEvents = vehicleEvents.filter(ev => ev.date === dateStr)
                
                const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
                const lunar = solar.getLunar()

                // 손없는 날 계산 (한국천문연구원 음력 기준)
                const korCal = new KoreanLunarCalendar()
                korCal.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
                const korLunar = korCal.getLunarCalendar()
                const isSonEobNeunNal = korLunar.day % 10 === 9 || korLunar.day % 10 === 0

                // 휴일 및 절기
                const { holidayName, isRedDay, jieQi } = getKoreanHolidayAndJieQi(solar, lunar)
                
                // 주말 및 휴일 색상 처리
                const dayOfWeek = getDay(date)
                const isRedColor = dayOfWeek === 0 || isRedDay
                const dateColorClass = isCellToday 
                  ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300' 
                  : isRedColor 
                    ? 'text-red-600 font-bold' 
                    : dayOfWeek === 6 
                      ? 'text-blue-600 font-bold' 
                      : 'text-gray-900 font-bold'

                return (
                  <div key={i} className={`p-1.5 sm:p-2 flex flex-col transition-colors hover:bg-gray-50 ${isCellToday ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-200' : ''}`}>
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <div className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${dateColorClass}`}>
                            {format(date, 'd')}
                          </div>
                          {isCellToday && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1 py-0.5 rounded leading-none">오늘</span>
                          )}
                        </div>
                        {(holidayName || jieQi) && (
                          <div className="flex flex-col mt-0.5 px-0.5 sm:px-1 leading-tight">
                            {holidayName && <span className="text-[10px] text-red-500 font-bold break-keep">{holidayName}</span>}
                            {jieQi && <span className="text-[10px] text-teal-600 font-medium break-keep">{jieQi}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {isSonEobNeunNal && (
                          <div title="손없는 날" className="flex items-center justify-center bg-yellow-100 text-yellow-600 p-0.5 sm:p-1 rounded-full shadow-sm">
                            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-yellow-500" />
                          </div>
                        )}
                        <CalendarDayWeatherBadge dateStr={dateStr} />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                      {dayEstimates.map(est => {
                        const visitTimeStr = est.visitDate ? formatKstTime(est.visitDate) : ''
                        let partnerBadge = ''
                        try {
                          if (est.environment) {
                            const env = JSON.parse(est.environment)
                            partnerBadge = String(env?.partnerShortName || env?.partnerName || '').trim()
                          }
                        } catch {}
                        return (
                          <Link
                            href={`/estimates/${est.id}`}
                            key={`est-${est.id}`}
                            title={
                              `${partnerBadge ? `[${partnerBadge}] ` : ''}방문: ${est.customerName}` +
                              (visitTimeStr ? ` (${visitTimeStr})` : '')
                            }
                            className="block text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-900 font-bold rounded truncate cursor-pointer hover:bg-blue-200 shadow-sm border border-blue-300"
                          >
                            {partnerBadge && (
                              <span className="mr-1 text-[10px] font-extrabold text-indigo-800 bg-white/95 px-1 rounded border border-indigo-200">
                                {partnerBadge}
                              </span>
                            )}
                            <span>방문: {est.customerName}</span>
                            {visitTimeStr && (
                              <span className="ml-1 text-[10px] font-extrabold text-blue-700 bg-white/90 px-1 rounded">
                                {visitTimeStr}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                      {dayMovings.map(est => {
                        let dispatchLabel = ''
                        let partnerBadge = ''
                        try {
                          if (est.environment) {
                            const env = JSON.parse(est.environment)
                            const avs = env?.dispatch?.assignedVehicles || []
                            const leader = (env?.dispatch?.teamLeader || '').trim()
                            const vShort = avs.length > 0 ? avs[0].name.split(' ')[0] : ''
                            if (vShort && leader) dispatchLabel = `${vShort}·${leader}`
                            else if (vShort) dispatchLabel = vShort
                            else if (leader) dispatchLabel = leader
                            partnerBadge = String(env?.partnerShortName || env?.partnerName || '').trim()
                          }
                        } catch {}
                        return (
                          <Link
                            href={`/estimates/${est.id}`}
                            key={`mov-${est.id}`}
                            title={
                              `${partnerBadge ? `[${partnerBadge}] ` : ''}이사: ${est.customerName} ` +
                              (dispatchLabel ? `(${dispatchLabel})` : '(미배차)')
                            }
                            className="block text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-100 text-red-900 font-bold rounded truncate cursor-pointer hover:bg-red-200 shadow-sm border border-red-300"
                          >
                            {partnerBadge && (
                              <span className="mr-1 text-[10px] font-extrabold text-rose-800 bg-white/95 px-1 rounded border border-rose-200">
                                {partnerBadge}
                              </span>
                            )}
                            <span>이사: {est.customerName}</span>
                            {dispatchLabel && (
                              <span className="ml-1 text-[10px] font-extrabold text-emerald-800 bg-white/90 px-1 rounded">
                                {dispatchLabel}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                      {dayVehicleEvents.map(ev => {
                        const isExpiryOrDue =
                          ev.type === 'EXPIRY_INSPECTION' ||
                          ev.type === 'EXPIRY_INSURANCE' ||
                          ev.type === 'DUE_DATE'
                        return (
                          <Link
                            href={`/vehicles?tab=LOGBOOK&vehicleId=${ev.vehicleId}&ym=${targetYearMonthStr}`}
                            key={ev.id}
                            title={ev.tooltip}
                            className={`block text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold rounded truncate cursor-pointer shadow-sm border ${
                              isExpiryOrDue
                                ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 border-purple-300'
                                : 'bg-amber-100 text-amber-950 hover:bg-amber-200 border-amber-300'
                            }`}
                          >
                            <span>{ev.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      </CalendarWeatherProvider>
    </div>
  )
}
