import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import useAdminId from '../../../hooks/useAdminId'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function TambahanModal({ initialData, onClose, onSave }) {
    const [nama, setNama] = useState(initialData?.nama_iuran || '')
    const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || '')
    const [nominal, setNominal] = useState(initialData?.nominal || '')
    const [tanggal, setTanggal] = useState(initialData?.tanggal_tagih || '')
    const isEdit = Boolean(initialData)
    const adminId = useAdminId()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!nama || !nominal || !tanggal || !adminId) return

        const payload = {
            nama_iuran: nama,
            deskripsi,
            nominal: Number(nominal),
            tanggal_tagih: tanggal
        }

        if (isEdit) {
            // ✅ UPDATE via Express API
            const res = await fetch(`${API_BASE_URL}/api/iuran-tambahan/${initialData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    updated_by: adminId
                })
            })

            const result = await res.json()
            if (!res.ok) {
                alert(result.error || 'Gagal update iuran tambahan')
                return
            }
        } else {
            // ✅ INSERT via Express API
            const res = await fetch(`${API_BASE_URL}/api/iuran-tambahan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, created_by: adminId })
            })

            const result = await res.json()
            if (!res.ok) {
                alert(result.error || 'Gagal menambahkan iuran')
                return
            }
        }

        onSave()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">{isEdit ? 'Edit' : 'Tambah'} Iuran Tambahan</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nama</label>
                        <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Deskripsi</label>
                        <textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nominal</label>
                        <input type="number" value={nominal} onChange={e => setNominal(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Tanggal Tagih</label>
                        <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
