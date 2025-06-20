import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import useAdminId from '../../../hooks/useAdminId'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function IuranModal({ initialData, onClose, onSave }) {
    const [nama, setNama] = useState(initialData?.nama_iuran || '')
    const [nominal, setNominal] = useState(initialData?.nominal || '')
    const [aktif, setAktif] = useState(initialData?.aktif ?? true)
    const adminId = useAdminId()
    const isEdit = Boolean(initialData)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!nama || !nominal || !adminId) return

        const payload = {
            nama_iuran: nama,
            nominal: Number(nominal),
            aktif,
        }

        if (isEdit) {
            // 🔁 Update iuran_rutin
            const { error } = await supabase
                .from('iuran_rutin')
                .update({
                    ...payload,
                    updated_by: adminId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', initialData.id)

            if (error) {
                alert('Gagal update: ' + error.message)
                return
            }

            // 🔍 Audit Log
            await fetch(`${API_BASE_URL}/api/log-activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: adminId,
                    action: 'update',
                    table_name: 'iuran_rutin',
                    row_id: initialData.id,
                    keterangan: `Mengubah iuran rutin: ${nama}`,
                }),
            })
        } else {
            // ➕ Tambah iuran_rutin
            const { data, error } = await supabase
                .from('iuran_rutin')
                .insert({ ...payload, created_by: adminId })
                .select()

            if (error) {
                alert('Gagal tambah: ' + error.message)
                return
            }

            const newId = data?.[0]?.id
            if (newId) {
                await fetch(`${API_BASE_URL}/api/log-activity`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: adminId,
                        action: 'create',
                        table_name: 'iuran_rutin',
                        row_id: newId,
                        keterangan: `Menambahkan iuran rutin: ${nama}`,
                    }),
                })
            }
        }

        onSave()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">{isEdit ? 'Edit Iuran' : 'Tambah Iuran'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nama Iuran</label>
                        <input
                            type="text"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nominal</label>
                        <input
                            type="number"
                            value={nominal}
                            onChange={(e) => setNominal(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                            required
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
                        <label>Aktif</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
                            Batal
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
