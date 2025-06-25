import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { API_BASE_URL } from '@/lib/apibaseUrl'

export default function WargaModal({ initialData, onClose, onSave }) {
    const [name, setName] = useState(initialData?.name || '')
    const [nomorRumah, setNomorRumah] = useState(initialData?.nomor_rumah || '')
    const [nomorHp, setNomorHp] = useState(initialData?.nomor_hp || '')
    const isEdit = Boolean(initialData)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            name,
            nomor_rumah: nomorRumah,
            nomor_hp: nomorHp
        }

        if (isEdit) {
            const { error } = await supabase
                .from('users')
                .update(payload)
                .eq('id', initialData.id)

            if (error) {
                alert('Gagal menyimpan perubahan.')
                setLoading(false)
                return
            }
        } else {
            try {
                const res = await fetch(`${API_BASE_URL}/api/create-warga`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })

                const result = await res.json()
                if (!res.ok) {
                    throw new Error(result.error || 'Gagal membuat akun warga.')
                }
            } catch (err) {
                alert(err.message)
                setLoading(false)
                return
            }
        }

        setLoading(false)
        onSave()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">
                    {isEdit ? 'Edit Warga' : 'Tambah Warga Baru'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nama</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nomor Rumah</label>
                        <input type="text" value={nomorRumah} onChange={(e) => setNomorRumah(e.target.value)} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nomor HP</label>
                        <input type="text" value={nomorHp} onChange={(e) => setNomorHp(e.target.value)} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Batal</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
                            {loading ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
