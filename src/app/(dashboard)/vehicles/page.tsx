'use client'

import { useState, useEffect } from 'react'
import { createVehicle, deleteVehicle, getVehicles, updateVehicle } from '@/app/actions/vehicle'
import { Trash2, Edit2, Check, X } from 'lucide-react'

export default function VehiclesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    setLoading(true)
    const data = await getVehicles()
    setItems(data)
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const res = await createVehicle(formData)
    
    if (res?.error) {
      alert(res.error)
    } else {
      form.reset()
      fetchItems()
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const defaultCost = Number(formData.get('defaultCost'))
    const maxCbm = Number(formData.get('maxCbm'))
    const res = await updateVehicle(id, name, defaultCost, maxCbm)
    
    if (res?.error) {
      alert(res.error)
    } else {
      setEditingId(null)
      fetchItems()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 차량정보를 삭제하시겠습니까?')) return
    
    const res = await deleteVehicle(id)
    if (res.error) {
      alert(res.error)
    } else {
      fetchItems()
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">차량정보 관리</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 새 차량 등록 폼 */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-blue-600 border-b pb-2 mb-4">새 차량 등록</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">차량명</label>
              <input type="text" name="name" required placeholder="예: 5톤 탑차" className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">기본 단가 (원)</label>
              <input type="number" name="defaultCost" required placeholder="예: 200000" className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">최대 CBM</label>
              <input type="number" step="0.1" name="maxCbm" required placeholder="예: 15" className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              등록하기
            </button>
          </form>
        </div>

        {/* 등록된 차량 목록 */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">등록된 차량 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-800 text-sm font-bold border-b border-gray-200">
                  <th className="p-4">차량명</th>
                  <th className="p-4">최대 CBM</th>
                  <th className="p-4">기본 단가</th>
                  <th className="p-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-600 font-medium">로딩 중...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-600 font-medium">등록된 차량이 없습니다. 좌측 폼에서 등록해주세요.</td>
                  </tr>
                ) : (
                  items.map(item => (
                    editingId === item.id ? (
                      <tr key={item.id} className="border-b last:border-0 bg-blue-50/30">
                        <td className="p-2">
                          <input form={`edit-form-${item.id}`} type="text" name="name" defaultValue={item.name} required className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        </td>
                        <td className="p-2">
                          <input form={`edit-form-${item.id}`} type="number" step="0.1" name="maxCbm" defaultValue={item.maxCbm} required className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        </td>
                        <td className="p-2">
                          <input form={`edit-form-${item.id}`} type="number" name="defaultCost" defaultValue={item.defaultCost} required className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        </td>
                        <td className="p-2 text-right">
                          <form id={`edit-form-${item.id}`} onSubmit={(e) => handleUpdate(e, item.id)} className="flex justify-end gap-1">
                            <button type="submit" className="text-green-600 hover:bg-green-100 p-2 rounded-md transition-colors"><Check size={18}/></button>
                            <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-md transition-colors"><X size={18}/></button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">{item.name}</td>
                        <td className="p-4 text-gray-900 font-semibold">{item.maxCbm || 0} CBM</td>
                        <td className="p-4 text-blue-700 font-bold">{item.defaultCost.toLocaleString()} 원</td>
                        <td className="p-4 text-right flex justify-end gap-1">
                          <button onClick={() => setEditingId(item.id)} className="text-gray-500 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    )
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
