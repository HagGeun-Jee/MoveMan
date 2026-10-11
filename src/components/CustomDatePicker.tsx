'use client'

import React, { forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { ko } from 'date-fns/locale'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import { Star, Calendar } from 'lucide-react'

interface CustomDatePickerProps {
  selected?: Date | null
  onChange: (date: Date | null) => void
  name?: string
  required?: boolean
  className?: string
  placeholderText?: string
  showTimeSelect?: boolean
  dateFormat?: string
}

const CustomInput = forwardRef<HTMLInputElement, any>(({ className, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <input {...props} ref={ref} autoComplete="off" className={`${className || ''} pr-10`} />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
        <Calendar size={18} />
      </div>
    </div>
  )
})
CustomInput.displayName = 'CustomInput'

export function CustomDatePicker({ 
  selected, 
  onChange, 
  name, 
  required, 
  className,
  placeholderText,
  showTimeSelect,
  dateFormat = "yyyy-MM-dd"
}: CustomDatePickerProps) {
  
  const getDayClassName = (date: Date) => {
    const korCal = new KoreanLunarCalendar()
    korCal.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const korLunar = korCal.getLunarCalendar()
    const isSonEobNeunNal = korLunar.day % 10 === 9 || korLunar.day % 10 === 0
    return isSonEobNeunNal ? 'son-eob-neun-nal' : ''
  }

  return (
    <div className="relative w-full custom-datepicker-container">
      <DatePicker
        selected={selected}
        onChange={(date: Date | null) => onChange(date)}
        locale={ko}
        dateFormat={dateFormat}
        showTimeSelect={showTimeSelect}
        dayClassName={getDayClassName}
        name={name}
        customInput={<CustomInput required={required} className={className} />}
        placeholderText={placeholderText}
        wrapperClassName="w-full"
      />
      <style dangerouslySetInnerHTML={{__html: `
        .custom-datepicker-container .react-datepicker-wrapper {
          width: 100%;
        }
        .custom-datepicker-container .react-datepicker__input-container {
          width: 100%;
        }
        .son-eob-neun-nal {
          background-color: #fef08a !important;
          color: #854d0e !important;
          border-radius: 0.3rem !important;
          font-weight: bold;
        }
        .son-eob-neun-nal:hover {
          background-color: #fde047 !important;
        }
        .react-datepicker__day--selected.son-eob-neun-nal {
          background-color: #2563eb !important;
          color: white !important;
        }
      `}} />
    </div>
  )
}
