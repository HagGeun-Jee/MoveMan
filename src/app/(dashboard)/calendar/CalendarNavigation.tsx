'use client'

import { forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { ko } from 'date-fns/locale'

const CustomTitleInput = forwardRef<HTMLButtonElement, any>(({ value, onClick }, ref) => (
  <button onClick={onClick} ref={ref} className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 -ml-2 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500/20" title="클릭하여 년도/월 선택">
    <h1 className="text-2xl font-bold text-gray-900">{value} 일정 캘린더</h1>
    <CalendarIcon size={24} className="text-blue-500" />
  </button>
))
CustomTitleInput.displayName = 'CustomTitleInput'

export default function CalendarNavigation({ currentDateStr }: { currentDateStr: string }) {
  const router = useRouter()
  // Ensure the date is treated as local time
  const currentDate = new Date(currentDateStr)

  const handlePrev = () => {
    const prev = subMonths(currentDate, 1)
    router.push(`/calendar?date=${format(prev, 'yyyy-MM-dd')}`)
  }

  const handleNext = () => {
    const next = addMonths(currentDate, 1)
    router.push(`/calendar?date=${format(next, 'yyyy-MM-dd')}`)
  }

  const handleChange = (date: Date | null) => {
    if (date) {
      router.push(`/calendar?date=${format(date, 'yyyy-MM-dd')}`)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handlePrev} className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-gray-600 transition-colors shadow-sm" title="이전 달">
        <ChevronLeft size={20} />
      </button>
      
      <div className="px-2">
        <DatePicker
          selected={currentDate}
          onChange={handleChange}
          showMonthYearPicker
          dateFormat="yyyy년 M월"
          locale={ko}
          customInput={<CustomTitleInput />}
        />
      </div>

      <button onClick={handleNext} className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-gray-600 transition-colors shadow-sm" title="다음 달">
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
