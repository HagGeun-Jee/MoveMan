import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { UserRegisterForm } from './UserRegisterForm'
import { ResetPasswordButton } from './ResetPasswordButton'

export default async function UsersPage() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  const session = await decrypt(cookie)

  if (!session || (session.level as number) < 9) {
    // Only level 9 (Master Admin) can access by default, or you can adjust this logic
    return (
      <div className="p-8 text-center text-red-600">
        <h2 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h2>
        <p>최고 관리자(레벨 9 이상)만 접근할 수 있는 메뉴입니다.</p>
      </div>
    )
  }

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: 'desc' }
  })

  const menuPermissions = await prisma.menuPermission.findMany()

  // 기본 메뉴 목록
  const menus = [
    { path: '/', name: '대시보드' },
    { path: '/estimates', name: '견적 목록' },
    { path: '/calendar', name: '일정 캘린더' },
    { path: '/users', name: '사용자 및 권한' },
    { path: '/items', name: '물품정보' },
    { path: '/vehicles', name: '차량정보' },
    { path: '/labors', name: '인건비정보' },
    { path: '/ladders', name: '사다리차운임' },
    { path: '/inventory', name: '자재재고관리' },
  ]

  async function updateAdminLevel(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const level = parseInt(formData.get('level') as string)
    await prisma.admin.update({
      where: { id },
      data: { level }
    })
    revalidatePath('/users')
  }

  async function updateMenuPermission(formData: FormData) {
    'use server'
    const menuPath = formData.get('menuPath') as string
    const menuName = formData.get('menuName') as string
    const minLevel = parseInt(formData.get('minLevel') as string)

    await prisma.menuPermission.upsert({
      where: { menuPath },
      update: { minLevel, menuName },
      create: { menuPath, menuName, minLevel }
    })
    revalidatePath('/users')
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">사용자 및 권한 관리</h1>

      <UserRegisterForm />

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-4">관리자 권한 설정</h2>
        <p className="text-sm text-gray-600 mb-6 font-medium">숫자가 높을수록 높은 권한입니다. (예: 9=최고관리자, 1=일반)</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 border-b">이름</th>
                <th className="px-4 py-3 border-b">아이디</th>
                <th className="px-4 py-3 border-b">역할(Role)</th>
                <th className="px-4 py-3 border-b">접근 레벨 설정</th>
                <th className="px-4 py-3 border-b">비밀번호 관리</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900">{admin.name}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{admin.userId}</td>
                  <td className="px-4 py-3 font-semibold text-blue-700">{admin.role}</td>
                  <td className="px-4 py-3">
                    <form action={updateAdminLevel} className="flex gap-2 items-center">
                      <input type="hidden" name="id" value={admin.id} />
                      <input 
                        type="number" 
                        name="level" 
                        defaultValue={admin.level} 
                        className="border rounded px-2 py-1 w-20 text-center font-bold text-gray-900"
                        min="1" max="99"
                      />
                      <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-semibold">
                        저장
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <ResetPasswordButton 
                      adminId={admin.id}
                      userName={admin.name}
                      userId={admin.userId}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-4">메뉴별 접근 권한 (최소 레벨 설정)</h2>
        <p className="text-sm text-gray-600 mb-6 font-medium">해당 메뉴에 접근하기 위한 최소 사용자 레벨을 설정합니다.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 border-b">메뉴명</th>
                <th className="px-4 py-3 border-b">경로</th>
                <th className="px-4 py-3 border-b">최소 레벨</th>
                <th className="px-4 py-3 border-b">변경</th>
              </tr>
            </thead>
            <tbody>
              {menus.map(menu => {
                const perm = menuPermissions.find(p => p.menuPath === menu.path)
                const currentMinLevel = perm ? perm.minLevel : 1
                
                return (
                  <tr key={menu.path} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">{menu.name}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{menu.path}</td>
                    <td className="px-4 py-3">
                      <form action={updateMenuPermission} className="flex gap-2">
                        <input type="hidden" name="menuPath" value={menu.path} />
                        <input type="hidden" name="menuName" value={menu.name} />
                        <input 
                          type="number" 
                          name="minLevel" 
                          defaultValue={currentMinLevel} 
                          className="border rounded px-2 py-1 w-20 text-center"
                          min="1" max="99"
                        />
                        <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-semibold">
                          저장
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
