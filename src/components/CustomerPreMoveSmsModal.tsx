'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquareText,
  X,
  Send,
  Copy,
  Check,
  CalendarClock,
  Sparkles,
  Tag,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Share2,
  Clock,
  Phone,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { saveEstimateScheduledMessages } from '@/app/actions/estimate';

export interface ScheduledSmsItem {
  id: string;
  templateKey: string;
  title: string;
  recipientName: string;
  recipientPhone: string;
  scheduledAt: string; // ISO or YYYY-MM-DDTHH:mm
  content: string;
  status: 'RESERVED' | 'SENT' | 'CANCELLED';
  createdAt: string;
  sentAt?: string;
}

export interface PreMoveCbmItem {
  locationName?: string;
  name: string;
  spec?: string;
  quantity: number;
  treatment?: string; // '이동' | '폐기' | '내림' | '경유' | '존치'
}

export interface CustomerPreMoveSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimateId?: string;
  customerName: string;
  contact: string;
  movingType?: string;
  movingDate?: string | Date | null;
  packingDate?: string | Date | null;
  fromAddress?: string;
  toAddress?: string;
  fromWorkTypes?: string[];
  toWorkTypes?: string[];
  cbmItems?: PreMoveCbmItem[];
  installRequestItems?: string[];
  balanceAmount?: number;
  initialScheduledMessages?: ScheduledSmsItem[];
  onScheduledMessagesChange?: (messages: ScheduledSmsItem[]) => void;
}

type TemplateKey = 'INTEGRATED' | 'LABELING_GUIDE' | 'DAY_BEFORE' | 'CONTRACT_PREP';

interface SectionOptions {
  includeLabelingGuide: boolean;
  includeCustomTreatmentList: boolean;
  includeValuablesNotice: boolean;
  includeWorkEnvNotice: boolean;
  includeAppliancePrep: boolean;
  includeInstallRequestNotice: boolean;
  includeTrashAndUtilityNotice: boolean;
}

function formatDateKor(dateInput?: string | Date | null): string {
  if (!dateInput) return '미정';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dayName = weekDays[d.getDay()];
  return `${yyyy}년 ${mm}월 ${dd}일(${dayName})`;
}

function toDateInputString(dateInput?: string | Date | null, offsetDays = -1, hour = 10, minute = 0): string {
  const base = dateInput ? new Date(dateInput) : new Date(Date.now() + 86400000 * 2);
  const validBase = isNaN(base.getTime()) ? new Date(Date.now() + 86400000 * 2) : new Date(base);
  validBase.setDate(validBase.getDate() + offsetDays);
  const yyyy = validBase.getFullYear();
  const mm = String(validBase.getMonth() + 1).padStart(2, '0');
  const dd = String(validBase.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatScheduledDateTime(isoOrLocal: string): string {
  if (!isoOrLocal) return '-';
  const d = new Date(isoOrLocal);
  if (isNaN(d.getTime())) return isoOrLocal.replace('T', ' ');
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}(${weekDays[d.getDay()]}) ${hh}:${min}`;
}

export default function CustomerPreMoveSmsModal({
  isOpen,
  onClose,
  estimateId,
  customerName,
  contact,
  movingType = '포장이사',
  movingDate,
  packingDate,
  fromAddress = '',
  toAddress = '',
  fromWorkTypes = [],
  toWorkTypes = [],
  cbmItems = [],
  installRequestItems = [],
  balanceAmount = 0,
  initialScheduledMessages = [],
  onScheduledMessagesChange,
}: CustomerPreMoveSmsModalProps) {
  const [activeTab, setActiveTab] = useState<'COMPOSE' | 'SCHEDULE_LIST'>('COMPOSE');
  const [templateKey, setTemplateKey] = useState<TemplateKey>('INTEGRATED');
  const [recipientPhone, setRecipientPhone] = useState(contact || '');
  const [options, setOptions] = useState<SectionOptions>({
    includeLabelingGuide: true,
    includeCustomTreatmentList: true,
    includeValuablesNotice: true,
    includeWorkEnvNotice: true,
    includeAppliancePrep: true,
    includeInstallRequestNotice: true,
    includeTrashAndUtilityNotice: true,
  });

  const [messageText, setMessageText] = useState('');
  const [isManualEdited, setIsManualEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  // 발송예약 관련 상태
  const [scheduledAt, setScheduledAt] = useState<string>(() => toDateInputString(movingDate, -1, 10, 0));
  const [selectedPreset, setSelectedPreset] = useState<string>('D-1-AM');
  const [scheduledList, setScheduledList] = useState<ScheduledSmsItem[]>(initialScheduledMessages || []);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSavedBanner, setScheduleSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    setRecipientPhone(contact || '');
  }, [contact]);

  useEffect(() => {
    setScheduledList(initialScheduledMessages || []);
  }, [initialScheduledMessages]);

  useEffect(() => {
    if (movingDate) {
      setScheduledAt(toDateInputString(movingDate, -1, 10, 0));
      setSelectedPreset('D-1-AM');
    }
  }, [movingDate]);

  // 품목별 처리구분(폐기/내림/경유/존치) 분류
  const groupedTreatments = useMemo(() => {
    const validItems = (cbmItems || []).filter((item) => Number(item.quantity) > 0);
    const groups: Record<string, PreMoveCbmItem[]> = {
      폐기: [],
      내림: [],
      경유: [],
      존치: [],
    };
    validItems.forEach((item) => {
      const t = (item.treatment || '이동').trim();
      if (t !== '이동' && groups[t]) {
        groups[t].push(item);
      }
    });
    return groups;
  }, [cbmItems]);

  const hasSpecialTreatmentItems = useMemo(() => {
    return (
      groupedTreatments['폐기'].length > 0 ||
      groupedTreatments['내림'].length > 0 ||
      groupedTreatments['경유'].length > 0 ||
      groupedTreatments['존치'].length > 0
    );
  }, [groupedTreatments]);

  // 템플릿 및 옵션 기반 문자 문구 자동 생성
  const generatedMessage = useMemo(() => {
    const cust = customerName?.trim() ? `${customerName.trim()} 고객님` : '고객님';
    const moveDateStr = formatDateKor(movingDate);
    const packDateStr = packingDate ? formatDateKor(packingDate) : '';
    const hasLadder =
      fromWorkTypes.includes('사다리차') || toWorkTypes.includes('사다리차');
    const hasElevator =
      fromWorkTypes.includes('엘리베이터') || toWorkTypes.includes('엘리베이터');

    // 처리구분 사전표기 가이드 블록
    const buildLabelingBlock = () => {
      const lines: string[] = [];
      lines.push(`■ [물품 처리구분 사전표기 가이드]`);
      lines.push(`원활하고 정확한 작업을 위해 일반 이사(이동) 물품 외 아래 물품에는 포스트잇·견출지·종이테이프로 사전 표기(부착)를 꼭 부탁드립니다.`);
      lines.push(`• [이동] : 도착지까지 정상 운반 (별도 표기 불필요)`);
      lines.push(`• [폐기] : 버릴 가구/가전 → 전면에 '폐기' 메모 부착`);
      lines.push(`• [내림] : 1층/수거장까지만 내려둘 물품 → '내림' 표기`);
      lines.push(`• [경유] : 타 주소지 경유 전달 물품 → '경유' 표기 및 모아두기`);
      lines.push(`• [존치] : 가져가지 않고 현장에 그대로 둘 물품 → '존치(이사가구 아님)' 표기`);

      if (options.includeCustomTreatmentList && hasSpecialTreatmentItems) {
        lines.push(``);
        lines.push(`▶ 견적 시 확인된 고객님 댁 사전표기 대상 물품`);
        (['폐기', '내림', '경유', '존치'] as const).forEach((typeKey) => {
          const list = groupedTreatments[typeKey];
          if (list && list.length > 0) {
            const summary = list
              .map((it) => {
                const loc = it.locationName ? `[${it.locationName}]` : '';
                const spec = it.spec ? `(${it.spec})` : '';
                return `${loc}${it.name}${spec} ${it.quantity}개`;
              })
              .join(', ');
            lines.push(` - [${typeKey}] : ${summary}`);
          }
        });
      }
      return lines.join('\n');
    };

    // 당부사항 블록들
    const buildValuablesBlock = () =>
      `■ [귀중품 및 중요 물품 직접 보관]\n• 현금, 유가증권, 귀금속, 중요 서류, 노트북, 상비약, 차량 스마트키 등은 분실 예방을 위해 반드시 고객님께서 직접 휴대(차량 보관)해 주세요.`;

    const buildWorkEnvBlock = () => {
      const envLines: string[] = [`■ [작업차량 주차 및 승강기 사전 확보]`];
      if (hasLadder) {
        envLines.push(`• 사다리차 및 이사탑차 진입을 위해 출발지·도착지 건물 앞 주차공간을 전날 저녁부터 미리 확보(라바콘/관리실 협조) 부탁드립니다.`);
      } else {
        envLines.push(`• 이사탑차 정차를 위해 출발지·도착지 입구 주변 주차공간 확보를 부탁드립니다.`);
      }
      if (hasElevator) {
        envLines.push(`• 엘리베이터 사용 시간 예약 및 보양 작업 여부를 양쪽 관리사무소에 사전 확인 부탁드립니다.`);
      }
      return envLines.join('\n');
    };

    const buildApplianceBlock = () =>
      `■ [냉장고·세탁기 및 가구 사전 준비]\n• 세탁기 내부 잔수(물)를 비워주시고, 냉장고 내 변질 우려 식품 및 개봉된 액체류(국물·음료)는 미리 정리하거나 밀폐해 주세요.\n• 분실 위험이 있는 아주 작은 소품은 별도 파우치에 모아주시면 더욱 안전합니다.`;

    const buildInstallRequestBlock = () => {
      if (!installRequestItems || installRequestItems.length === 0) {
        return `■ [전문 업체 설치 품목 사전 안내]\n• 벽걸이TV, 에어컨, 정수기, 비데, 식기세척기 등 배관/타공이 필요한 가전은 안전상 운반작업만 진행되오니 제조사/전문업체 사전 분리·설치 예약을 확인해 주세요.`;
      }
      return `■ [업체 설치 의뢰 품목 확인]\n• 대상 품목 : ${installRequestItems.join(', ')}\n• 위 품목은 당일 안전한 '운반작업'만 진행되오니, 제조사 서비스센터 또는 전문 설치업체를 통한 분리/설치 예약을 꼭 확인해 주세요.`;
    };

    const buildTrashAndUtilityBlock = () => {
      const lines = [
        `■ [쓰레기 종량제봉투 및 필수 체크사항]`,
        `• 이사 당일 발생하는 생활쓰레기 처리를 위해 출발지 지역 '쓰레기 종량제봉투(50L~75L 1~2장)'를 미리 준비해 주세요.`,
        `• 폐기 및 내림 가구/가전은 지자체 대형폐기물 스티커(또는 모바일 배출번호)를 사전에 부착해 주세요.`,
        `• 도시가스 차단 예약, 관리비·공과금 정산, 도착지 도어락 비밀번호를 미리 확인해 두시면 당일 작업이 한결 빨라집니다.`,
      ];
      if (balanceAmount > 0) {
        lines.push(`• 이사 잔금(${balanceAmount.toLocaleString()}원)은 작업 완료 후 현장 결제로 진행될 예정이니 이체 한도 등을 미리 확인 부탁드립니다.`);
      }
      return lines.join('\n');
    };

    if (templateKey === 'LABELING_GUIDE') {
      const parts: string[] = [
        `[MEMAN 이사 물품 처리구분 사전표기 안내]`,
        `안녕하세요, ${cust}!`,
        `다가오는 ${moveDateStr} (${movingType}) 작업이 신속하고 정확하게 진행될 수 있도록 물품별 [처리구분 사전표기 가이드]를 안내드립니다.`,
        ``,
        buildLabelingBlock(),
      ];
      if (options.includeTrashAndUtilityNotice) {
        parts.push(
          ``,
          `■ [폐기/내림 물품 스티커 안내]`,
          `• 폐기 또는 1층 내림 물품은 지자체 대형폐기물 스티커(또는 인터넷 배출 신고번호 메모)를 물품 전면에 함께 부착해 주시면 당일 현장에서 지정 위치로 안전하게 배출해 드립니다.`
        );
      }
      parts.push(
        ``,
        `추가되거나 변경된 물품이 있으시면 언제든 편하게 연락 주세요. 감사합니다!`
      );
      return parts.join('\n');
    }

    if (templateKey === 'DAY_BEFORE') {
      const parts: string[] = [
        `[MEMAN 내일 이사 최종 확인 및 당부 안내]`,
        `안녕하세요, ${cust}!`,
        `내일(${moveDateStr}${packDateStr ? `, 포장일: ${packDateStr}` : ''}) 예정된 ${movingType} 관련하여 최종 당부사항을 안내드립니다.`,
        ``,
        `■ [이사 일정 요약]`,
        `• 이사일자 : ${moveDateStr}`,
        fromAddress ? `• 출발지 : ${fromAddress}` : '',
        toAddress ? `• 도착지 : ${toAddress}` : '',
      ].filter(Boolean);

      if (options.includeValuablesNotice) parts.push(``, buildValuablesBlock());
      if (options.includeLabelingGuide) parts.push(``, buildLabelingBlock());
      if (options.includeWorkEnvNotice) parts.push(``, buildWorkEnvBlock());
      if (options.includeTrashAndUtilityNotice) parts.push(``, buildTrashAndUtilityBlock());

      parts.push(
        ``,
        `내일 아침 현장팀이 출발 전 해피콜 연락 후 방문드릴 예정입니다. 편안한 저녁 보내시고 내일 뵙겠습니다!`
      );
      return parts.join('\n');
    }

    if (templateKey === 'CONTRACT_PREP') {
      const parts: string[] = [
        `[MEMAN 이사 계약 확정 및 사전 준비 체크리스트]`,
        `안녕하세요, ${cust}! 저희 MEMAN 이사를 믿고 맡겨주셔서 진심으로 감사드립니다.`,
        `고객님의 소중한 이사일(${moveDateStr}) 전까지 미리 챙기시면 좋은 사전 준비 가이드를 보내드립니다.`,
        ``,
        `■ [이사 예약 정보]`,
        `• 이사종류 : ${movingType}`,
        `• 이사일자 : ${moveDateStr}`,
        fromAddress ? `• 출발지 : ${fromAddress}` : '',
        toAddress ? `• 도착지 : ${toAddress}` : '',
      ].filter(Boolean);

      if (options.includeWorkEnvNotice) parts.push(``, buildWorkEnvBlock());
      if (options.includeInstallRequestNotice) parts.push(``, buildInstallRequestBlock());
      if (options.includeLabelingGuide) parts.push(``, buildLabelingBlock());
      if (options.includeTrashAndUtilityNotice) parts.push(``, buildTrashAndUtilityBlock());

      parts.push(
        ``,
        `이사 전 변동사항이나 궁금하신 점이 있으시면 언제든 연락 부탁드립니다. 정성을 다해 준비하겠습니다!`
      );
      return parts.join('\n');
    }

    // 기본값: INTEGRATED (통합 당부사항 + 처리구분 사전표기 가이드)
    const parts: string[] = [
      `[MEMAN 이사 전 고객 당부사항 및 사전표기 안내]`,
      `안녕하세요, ${cust}!`,
      `${moveDateStr} (${movingType}) 일정을 앞두고 원활하고 안전한 이사를 위한 사전 당부사항과 물품 표기 가이드를 안내드립니다.`,
    ];

    if (options.includeLabelingGuide) parts.push(``, buildLabelingBlock());
    if (options.includeValuablesNotice) parts.push(``, buildValuablesBlock());
    if (options.includeWorkEnvNotice) parts.push(``, buildWorkEnvBlock());
    if (options.includeAppliancePrep) parts.push(``, buildApplianceBlock());
    if (options.includeInstallRequestNotice && installRequestItems.length > 0) {
      parts.push(``, buildInstallRequestBlock());
    }
    if (options.includeTrashAndUtilityNotice) parts.push(``, buildTrashAndUtilityBlock());

    parts.push(
      ``,
      `이사 당일 최선을 다해 깔끔하고 안전하게 모시겠습니다. 문의사항은 언제든 연락 주세요. 감사합니다!`
    );
    return parts.join('\n');
  }, [
    templateKey,
    options,
    customerName,
    movingDate,
    packingDate,
    movingType,
    fromAddress,
    toAddress,
    fromWorkTypes,
    toWorkTypes,
    hasSpecialTreatmentItems,
    groupedTreatments,
    installRequestItems,
    balanceAmount,
  ]);

  useEffect(() => {
    if (!isManualEdited) {
      setMessageText(generatedMessage);
    }
  }, [generatedMessage, isManualEdited]);

  if (!isOpen) return null;

  const handleSelectTemplate = (key: TemplateKey) => {
    setTemplateKey(key);
    setIsManualEdited(false);
  };

  const toggleOption = (key: keyof SectionOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    setIsManualEdited(false);
  };

  const applySchedulePreset = (preset: string, offsetDays: number, hour: number) => {
    setSelectedPreset(preset);
    setScheduledAt(toDateInputString(movingDate, offsetDays, hour, 0));
  };

  const handleCopyText = async (textToCopy = messageText) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenSmsApp = (phone = recipientPhone, bodyText = messageText) => {
    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isIos = /iphone|ipad|ipod/.test(ua);
    const sep = isIos ? '&' : '?';
    const smsHref = `sms:${cleanPhone}${sep}body=${encodeURIComponent(bodyText)}`;
    window.location.href = smsHref;
  };

  const handleNativeShare = async (bodyText = messageText) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${customerName || '고객'}님 이사 사전 안내`,
          text: bodyText,
        });
        return;
      } catch {
        // 취소 시 무시
      }
    }
    await handleCopyText(bodyText);
  };

  const persistSchedules = async (nextList: ScheduledSmsItem[]) => {
    setScheduledList(nextList);
    onScheduledMessagesChange?.(nextList);
    if (estimateId) {
      setIsSavingSchedule(true);
      try {
        await saveEstimateScheduledMessages(estimateId, nextList);
      } finally {
        setIsSavingSchedule(false);
      }
    }
  };

  const handleReserveSchedule = async () => {
    if (!messageText.trim()) {
      alert('발송할 문자 내용을 입력해 주세요.');
      return;
    }
    if (!scheduledAt) {
      alert('발송예약 일시를 선택해 주세요.');
      return;
    }

    const templateTitleMap: Record<TemplateKey, string> = {
      INTEGRATED: '이사 전 고객 당부사항 + 처리구분 사전표기 안내',
      LABELING_GUIDE: '물품 처리구분(폐기·내림·경유·존치) 사전표기 가이드',
      DAY_BEFORE: '이사 전날(D-1) 최종 확인 및 당부 안내',
      CONTRACT_PREP: '이사 계약 확정 및 사전 준비 체크리스트',
    };

    const newItem: ScheduledSmsItem = {
      id: `SMS_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      templateKey,
      title: templateTitleMap[templateKey],
      recipientName: customerName || '고객',
      recipientPhone: recipientPhone || contact || '',
      scheduledAt,
      content: messageText,
      status: 'RESERVED',
      createdAt: new Date().toISOString(),
    };

    const nextList = [newItem, ...scheduledList];
    await persistSchedules(nextList);
    setScheduleSavedBanner(
      `${formatScheduledDateTime(scheduledAt)} 발송예약이 저장되었습니다.`
    );
    setTimeout(() => setScheduleSavedBanner(null), 4000);
    setActiveTab('SCHEDULE_LIST');
  };

  const handleMarkSent = async (id: string) => {
    const nextList = scheduledList.map((item) =>
      item.id === id
        ? { ...item, status: 'SENT' as const, sentAt: new Date().toISOString() }
        : item
    );
    await persistSchedules(nextList);
  };

  const handleDeleteSchedule = async (id: string) => {
    const nextList = scheduledList.filter((item) => item.id !== id);
    await persistSchedules(nextList);
  };

  const reservedCount = scheduledList.filter((i) => i.status === 'RESERVED').length;
  const byteLength = new Blob([messageText]).size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:hidden"
      data-modal-open="true"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 모달 헤더 */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-blue-600 text-white px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-white/15 rounded-xl shrink-0">
              <MessageSquareText size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                이사 전 고객 당부사항 & 처리구분 사전표기 문자 / 발송예약
              </h2>
              <p className="text-xs text-blue-100 truncate">
                {customerName || '고객'}님 ({recipientPhone || '연락처 미입력'}) · 이사일:{' '}
                {formatDateKor(movingDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 상단 세그먼트 탭 */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('COMPOSE')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'COMPOSE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles size={14} />
              안내문구 작성 및 발송/예약
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SCHEDULE_LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'SCHEDULE_LIST'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CalendarClock size={14} />
              발송예약 관리
              {reservedCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[11px] rounded-full font-extrabold ${
                    activeTab === 'SCHEDULE_LIST'
                      ? 'bg-white text-blue-700'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {reservedCount}건
                </span>
              )}
            </button>
          </div>

          {hasSpecialTreatmentItems && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
              <Tag size={12} />
              견적서 처리구분 물품 자동 반영됨
            </span>
          )}
        </div>

        {/* 알림 배너 */}
        {scheduleSavedBanner && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{scheduleSavedBanner}</span>
          </div>
        )}

        {/* 본문 영역 */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'COMPOSE' ? (
            <>
              {/* 1. 문구 템플릿 선택 */}
              <div>
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                  1. 안내 문자 템플릿 선택
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      key: 'INTEGRATED' as TemplateKey,
                      badge: '추천 · D-3 ~ D-1',
                      title: '통합 안내 (이사 전 당부사항 + 처리구분 표기가이드)',
                      desc: '사전표기 방법(폐기/내림/경유/존치)과 귀중품·주차·가전 준비사항 한 번에 안내',
                    },
                    {
                      key: 'LABELING_GUIDE' as TemplateKey,
                      badge: '사전표기 집중',
                      title: '물품 처리구분(폐기·내림·경유·존치) 사전표기 가이드',
                      desc: '포스트잇·견출지 표기법 및 견적서에 등록된 고객님 댁 표기 대상 물품 목록 안내',
                    },
                    {
                      key: 'DAY_BEFORE' as TemplateKey,
                      badge: '이사 전날 D-1',
                      title: '내일 이사 최종 확인 및 당부 안내',
                      desc: '이사 하루 전 일정 확인, 귀중품 직접 휴대, 주차/엘리베이터, 잔금 안내',
                    },
                    {
                      key: 'CONTRACT_PREP' as TemplateKey,
                      badge: '계약 직후',
                      title: '이사 계약 확정 및 사전 준비 체크리스트',
                      desc: '엘리베이터 예약, 업체 설치 가전 분리/설치 예약, 대형폐기물 스티커 사전 안내',
                    },
                  ].map((tpl) => {
                    const isSelected = templateKey === tpl.key;
                    return (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl.key)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {tpl.badge}
                          </span>
                          {isSelected && (
                            <span className="text-xs font-bold text-blue-700">선택됨 ✓</span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900">
                          {tpl.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                          {tpl.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 포함할 세부 안내 항목 체크박스 */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-gray-700">
                    2. 문구에 포함할 세부 항목 (체크 시 자동 반영)
                  </span>
                  {isManualEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualEdited(false);
                        setMessageText(generatedMessage);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      자동 생성 문구로 복원
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    {
                      key: 'includeLabelingGuide' as const,
                      label: '처리구분(폐기/내림/경유/존치) 표기 가이드',
                    },
                    {
                      key: 'includeCustomTreatmentList' as const,
                      label: `견적서 내 고객 맞춤 표기물품 (${
                        hasSpecialTreatmentItems ? '있음' : '해당없음'
                      })`,
                    },
                    {
                      key: 'includeValuablesNotice' as const,
                      label: '귀중품·현금·중요서류 직접 보관 당부',
                    },
                    {
                      key: 'includeWorkEnvNotice' as const,
                      label: '사다리차 주차확보 / 엘리베이터 예약 안내',
                    },
                    {
                      key: 'includeAppliancePrep' as const,
                      label: '냉장고·세탁기 잔수 및 소품 사전 정리',
                    },
                    {
                      key: 'includeInstallRequestNotice' as const,
                      label: `업체 설치 의뢰 품목 안내 (${installRequestItems.length}건)`,
                    },
                    {
                      key: 'includeTrashAndUtilityNotice' as const,
                      label: '종량제봉투·폐기물스티커·도시가스·잔금 안내',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 text-xs font-medium text-gray-800 bg-white px-2.5 py-2 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={options[opt.key]}
                        onChange={() => toggleOption(opt.key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {/* 견적서 처리구분 요약 미리보기 배지 */}
                {hasSpecialTreatmentItems && (
                  <div className="mt-2.5 pt-2.5 border-t border-gray-200/80 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-gray-600 mr-1">
                      📋 견적서 처리구분 자동 감지:
                    </span>
                    {groupedTreatments['폐기'].length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold">
                        폐기 {groupedTreatments['폐기'].length}건
                      </span>
                    )}
                    {groupedTreatments['내림'].length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                        내림 {groupedTreatments['내림'].length}건
                      </span>
                    )}
                    {groupedTreatments['경유'].length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                        경유 {groupedTreatments['경유'].length}건
                      </span>
                    )}
                    {groupedTreatments['존치'].length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 font-bold">
                        존치 {groupedTreatments['존치'].length}건
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3. 문자 본문 편집기 및 수신번호 */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-extrabold text-gray-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-600" />
                    3. 발송 문구 확인 및 자유 편집
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                      <Phone size={13} className="text-gray-500" />
                      <span className="text-[11px] font-bold text-gray-600">수신번호:</span>
                      <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="bg-transparent text-xs font-bold text-gray-900 w-28 focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500">
                      LMS 장문 ({byteLength.toLocaleString()} bytes)
                    </span>
                  </div>
                </div>

                <textarea
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    setIsManualEdited(true);
                  }}
                  rows={13}
                  className="w-full rounded-xl border border-gray-300 p-3.5 text-xs sm:text-sm text-gray-900 leading-relaxed font-sans focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none resize-y bg-white shadow-inner"
                  placeholder="안내 문구를 입력하세요..."
                />
              </div>

              {/* 4. 발송예약 설정 박스 */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-amber-700 shrink-0" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                        4. 문자 발송예약 설정
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        원하는 발송 일시를 지정하여 예약 등록하면 견적서에 보관되며 예약 시각에 바로 발송할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {[
                    { id: 'D-3-AM', label: '이사 3일 전 (D-3) 10:00', offset: -3, hour: 10 },
                    { id: 'D-2-AM', label: '이사 2일 전 (D-2) 10:00', offset: -2, hour: 10 },
                    { id: 'D-1-AM', label: '이사 하루 전 (D-1) 10:00', offset: -1, hour: 10 },
                    { id: 'D-1-PM', label: '이사 하루 전 (D-1) 17:00', offset: -1, hour: 17 },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applySchedulePreset(p.id, p.offset, p.hour)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        selectedPreset === p.id
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-300 flex-1">
                    <Clock size={15} className="text-amber-700 shrink-0" />
                    <span className="text-xs font-bold text-gray-700 shrink-0">예약 일시:</span>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => {
                        setScheduledAt(e.target.value);
                        setSelectedPreset('CUSTOM');
                      }}
                      className="text-xs sm:text-sm font-bold text-gray-900 bg-transparent focus:outline-none w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleReserveSchedule}
                    disabled={isSavingSchedule}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0"
                  >
                    <CalendarClock size={16} />
                    {isSavingSchedule ? '예약 저장 중...' : '현재 문구로 발송예약 등록'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* 발송예약 관리 탭 */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                  <CalendarClock size={16} className="text-blue-600" />
                  등록된 발송예약 목록 ({scheduledList.length}건)
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('COMPOSE')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  + 새 예약 문구 작성하기
                </button>
              </div>

              {scheduledList.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-8 text-center">
                  <CalendarClock size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-700">
                    등록된 문자 발송예약 내역이 없습니다.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    [안내문구 작성 및 발송/예약] 탭에서 이사 전 당부사항 및 처리구분 가이드를 예약해 보세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledList.map((item) => {
                    const isDue =
                      item.status === 'RESERVED' &&
                      new Date(item.scheduledAt).getTime() <= Date.now();
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 transition-all ${
                          item.status === 'SENT'
                            ? 'bg-gray-50 border-gray-200'
                            : isDue
                            ? 'bg-red-50/50 border-red-300 ring-1 ring-red-200'
                            : 'bg-white border-blue-200 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {item.status === 'SENT' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                발송완료
                              </span>
                            ) : isDue ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-600 text-white animate-pulse">
                                ⏰ 발송시각 도래 (발송요망)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                예약대기
                              </span>
                            )}
                            <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                              {item.title}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                            <span>예약일시: {formatScheduledDateTime(item.scheduledAt)}</span>
                            <span>·</span>
                            <span>수신: {item.recipientPhone || '번호미지정'}</span>
                          </div>
                        </div>

                        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto mb-3">
                          {item.content}
                        </pre>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenSmsApp(item.recipientPhone, item.content)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <Send size={13} />
                            문자앱 열기
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyText(item.content)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold flex items-center gap-1"
                          >
                            <Copy size={13} />
                            문구 복사
                          </button>
                          {item.status !== 'SENT' && (
                            <button
                              type="button"
                              onClick={() => handleMarkSent(item.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} />
                              발송완료 처리
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(item.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1"
                          >
                            <Trash2 size={13} />
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 즉시 발송 / 복사 액션 푸터 */}
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <AlertCircle size={14} className="text-blue-600 shrink-0" />
            <span>
              [문자앱 바로 보내기] 클릭 시 휴대폰 기본 문자메시지 앱에 문구와 수신번호가 자동 입력됩니다.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleCopyText(messageText)}
              className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={15} className="text-emerald-600" />
                  <span className="text-emerald-700">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>문구 복사 (카톡/문자)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNativeShare(messageText)}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 size={15} />
              <span>공유</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenSmsApp(recipientPhone, messageText)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Send size={15} />
              <span>휴대폰 문자앱(SMS) 열기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 견적 상세 페이지(Server Component) 등에서 간편하게 버튼 + 예약배너 + 모달을 렌더링하는 트리거 래퍼
 */
export function CustomerPreMoveSmsTrigger({
  estimateId,
  customerName,
  contact,
  movingType,
  movingDate,
  packingDate,
  fromAddress,
  toAddress,
  fromWorkTypes,
  toWorkTypes,
  cbmItems,
  installRequestItems,
  balanceAmount,
  initialScheduledMessages = [],
  variant = 'header',
}: Omit<CustomerPreMoveSmsModalProps, 'isOpen' | 'onClose'> & {
  variant?: 'header' | 'inline';
}) {
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState<ScheduledSmsItem[]>(
    initialScheduledMessages || []
  );

  const reservedCount = schedules.filter((s) => s.status === 'RESERVED').length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="이사 전 고객 당부사항 및 처리구분 사전표기 문자/발송예약"
        className={
          variant === 'header'
            ? 'px-2 sm:px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 shrink-0 whitespace-nowrap print:hidden'
            : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors print:hidden'
        }
      >
        <MessageSquareText size={13} className="shrink-0" />
        <span>{variant === 'header' ? '안내문자' : '사전안내 문자/예약'}</span>
        {reservedCount > 0 && (
          <span className="px-1.5 py-0.2 bg-amber-300 text-amber-950 rounded-full text-[10px] font-extrabold leading-none">
            {reservedCount}
          </span>
        )}
      </button>

      <CustomerPreMoveSmsModal
        isOpen={open}
        onClose={() => setOpen(false)}
        estimateId={estimateId}
        customerName={customerName}
        contact={contact}
        movingType={movingType}
        movingDate={movingDate}
        packingDate={packingDate}
        fromAddress={fromAddress}
        toAddress={toAddress}
        fromWorkTypes={fromWorkTypes}
        toWorkTypes={toWorkTypes}
        cbmItems={cbmItems}
        installRequestItems={installRequestItems}
        balanceAmount={balanceAmount}
        initialScheduledMessages={schedules}
        onScheduledMessagesChange={setSchedules}
      />
    </>
  );
}

