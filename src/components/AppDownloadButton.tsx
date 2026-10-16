'use client'

import { useState } from 'react'
import { Smartphone, Download, Copy, Check, ExternalLink, HelpCircle, X } from 'lucide-react'
import { APP_RELEASE_INFO } from '@/lib/appRelease'

interface AppDownloadButtonProps {
  className?: string
  variant?: 'login' | 'sidebar' | 'inline'
}

declare global {
  interface Window {
    AndroidDownloader?: {
      download: (url: string) => void
    }
  }
}

export function AppDownloadButton({ className, variant = 'inline' }: AppDownloadButtonProps) {
  const [showGuide, setShowGuide] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloadStarted, setDownloadStarted] = useState(false)

  const getDownloadUrl = () => {
    if (typeof window === 'undefined') return 'https://move-man.onrender.com/api/download/apk'
    const origin = window.location.origin
    // Capacitor 웹뷰(localhost 또는 capacitor://) 환경일 때는 공식 라이브 서버 절대경로 사용
    if (origin.includes('localhost') && !origin.includes(':3000')) {
      return 'https://move-man.onrender.com/api/download/apk'
    }
    return `${origin}/api/download/apk`
  }

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()

    const downloadUrl = getDownloadUrl()
    setDownloadStarted(true)

    // 1. 네이티브 안드로이드 앱(Capacitor 웹뷰)인 경우 네이티브 다운로더 인터페이스 호출
    if (typeof window !== 'undefined' && window.AndroidDownloader?.download) {
      window.AndroidDownloader.download(downloadUrl)
      return
    }

    // 2. 모바일/PC 웹 브라우저인 경우 가상 앵커 클릭 및 location 이동
    try {
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'moveman.apk'
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      window.location.href = downloadUrl
    }
  }

  const handleCopyLink = async () => {
    const url = 'https://move-man.onrender.com/api/download/apk'
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      alert(`링크 주소: ${url}`)
    }
  }

  if (variant === 'sidebar') {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={handleDownload}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-sm active:scale-98 transition-all"
        >
          <div className="flex items-center gap-1.5">
            <Smartphone size={15} />
            <span>안드로이드 앱(APK) 다운로드</span>
          </div>
          <span className="text-[10px] text-blue-100 font-normal">
            최근 릴리즈: {APP_RELEASE_INFO.releaseDate} ({APP_RELEASE_INFO.version})
          </span>
        </button>

        <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-gray-500">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="hover:text-blue-600 flex items-center gap-0.5 underline underline-offset-2"
          >
            <HelpCircle size={11} />
            설치 방법 안내
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="hover:text-blue-600 flex items-center gap-0.5"
          >
            {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
            {copied ? '링크 복사됨' : '링크 복사'}
          </button>
        </div>

        {/* 가이드 모달 */}
        {showGuide && (
          <GuideModal onClose={() => setShowGuide(false)} onCopyLink={handleCopyLink} copied={copied} onDownload={handleDownload} />
        )}
      </div>
    )
  }

  if (variant === 'login') {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-bold text-xs rounded-lg transition-all shadow-xs"
        >
          <Download size={15} />
          <span>📥 앱(APK) 다운로드 및 설치</span>
        </button>

        <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-gray-500">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
          >
            <HelpCircle size={12} />
            설치 및 다운로드 안내
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-gray-600 hover:text-blue-600 flex items-center gap-0.5 font-medium"
          >
            {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            {copied ? '링크 복사완료' : '다운로드 링크 복사'}
          </button>
        </div>

        {downloadStarted && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-left text-[11px] text-blue-900 animate-fadeIn">
            <p className="font-bold flex items-center gap-1">
              <Check size={13} className="text-blue-600" />
              다운로드가 시작되었습니다!
            </p>
            <p className="text-gray-600 mt-0.5">
              스마트폰 상단 알림창을 아래로 내려 <strong>moveman.apk</strong>를 터치하여 설치하세요.
            </p>
          </div>
        )}

        {/* 가이드 모달 */}
        {showGuide && (
          <GuideModal onClose={() => setShowGuide(false)} onCopyLink={handleCopyLink} copied={copied} onDownload={handleDownload} />
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={className || "px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"}
    >
      앱 다운로드
    </button>
  )
}

function GuideModal({
  onClose,
  onCopyLink,
  copied,
  onDownload
}: {
  onClose: () => void
  onCopyLink: () => void
  copied: boolean
  onDownload: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scaleUp">
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="text-blue-600" size={20} />
            <h3 className="font-bold text-gray-900 text-base">안드로이드 앱 설치 안내</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="text-xs text-gray-700 space-y-2.5 leading-relaxed">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-950">
            <p className="font-bold mb-1">📱 스마트폰 다운로드 순서:</p>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>아래 <strong>[지금 다운로드]</strong> 버튼을 터치합니다.</li>
              <li>스마트폰 화면 상단 알림창을 아래로 끌어내립니다.</li>
              <li><strong>moveman.apk</strong> 다운로드 완료 알림을 터치합니다.</li>
              <li>화면의 안내에 따라 <strong>[설치]</strong>를 누릅니다.</li>
            </ol>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
            <p className="font-bold mb-0.5">⚠️ 주의사항:</p>
            <p>
              '출처를 알 수 없는 앱' 또는 '유해한 파일' 경고가 나타나면 구글 플레이스토어 외부 직접 설치 앱이므로 <strong>[무시하고 다운로드/설치]</strong> 또는 <strong>[설정 허용]</strong>을 선택하시면 됩니다.
            </p>
          </div>

          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-gray-600 text-[11px]">
            <p className="font-bold mb-1">🌐 카카오톡 등 인앱 브라우저 이용 시:</p>
            <p className="mb-2">카카오톡 내부에서는 파일 다운로드가 차단될 수 있습니다. 아래 [링크 복사] 후 <strong>크롬(Chrome)이나 삼성인터넷</strong> 주소창에 붙여넣기 하세요.</p>
            <button
              onClick={onCopyLink}
              className="w-full py-1.5 px-2 bg-white border border-gray-300 rounded-lg text-gray-800 font-bold flex items-center justify-center gap-1 hover:bg-gray-50 active:scale-98 transition-all"
            >
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copied ? '다운로드 링크가 복사되었습니다!' : '다운로드 URL 링크 복사하기'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              onDownload()
              onClose()
            }}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Download size={14} />
            지금 다운로드 시작
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
