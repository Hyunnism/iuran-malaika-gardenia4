import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import IuranModal from './IuranModal'
import useAdminId from '../../../hooks/useAdminId'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function IuranList() {
    const [iuran, setIuran] = useState([])
    const [selectedIuran, setSelectedIuran] = useState(null)
    const [openModal, setOpenModal] = useState(false)
    const adminId = useAdminId()

    const fetchData = async () => {
        const { data, error } = await supabase
            .from('iuran_rutin')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error) setIuran(data)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleEdit = (item) => {
        setSelectedIuran(item)
        setOpenModal(true)
    }

    const handleDelete = async (item) => {
        const confirmDelete = confirm('Yakin ingin menghapus iuran ini?')
        if (!confirmDelete || !adminId) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/iuran-rutin/${item.id}?admin_id=${adminId}`, {
                method: 'DELETE'
            })

            const result = await res.json()
            if (!res.ok) {
                alert(result.error || 'Gagal menghapus iuran rutin')
                return
            }

            alert('✅ Iuran rutin berhasil dihapus')
            fetchData()
        } catch (err) {
            console.error('❌ Gagal hapus:', err)
            alert('Terjadi kesalahan')
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Kelola Iuran Rutin</h1>
                <button
                    onClick={() => {
                        setSelectedIuran(null)
                        setOpenModal(true)
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    + Tambah Iuran
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {iuran.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded shadow">
                        <h2 className="text-lg font-semibold">{item.nama_iuran}</h2>
                        <p className="text-gray-600">Nominal: Rp {item.nominal.toLocaleString()}</p>
                        <p>Status: {item.aktif ? 'Aktif' : 'Nonaktif'}</p>
                        <div className="mt-2 flex gap-2">
                            <button onClick={() => handleEdit(item)} className="px-3 py-1 bg-blue-600 text-white rounded">Edit</button>
                            <button onClick={() => handleDelete(item)} className="px-3 py-1 bg-red-600 text-white rounded">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>

            {openModal && (
                <IuranModal
                    initialData={selectedIuran}
                    onClose={() => setOpenModal(false)}
                    onSave={() => {
                        setOpenModal(false)
                        fetchData()
                    }}
                />
            )}
        </div>
    )
}
