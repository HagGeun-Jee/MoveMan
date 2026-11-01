import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const isDisabled = searchParams.get('disabled') === '1'
  await deleteSession()

  const targetUrl = new URL(isDisabled ? '/login?disabled=1' : '/login', request.url)
  const response = NextResponse.redirect(targetUrl)
  response.cookies.set({
    name: 'session',
    value: '',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  return response
}

export async function POST() {
  try {
    await deleteSession()
    const response = NextResponse.json({ success: true, message: '로그아웃되었습니다.' })
    response.cookies.set({
      name: 'session',
      value: '',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return response
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
