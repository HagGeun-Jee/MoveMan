import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'
import { cookies } from 'next/headers'

const protectedRoutes = ['/', '/estimates']
const publicRoutes = ['/login']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // 정적 파일 등은 무시 (config matcher에서 대부분 필터링되지만 안전장치)
  if (path.includes('.')) {
    return NextResponse.next()
  }

  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)

  // 로그인 페이지 접근 시
  if (path === '/login') {
    if (session?.userId) {
      // 이미 로그인 된 상태라면 메인으로 리다이렉트
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
    return NextResponse.next()
  }

  // 로그인 페이지가 아닌 다른 페이지 접근 시
  if (!session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // 비밀번호 변경이 필요한 사용자이고, 현재 경로가 /change-password가 아니면 리다이렉트
  if (session.requiresPasswordChange && path !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.nextUrl))
  }

  // 비밀번호 변경이 필요없는 사용자가 /change-password에 접근하면 메인으로 리다이렉트
  if (!session.requiresPasswordChange && path === '/change-password') {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
