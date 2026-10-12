'use client'

import { forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { ko } from 'date-fns/locale'

const CustomTitleInput = forwardRef<HTMLButtonElement, any>(({ value, onClick }, ref) => (
  <button onClick={onClick} ref={ref} className="flex items-center gap-1.5 sm:gap-2 hover:bg-gray-50 px-2 py-1 -ml-2 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500/20" title="클릭하여 년도/월 선택">
    <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{value} 일정 캘린더</h1>
    <CalendarIcon size={20} className="text-blue-500 shrink-0" />
  </button>
))
CustomTitleInput.displayName = 'CustomTitleInput'

export default function CalendarNavigation({ currentDateStr, todayStr }: { currentDateStr: string, todayStr?: string }) {
  const router = useRouter()
  // Ensure the date is treated as local time without UTC offset drift
  const [y, m, d] = currentDateStr.split('-').map(Number)
  const currentDate = new Date(y, m - 1, d || 1)

  const handlePrev = () => {
    const prev = subMonths(currentDate, 1)
    router.push(`/calendar?date=${format(prev, 'yyyy-MM-dd')}`)
  }

  const handleNext = () => {
    const next = addMonths(currentDate, 1)
    router.push(`/calendar?date=${format(next, 'yyyy-MM-dd')}`)
  }

  const handleToday = () => {
    if (todayStr) {
      router.push(`/calendar?date=${todayStr}`)
    } else {
      router.push('/calendar')
    }
  }

  const handleChange = (date: Date | null) => {
    if (date) {
      router.push(`/calendar?date=${format(date, 'yyyy-MM-dd')}`)
    }
  }

  const todayDateObj = todayStr ? new Date(todayStr + 'T00:00:00') : new Date()
  const isCurrentMonthToday = todayStr ? currentDateStr.slice(0, 7) === todayStr.slice(0, 7) : true

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {todayStr && (
        <button 
          type="button"
          onClick={handleToday}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border transition-colors shadow-xs flex items-center gap-1.5 ${
            isCurrentMonthToday
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
          title="오늘 날짜로 이동"
        >
          <span>오늘</span>
          <span className="text-[11px] font-medium text-blue-600/80">({format(todayDateObj, 'M.d (eee)', { locale: ko })})</span>
        </button>
      )}

      <div className="flex items-center gap-1">
        <button onClick={handlePrev} className="p-1.5 sm:p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-gray-600 transition-colors shadow-xs" title="이전 달">
          <ChevronLeft size={18} />
        </button>
        
        <div className="px-1 sm:px-2">
          <DatePicker
            selected={currentDate}
            onChange={handleChange}
            showMonthYearPicker
            dateFormat="yyyy년 M월"
            locale={ko}
            customInput={<CustomTitleInput />}
          />
        </div>

        <button onClick={handleNext} className="p-1.5 sm:p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-gray-600 transition-colors shadow-xs" title="다음 달">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
