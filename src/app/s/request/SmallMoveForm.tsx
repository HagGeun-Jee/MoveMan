'use client'

import { useEffect, useMemo, useState } from 'react'
import DaumPostcodeEmbed from 'react-daum-postcode'
import {
  SMALL_ITEMS,
  SMALL_CATEGORY_LABEL,
  HOME_TYPES,
  type SmallCategory,
  type SmallItem,
} from '@/lib/smallMove/catalog'
import { compressImageFile } from '@/lib/imageCompressor'

interface Side {
  address: string
  floor: number
  elevator: boolean
  ladder: boolean
  parkingFar: boolean
}
const emptySide = (): Side => ({ address: '', floor: 1, elevator: true, ladder: false, parkingFar: false })

interface Photo {
  path: string
  label: string
  preview: string
}

interface Result {
  id: string
  estimate: {
    min: number
    max: number
    vehicleLabel: string
    totalCbm: number
    consultRequired: boolean
    consultReasons: string[]
    breakdown: { label: string; amount: number }[]
  }
}

const STEPS = ['이사 정보', '주소·환경', '물품 체크', '사진', '옵션', '연락처']
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const PHOTO_LABELS = ['큰 가구·가전', '현관·복도·계단', '엘리베이터', '기타']
// 휴대폰 번호 자동 하이픈 (010-0000-0000)
function formatPhone(v: string) {
  const d = v.replace(/[^0-9]/g, '').slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3)
  return d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + '-' + d.slice(-4)
}


export function SmallMoveForm() {
  const [step, setStep] = useState(0)
  const [homeType, setHomeType] = useState('ONE_ROOM')
  const [movingDate, setMovingDate] = useState('')
  const [dateUndecided, setDateUndecided] = useState(false)
  const [from, setFrom] = useState<Side>(emptySide())
  const [to, setTo] = useState<Side>(emptySide())
  const [qty, setQty] = useState<Record<string, number>>({})
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photoLabel, setPhotoLabel] = useState(PHOTO_LABELS[0])
  const [uploading, setUploading] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const [packingService, setPackingService] = useState(false)
  const [airconCount, setAirconCount] = useState(0)
  const [memo, setMemo] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('') // 허니팟
  const [channel, setChannel] = useState('')
  const [category, setCategory] = useState<SmallCategory>('APPLIANCE')
  const [guideItem, setGuideItem] = useState<SmallItem | null>(null)
  const [postcodeFor, setPostcodeFor] = useState<'from' | 'to' | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setChannel((p.get('utm_source') || p.get('ch') || '').slice(0, 40))
  }, [])

  const selectedCount = useMemo(() => Object.values(qty).reduce((a, b) => a + b, 0), [qty])
  const today = new Date().toISOString().slice(0, 10)

  const setQ = (id: string, delta: number, max = 20) =>
    setQty((q) => {
      const next = Math.max(0, Math.min(max, (q[id] || 0) + delta))
      const copy = { ...q }
      if (next === 0) delete copy[id]
      else copy[id] = next
      return copy
    })

  const validate = (s: number): string => {
    if (s === 0 && !dateUndecided && !movingDate) return '이사 희망일을 선택하거나 "아직 미정"을 체크해 주세요.'
    if (s === 1) {
      if (!from.address) return '출발지 주소를 검색해 주세요.'
      if (!to.address) return '도착지 주소를 검색해 주세요.'
    }
    if (s === 2 && selectedCount === 0) return '옮길 물품을 1개 이상 선택해 주세요.'
    if (s === 5) {
      if (!name.trim()) return '이름을 입력해 주세요.'
      if (!/^01[016789]-\d{3,4}-\d{4}$/.test(contact.trim())) return '휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.'
      if (!consent) return '개인정보 수집·이용에 동의해 주세요.'
    }
    return ''
  }

  const next = () => {
    const e = validate(step)
    setError(e)
    if (!e) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0 })
    }
  }

  const onPickPhotos = async (files: FileList | null) => {
    if (!files) return
    setPhotoMsg('')
    setUploading(true)
    try {
      for (const f of Array.from(files)) {
        if (photos.length >= 10) {
          setPhotoMsg('사진은 최대 10장까지 올릴 수 있습니다.')
          break
        }
        const compressed = await compressImageFile(f)
        const fd = new FormData()
        fd.append('file', compressed)
        const res = await fetch('/api/public/small-move/photo', { method: 'POST', body: fd })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.ok) {
          setPhotoMsg(json.message || '사진 업로드에 실패했습니다.')
          break
        }
        setPhotos((p) => [...p, { path: json.path, label: photoLabel, preview: URL.createObjectURL(compressed) }])
      }
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    const e = validate(5)
    setError(e)
    if (e) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/small-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website,
          channel,
          customerName: name,
          contact,
          homeType,
          movingDate: dateUndecided ? '' : movingDate,
          fromAddress: from.address,
          toAddress: to.address,
          fromInfo: from,
          toInfo: to,
          items: Object.entries(qty).map(([id, q]) => ({ id, qty: q })),
          photos: photos.map((p) => ({ path: p.path, label: p.label })),
          options: { packingService, airconCount },
          memo,
          privacyConsent: consent,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setError(json.message || '접수 중 오류가 발생했습니다.')
        return
      }
      setResult(json)
      window.scrollTo({ top: 0 })
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ───── 결과 화면 ─────
  if (result) {
    const e = result.estimate
    return (
      <div className="space-y-4 pt-2">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center space-y-2">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-black">접수가 완료되었습니다</h2>
          <p className="text-xs text-slate-500">접수번호</p>
          <p className="font-mono font-black text-blue-700 text-lg">{result.id}</p>
        </div>

        <div className="bg-blue-600 text-white rounded-2xl p-5 text-center space-y-1">
          <p className="text-sm opacity-90">예상 견적 (확정 금액 아님)</p>
          <p className="text-3xl font-black">
            {won(e.min)} ~ {won(e.max)}
          </p>
          <p className="text-xs opacity-90">
            추천 차량 {e.vehicleLabel} · 예상 물량 {e.totalCbm}㎥
          </p>
        </div>

        {e.consultRequired && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 space-y-1">
            <p className="font-black">담당자 상담이 필요한 항목이 있습니다</p>
            {e.consultReasons.map((r) => (
              <p key={r}>· {r}</p>
            ))}
          </div>
        )}

        <details className="bg-white rounded-2xl border border-slate-200 p-4 text-sm">
          <summary className="font-bold cursor-pointer">산정 내역 보기</summary>
          <ul className="mt-3 space-y-1.5">
            {e.breakdown.map((b) => (
              <li key={b.label} className="flex justify-between">
                <span className="text-slate-600">{b.label}</span>
                <span className="font-bold">{won(b.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">위 금액은 중간값이며 사진 확인 후 실제 견적은 달라질 수 있습니다.</p>
        </details>

        <p className="text-sm text-slate-600 text-center leading-relaxed">
          담당자가 사진을 확인한 뒤 <b>확정 견적을 문자로</b> 보내드립니다.
          <br />
          접수번호와 연락처로 언제든 조회할 수 있어요.
        </p>
        <a href="/s/check" className="block text-center font-bold text-blue-700 underline text-sm">
          접수 내역 조회하기
        </a>
      </div>
    )
  }

  const catItems = SMALL_ITEMS.filter((i) => i.category === category)

  const SideForm = ({ title, side, setSide, which }: { title: string; side: Side; setSide: (s: Side) => void; which: 'from' | 'to' }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <h3 className="font-black">{title}</h3>
      <button
        type="button"
        onClick={() => setPostcodeFor(which)}
        className="w-full text-left px-3 py-3 rounded-xl border border-slate-300 bg-slate-50 text-sm"
      >
        {side.address || '🔍 주소 검색'}
      </button>
      <div className="grid grid-cols-2 gap-3 items-center text-sm">
        <label className="font-bold">층수</label>
        <input
          type="number"
          inputMode="numeric"
          min={-1}
          max={60}
          value={side.floor}
          onChange={(e) => setSide({ ...side, floor: Number(e.target.value) })}
          className="border border-slate-300 rounded-xl px-3 py-2"
        />
      </div>
      <div className="space-y-2 text-sm">
        {(
          [
            ['elevator', '엘리베이터 이용 가능 (짐 운반용)'],
            ['ladder', '사다리차 필요 (계단·엘리베이터 불가)'],
            ['parkingFar', '차량 진입이 어렵거나 주차 후 30m 이상 걸어야 함'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={side[k]}
              onChange={(e) => setSide({ ...side, [k]: e.target.checked })}
              className="w-5 h-5"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* 진행 표시 */}
      <div className="sticky top-0 z-30 bg-slate-50 pt-2 pb-2 -mx-4 px-4 border-b border-slate-200/70">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
          <span>
            {step + 1}/{STEPS.length} · {STEPS[step]}
          </span>
          {selectedCount > 0 && <span className="text-blue-700">선택 {selectedCount}개</span>}
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* 허니팟: 사람에게는 보이지 않음 */}
      <input
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden
      />

      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="font-black">어떤 집인가요?</h3>
            {HOME_TYPES.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHomeType(h.id)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 ${
                  homeType === h.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                }`}
              >
                <div className="font-black">{h.label}</div>
                <div className="text-xs text-slate-500">{h.desc}</div>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="font-black">이사 희망일</h3>
            <input
              type="date"
              min={today}
              disabled={dateUndecided}
              value={movingDate}
              onChange={(e) => setMovingDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-3 disabled:bg-slate-100"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dateUndecided}
                onChange={(e) => setDateUndecided(e.target.checked)}
                className="w-5 h-5"
              />
              아직 미정이에요
            </label>
            <p className="text-xs text-slate-500">주말·금요일·월말은 할증이 붙을 수 있습니다.</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {SideForm({ title: '📍 출발지 (현재 집)', side: from, setSide: setFrom, which: 'from' })}
          {SideForm({ title: '🏠 도착지 (새 집)', side: to, setSide: setTo, which: 'to' })}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">옮길 짐을 체크해 주세요. 헷갈리면 <b>ⓘ</b>를 눌러 크기 예시를 확인하세요.</p>
          <div className="sticky top-[52px] z-20 bg-slate-50 -mx-4 px-4 py-2 flex gap-2 overflow-x-auto border-b border-slate-200/70">
            {(Object.keys(SMALL_CATEGORY_LABEL) as SmallCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-2 rounded-full text-sm font-bold border ${
                  category === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'
                }`}
              >
                {SMALL_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {catItems.map((it) => {
              const q = qty[it.id] || 0
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-3 bg-white rounded-2xl border p-3 ${q > 0 ? 'border-blue-500' : 'border-slate-200'}`}
                >
                  <div className="text-3xl w-12 text-center">{it.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm flex items-center gap-1">
                      {it.name}
                      <button
                        type="button"
                        onClick={() => setGuideItem(it)}
                        className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-black"
                        aria-label={`${it.name} 예시 보기`}
                      >
                        i
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">{it.spec}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQ(it.id, -1, it.max)}
                      className="w-9 h-9 rounded-full border border-slate-300 text-lg font-black"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-black">{q}</span>
                    <button
                      type="button"
                      onClick={() => setQ(it.id, 1, it.max)}
                      className="w-9 h-9 rounded-full bg-blue-600 text-white text-lg font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm space-y-1">
            <p className="font-black text-blue-900">이런 사진을 올려 주세요 (선택, 최대 10장)</p>
            <p>📷 큰 가구·가전 (전체가 보이게)</p>
            <p>📷 현관, 복도, 계단 (폭이 보이게)</p>
            <p>📷 엘리베이터 내부와 크기</p>
            <p className="text-xs text-slate-600 pt-1">사진이 있으면 견적이 더 정확해집니다. 이사일 2주 후 자동 삭제됩니다.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PHOTO_LABELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPhotoLabel(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  photoLabel === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="block w-full text-center py-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white font-bold text-slate-600">
            {uploading ? '업로드 중...' : `📸 사진 추가 (${photoLabel})`}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                onPickPhotos(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          {photoMsg && <p className="text-sm text-red-600">{photoMsg}</p>}
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={p.label} className="w-full aspect-square object-cover rounded-xl" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">{p.label}</span>
                <button
                  type="button"
                  onClick={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-sm">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={packingService} onChange={(e) => setPackingService(e.target.checked)} className="w-5 h-5" />
              포장 서비스 (반포장) 필요
            </label>
            <div className="flex items-center justify-between">
              <span className="font-bold">에어컨 탈거·설치 (대수)</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAirconCount((n) => Math.max(0, n - 1))} className="w-9 h-9 rounded-full border border-slate-300 font-black">−</button>
                <span className="w-6 text-center font-black">{airconCount}</span>
                <button type="button" onClick={() => setAirconCount((n) => Math.min(5, n + 1))} className="w-9 h-9 rounded-full bg-blue-600 text-white font-black">+</button>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <h3 className="font-black text-sm">요청사항 (선택)</h3>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="예) 오전 9시 이전 시작 희망, 폐기할 가구 있음 등"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="이름" maxLength={30} className="w-full border border-slate-300 rounded-xl px-3 py-3" />
            <input
              value={contact}
              onChange={(e) => setContact(formatPhone(e.target.value))}
              inputMode="tel"
              placeholder="휴대폰 번호 010-0000-0000" maxLength={13} autoComplete="tel"
              className="w-full border border-slate-300 rounded-xl px-3 py-3"
            />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
            <p className="font-black text-sm text-slate-800">개인정보 수집·이용 동의</p>
            <p>
              · 수집 항목: 이름, 연락처, 주소, 이사 물품·사진
              <br />· 이용 목적: 이사 견적 산정 및 안내(문자 발송)
              <br />· 보유 기간: <b>이사일로부터 14일 후 사진 삭제 및 개인정보 파기</b> (이사일 미정 시 접수 후 30일)
            </p>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="w-5 h-5" />
              위 내용에 동의합니다 (필수)
            </label>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => { setError(''); setStep((s) => s - 1) }} className="px-5 py-3.5 rounded-2xl border border-slate-300 font-bold">
              이전
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-black">
              다음
            </button>
          ) : (
            <button type="button" disabled={submitting} onClick={submit} className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-60">
              {submitting ? '접수 중...' : '제출하고 예상 견적 보기'}
            </button>
          )}
        </div>
      </div>

      {/* 물품 예시 팝업 */}
      {guideItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setGuideItem(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-center text-7xl">{guideItem.icon}</div>
            <h3 className="text-center text-lg font-black">
              {guideItem.name} <span className="text-sm text-slate-500">({guideItem.spec})</span>
            </h3>
            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <p>
                <b>대략 크기</b> {guideItem.size}
              </p>
              <p className="text-slate-600">{guideItem.guide}</p>
              {guideItem.needsDisassembly && <p className="text-amber-700 text-xs font-bold">※ 분해·조립이 필요할 수 있습니다.</p>}
            </div>
            <button type="button" onClick={() => setGuideItem(null)} className="w-full py-3 rounded-2xl bg-blue-600 text-white font-black">
              확인
            </button>
          </div>
        </div>
      )}

      {/* 주소 검색 */}
      {postcodeFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPostcodeFor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <b>주소 검색</b>
              <button type="button" onClick={() => setPostcodeFor(null)} className="text-slate-500">닫기</button>
            </div>
            <DaumPostcodeEmbed
              style={{ height: 460 }}
              onComplete={(d: { address: string; buildingName?: string }) => {
                const addr = d.address + (d.buildingName ? ` (${d.buildingName})` : '')
                if (postcodeFor === 'from') setFrom((s) => ({ ...s, address: addr }))
                else setTo((s) => ({ ...s, address: addr }))
                setPostcodeFor(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
