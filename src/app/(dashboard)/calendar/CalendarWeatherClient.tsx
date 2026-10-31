'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning } from 'lucide-react'

export interface DayWeatherInfo {
  code: number
  tempMax?: number | null
  tempMin?: number | null
  precipProb?: number | null
}

export type WeatherMap = Record<string, DayWeatherInfo>

const WeatherContext = createContext<WeatherMap>({})

function addDaysToDateStr(baseDateStr: string, offsetDays: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays))
  const yyyy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getClientKoreaTodayStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

export function buildWeatherMapFromDaily(
  daily: any,
  anchorDates: string[],
  pastDaysCount = 31
): WeatherMap {
  const map: WeatherMap = {}
  if (!daily || !Array.isArray(daily.time)) return map

  const codes: number[] = daily.weather_code || daily.weathercode || []
  const maxTemps: number[] = daily.temperature_2m_max || []
  const minTemps: number[] = daily.temperature_2m_min || []
  const precipProbs: number[] = daily.precipitation_probability_max || []

  // 1) Open-Meteo 실제 반환 날짜 그대로 매핑
  daily.time.forEach((t: string, idx: number) => {
    const code = codes[idx]
    if (code !== undefined && code !== null) {
      map[t] = {
        code: Number(code),
        tempMax: maxTemps[idx] !== undefined ? Math.round(Number(maxTemps[idx])) : null,
        tempMin: minTemps[idx] !== undefined ? Math.round(Number(minTemps[idx])) : null,
        precipProb: precipProbs[idx] !== undefined ? Math.round(Number(precipProbs[idx])) : null,
      }
    }
  })

  // 2) 기준 날짜(서버 오늘, 단말기 오늘 등)가 Open-Meteo 날짜 범위에 없을 때도
  //    오늘 인덱스(pastDaysCount)를 기준으로 과거 31일 ~ 향후 15일 예보가 누락 없이 표시되도록 매핑
  if (daily.time.length > pastDaysCount) {
    anchorDates.filter(Boolean).forEach((anchorDateStr) => {
      if (!map[anchorDateStr]) {
        daily.time.forEach((_: string, idx: number) => {
          const code = codes[idx]
          if (code !== undefined && code !== null) {
            const offset = idx - pastDaysCount
            const mappedDateStr = addDaysToDateStr(anchorDateStr, offset)
            if (!map[mappedDateStr]) {
              map[mappedDateStr] = {
                code: Number(code),
                tempMax: maxTemps[idx] !== undefined ? Math.round(Number(maxTemps[idx])) : null,
                tempMin: minTemps[idx] !== undefined ? Math.round(Number(minTemps[idx])) : null,
                precipProb: precipProbs[idx] !== undefined ? Math.round(Number(precipProbs[idx])) : null,
              }
            }
          }
        })
      }
    })
  }

  return map
}

export function getWeatherLabel(code: number): string {
  if (code === 0) return '맑음'
  if (code === 1) return '대체로 맑음'
  if (code === 2) return '구름 조금'
  if (code === 3) return '흐림'
  if (code === 45 || code === 48) return '안개'
  if (code >= 51 && code <= 57) return '이슬비'
  if (code >= 61 && code <= 67) return '비'
  if (code >= 71 && code <= 77) return '눈'
  if (code >= 80 && code <= 82) return '소나기'
  if (code >= 85 && code <= 86) return '눈보라'
  if (code >= 95 && code <= 99) return '뇌우(천둥번개)'
  return '구름'
}

export function renderWeatherIcon(code: number) {
  if (code === 0 || code === 1) return <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />
  if (code === 2) return <CloudSun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
  if (code === 3 || code === 45 || code === 48) return <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 shrink-0" />
  if (code >= 95 && code <= 99) return <CloudLightning className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 shrink-0" />
  return <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
}

export function CalendarWeatherProvider({
  initialDaily,
  koreaTodayStr,
  targetMonthTodayStr,
  children,
}: {
  initialDaily: any
  koreaTodayStr: string
  targetMonthTodayStr?: string
  children: React.ReactNode
}) {
  const [dailyData, setDailyData] = useState<any>(initialDaily || null)
  const [clientTodayStr, setClientTodayStr] = useState<string>(koreaTodayStr)

  useEffect(() => {
    setClientTodayStr(getClientKoreaTodayStr())
  }, [])

  useEffect(() => {
    if (initialDaily && Array.isArray(initialDaily.time) && initialDaily.time.length > 0) {
      setDailyData(initialDaily)
      return
    }
    // 서버 사이드에서 Open-Meteo 호출이 실패했거나 비어 있을 경우 클라이언트 브라우저에서 직접 조회
    let cancelled = false
    const pastDays = 31
    const url = `https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&past_days=${pastDays}&forecast_days=16`
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.daily) {
          setDailyData(data.daily)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [initialDaily])

  const weatherMap = useMemo(() => {
    return buildWeatherMapFromDaily(
      dailyData,
      [koreaTodayStr, clientTodayStr, targetMonthTodayStr || ''],
      31
    )
  }, [dailyData, koreaTodayStr, clientTodayStr, targetMonthTodayStr])

  return <WeatherContext.Provider value={weatherMap}>{children}</WeatherContext.Provider>
}

export function CalendarDayWeatherBadge({ dateStr }: { dateStr: string }) {
  const weatherMap = useContext(WeatherContext)
  const info = weatherMap[dateStr]

  if (!info || info.code === undefined || info.code === null) return null

  const label = getWeatherLabel(info.code)
  const tempText =
    info.tempMin !== null && info.tempMin !== undefined && info.tempMax !== null && info.tempMax !== undefined
      ? `최저 ${info.tempMin}°C / 최고 ${info.tempMax}°C`
      : ''
  const precipText =
    info.precipProb !== null && info.precipProb !== undefined && info.precipProb > 0
      ? ` · 강수확률 ${info.precipProb}%`
      : ''
  const tooltip = `${label}${tempText ? ` · ${tempText}` : ''}${precipText} (클릭 시 네이버 날씨)`

  return (
    <a
      href="https://weather.naver.com/"
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      className="px-1 sm:px-1.5 py-0.5 bg-sky-50/90 hover:bg-sky-100 rounded-full shadow-2xs border border-sky-200/80 transition-colors cursor-pointer inline-flex items-center gap-0.5"
    >
      {renderWeatherIcon(info.code)}
      {info.tempMax !== null && info.tempMax !== undefined && (
        <span className="hidden md:inline text-[10px] font-bold text-gray-700 leading-none">
          {info.tempMax}°
        </span>
      )}
    </a>
  )
}
