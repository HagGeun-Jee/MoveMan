'use client'

import React, { forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { ko } from 'date-fns/locale'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import { Star, Calendar, X } from 'lucide-react'

interface CustomDatePickerProps {
  selected?: Date | null
  onChange: (date: Date | null) => void
  name?: string
  required?: boolean
  className?: string
  placeholderText?: string
  showTimeSelect?: boolean
  timeIntervals?: number
  isClearable?: boolean
  dateFormat?: string
}

const CustomInput = forwardRef<HTMLInputElement, any>(({ className, hasClear, onClear, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <input {...props} ref={ref} autoComplete="off" className={`${className || ''} ${hasClear ? 'pr-14' : 'pr-10'}`} />
      {hasClear && (
        <button
          type="button"
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            onClear?.()
          }}
          title="일정 지우기"
          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X size={14} />
        </button>
      )}
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
  timeIntervals = 30,
  isClearable = false,
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
        timeIntervals={timeIntervals}
        timeCaption="시간"
        dayClassName={getDayClassName}
        name={name}
        customInput={
          <CustomInput
            required={required}
            className={className}
            hasClear={Boolean(isClearable && selected && !required)}
            onClear={() => onChange(null)}
          />
        }
        placeholderText={placeholderText}
        wrapperClassName="w-full"
        popperProps={{
          strategy: 'fixed',
        }}
        popperPlacement="bottom-start"
        popperClassName="z-[99999]"
      />
      <style dangerouslySetInnerHTML={{__html: `
        .custom-datepicker-container .react-datepicker-wrapper {
          width: 100%;
        }
        .custom-datepicker-container .react-datepicker__input-container {
          width: 100%;
        }
        body .react-datepicker-popper {
          z-index: 99999 !important;
        }
        .react-datepicker {
          font-family: inherit !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0.75rem !important;
          overflow: hidden !important;
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
