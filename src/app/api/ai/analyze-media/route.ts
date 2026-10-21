import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'
import os from 'os'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 긴 동영상 분석을 위해 최대 120초 허용

interface IdentifiedItemResult {
  location: string
  name: string
  spec: string
  quantity: number
  cbm: number
  innerBoxCbm: number
  treatment: '이동' | '폐기' | '내림' | '경유' | '존치'
  confidence?: number
  description?: string
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null
  let uploadedFileName: string | null = null
  let aiClient: GoogleGenAI | null = null

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const hintLocation = (formData.get('hintLocation') as string) || ''
    const customApiKey = (formData.get('customApiKey') as string) || ''

    const apiKey = customApiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY_MISSING',
          message: 'Gemini API 키가 설정되지 않았습니다. .env에 등록하거나 설정 팝업에서 API 키를 입력해주세요.'
        },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'FILE_MISSING', message: '업로드할 영상 또는 사진 파일이 없습니다.' },
        { status: 400 }
      )
    }

    // 1. MEMAN 표준 품목 및 공간 마스터 데이터 조회
    const [standardItems, locations] = await Promise.all([
      prisma.standardItem.findMany({
        include: { locations: true },
        orderBy: [{ name: 'asc' }, { spec: 'asc' }]
      }),
      prisma.locationCategory.findMany({
        orderBy: { order: 'asc' }
      })
    ])

    // 품목 마스터를 프롬프트에 주입하기 좋게 요약
    const masterItemsSummary = standardItems.map(item => ({
      name: item.name,
      spec: item.spec || '일반',
      cbm: item.defaultCbm,
      innerBoxCbm: item.defaultInnerCbm,
      locations: item.locations.map(l => l.name)
    }))

    const locationNames = locations.map(l => l.name)

    aiClient = new GoogleGenAI({ apiKey })

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: 'INVALID_FILE_TYPE', message: '동영상(MP4, WebM 등) 또는 이미지 파일만 지원됩니다.' },
        { status: 400 }
      )
    }

    // 프롬프트 구성
    const systemPrompt = `
당신은 대한민국 최고 수준의 이사 견적 전문가이자 CBM(부피) 산출 AI입니다.
제공된 ${isVideo ? '현장 영상' : '사진'}을 면밀히 분석하여, 이사 대상이 되는 모든 가구, 가전제품, 수납장, 잡화/박스류 물품을 식별하고 수량을 정확히 산출하십시오.

[중요 지침]
1. 카메라가 360도 회전하거나 이동하면서 동일한 물품(예: 거실 소파, 냉장고 등)이 여러 번 화면에 나타날 수 있습니다. 동일 물품은 절대로 중복 카운팅하지 말고 1개로 처리하십시오.
2. 각 물품은 아래 제공되는 [MEMAN 표준 품목 마스터] 리스트의 'name(품목명)'과 'spec(규격)'에 가장 근접한 것으로 분류 매핑하십시오.
3. 마스터 리스트에 일치하는 품목이 없을 경우에만 가장 직관적인 한국어 품목명과 적절한 규격을 작성하고, 부피(cbm)를 현실적으로 추정하십시오.
4. 공간(location) 분류:
   ${hintLocation ? `- 사용자가 지정한 촬영 공간 힌트: "${hintLocation}" (다른 방으로 이동한 명확한 장면이 아니라면 이 공간으로 분류)` : ''}
   - 아래 [MEMAN 표준 공간 목록] 중 가장 알맞은 공간을 배정하십시오.
5. 처리옵션(treatment):
   - 특별히 '버린다'거나 폐기 스티커/메모가 없는 한 기본값은 "이동"으로 설정하십시오. (선택지: "이동", "폐기", "내림", "경유", "존치")
6. 수납 내부 짐(innerBoxCbm):
   - 장롱, 서랍장, 씽크대, 냉장고 등 내부 짐이 많은 품목은 표준 마스터의 innerBoxCbm 값을 참고하여 반영하십시오.

[MEMAN 표준 공간 목록]
${JSON.stringify(locationNames)}

[MEMAN 표준 품목 마스터 (참조용)]
${JSON.stringify(masterItemsSummary)}

[반드시 준수할 출력 JSON 형식]
오직 순수한 JSON 형식만 반환하십시오 (마크다운 코드블록 백틱 기호 제외, 오직 JSON 객체):
{
  "summary": {
    "identifiedLocations": ["거실", "주방"],
    "totalDetectedItemsCount": 8,
    "estimatedTotalCbm": 14.5,
    "specialNotes": "대형 양문형 냉장고 및 4인용 가죽 소파 포함, 분해조립 필요 여부 확인 요망"
  },
  "items": [
    {
      "location": "거실",
      "name": "소파",
      "spec": "4인용",
      "quantity": 1,
      "cbm": 2.0,
      "innerBoxCbm": 0,
      "treatment": "이동",
      "confidence": 0.95,
      "description": "패브릭 4인용 일자형 소파"
    }
  ]
}
`

    let generatedText = ''

    if (isVideo) {
      // 비디오 파일의 경우: 임시 파일로 저장 후 Google Gen AI Files API 업로드
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const tempDir = os.tmpdir()
      const ext = path.extname(file.name) || '.mp4'
      tempFilePath = path.join(tempDir, `meman_ai_video_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`)
      await fs.promises.writeFile(tempFilePath, buffer)

      // Files API 업로드
      const uploadResponse = await aiClient.files.upload({
        file: tempFilePath,
        config: {
          mimeType: file.type || 'video/mp4'
        }
      })
      uploadedFileName = uploadResponse.name || null

      if (!uploadResponse.name) {
        throw new Error('파일 업로드 후 파일 식별자(name)를 수신하지 못했습니다.')
      }

      const validFileName = uploadResponse.name

      // 비디오 프로세싱 완료 대기 (폴링)
      let fileInfo = await aiClient.files.get({ name: validFileName })
      let waitSeconds = 0
      while (fileInfo.state === 'PROCESSING' && waitSeconds < 90) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        waitSeconds += 2
        fileInfo = await aiClient.files.get({ name: validFileName })
      }

      if (fileInfo.state !== 'ACTIVE') {
        throw new Error(`동영상 처리 실패 또는 지연 (상태: ${fileInfo.state})`)
      }

      // 비디오 분석 실행
      const modelResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  fileUri: fileInfo.uri,
                  mimeType: fileInfo.mimeType
                }
              },
              {
                text: systemPrompt
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      })

      generatedText = modelResponse.text || ''
    } else {
      // 이미지 파일의 경우: Base64 인라인 데이터로 즉시 전달
      const bytes = await file.arrayBuffer()
      const base64Data = Buffer.from(bytes).toString('base64')

      const modelResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: file.type || 'image/jpeg',
                  data: base64Data
                }
              },
              {
                text: systemPrompt
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      })

      generatedText = modelResponse.text || ''
    }

    // JSON 파싱 및 데이터 정제
    let parsedResult: { summary: any; items: IdentifiedItemResult[] }
    try {
      // 혹시 백틱(```json ... ```)이 포함되어 있다면 제거
      let cleanJson = generatedText.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      parsedResult = JSON.parse(cleanJson)
    } catch (parseErr) {
      console.error('AI 응답 JSON 파싱 실패:', generatedText, parseErr)
      return NextResponse.json(
        {
          error: 'PARSE_FAILED',
          message: 'AI가 반환한 결과를 처리할 수 없습니다. 다시 시도해주세요.',
          rawResponse: generatedText
        },
        { status: 500 }
      )
    }

    // 표준 마스터 데이터와 매칭 보정 (DB의 정확한 defaultCbm / innerCbm 적용)
    const masterMap = new Map<string, typeof standardItems[0]>()
    standardItems.forEach(item => {
      masterMap.set(`${item.name}__${item.spec || ''}`, item)
      // spec 없는 기본 키도 등록
      if (!masterMap.has(item.name)) {
        masterMap.set(item.name, item)
      }
    })

    const validatedItems = (parsedResult.items || []).map(item => {
      const key = `${item.name}__${item.spec || ''}`
      const matched = masterMap.get(key) || masterMap.get(item.name)

      // 촬영 공간 결정: 지정된 힌트가 있으면 힌트 우선, 없으면 AI 감지 공간 검증, 감지 실패 시 미지정("")으로 처리
      let finalLocation = ''
      if (hintLocation) {
        finalLocation = hintLocation
      } else if (item.location) {
        const matchedLoc = locations.find(l => l.name === item.location || l.name.includes(item.location) || item.location.includes(l.name))
        finalLocation = matchedLoc ? matchedLoc.name : (item.location.trim() === '미지정' || item.location.trim() === '기타' ? '' : item.location)
      }
      const finalName = matched ? matched.name : item.name
      const finalSpec = matched ? matched.spec : (item.spec || '')
      const finalCbm = matched ? matched.defaultCbm : (Number(item.cbm) || 0)
      const finalInnerBoxCbm = matched ? matched.defaultInnerCbm : (Number(item.innerBoxCbm) || 0)

      return {
        location: finalLocation,
        name: finalName,
        spec: finalSpec,
        quantity: Math.max(1, Number(item.quantity) || 1),
        cbm: finalCbm,
        innerBoxCbm: finalInnerBoxCbm,
        treatment: (['이동', '폐기', '내림', '경유', '존치'].includes(item.treatment) ? item.treatment : '이동') as '이동' | '폐기' | '내림' | '경유' | '존치',
        confidence: item.confidence || 0.9,
        description: item.description || ''
      }
    })

    // 재계산된 총 CBM
    const totalCbm = validatedItems.reduce((acc, cur) => {
      const isExcluded = cur.treatment === '폐기' || cur.treatment === '내림' || cur.treatment === '존치'
      const base = isExcluded ? 0 : cur.cbm
      return acc + (base + cur.innerBoxCbm) * cur.quantity
    }, 0)

    return NextResponse.json({
      success: true,
      summary: {
        ...(parsedResult.summary || {}),
        calculatedTotalCbm: Math.round(totalCbm * 10) / 10,
        itemCount: validatedItems.length
      },
      items: validatedItems
    })
  } catch (error: any) {
    console.error('AI 분석 오류:', error)
    return NextResponse.json(
      {
        error: 'ANALYSIS_ERROR',
        message: error.message || '영상/사진 분석 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  } finally {
    // 임시 로컬 파일 정리
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath)
      } catch (err) {
        console.warn('임시 파일 삭제 실패:', tempFilePath, err)
      }
    }
    // Files API 업로드 파일 정리
    if (aiClient && uploadedFileName) {
      try {
        await aiClient.files.delete({ name: uploadedFileName })
      } catch (err) {
        console.warn('Files API 임시 파일 삭제 실패:', uploadedFileName, err)
      }
    }
  }
}
