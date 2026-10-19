import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { APP_RELEASE_INFO } from '@/lib/appRelease'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'moveman.apk')

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'APK 파일을 찾을 수 없습니다. 배포 상태를 확인해주세요.' },
        { status: 404 }
      )
    }

    const stat = fs.statSync(filePath)
    const fileBuffer = fs.readFileSync(filePath)

    const filename = `moveman_${APP_RELEASE_INFO.version}.apk`

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('APK 다운로드 오류:', error)
    return NextResponse.json(
      { error: 'APK 파일 다운로드 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
