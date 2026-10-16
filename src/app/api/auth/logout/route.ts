import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

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
