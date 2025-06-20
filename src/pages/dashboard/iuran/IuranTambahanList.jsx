import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import TambahanModal from './TambahanModal'
import useAdminId from '../../../hooks/useAdminId'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function IuranTambahanList() {
    const [list, setList] = useState([])
    const [openModal, setOpenModal] = useState(false)
    const [selected, setSelected] = useState(null)
    const adminId = useAdminId()

    const fetchData = async () => {
        const { data } = await supabase
            .from('iuran_tambahan')
            .select('*')
            .order('tanggal_tagih', { ascending: false })
        setList(data || [])
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleEdit = (item) => {
        setSelected(item)
        setOpenModal(true)
    }

    const handleDelete = async (item) => {
        const confirmDelete = window.confirm(`Yakin ingin hapus iuran "${item.nama_iuran}"? Semua tagihan terkait juga akan dihapus.`)
        if (!confirmDelete || !adminId) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/iuran-tambahan/${item.id}?admin_id=${adminId}`, {
                method: 'DELETE'
            })

            const result = await res.json()
            if (!res.ok) {
                alert(result.error || 'Gagal menghapus iuran tambahan')
                return
            }

            alert('✅ Iuran tambahan berhasil dihapus')
            fetchData()
        } catch (err) {
            console.error('❌ Gagal hapus iuran tambahan:', err)
            alert('Terjadi kesalahan')
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Iuran Tambahan</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => {
                    setSelected(null)
                    setOpenModal(true)
                }}>
                    + Tambah
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {list.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-md border p-5 space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-gray-800">{item.nama_iuran}</h2>
                            {item.deskripsi && (
                                <p className="text-sm text-gray-600">{item.deskripsi}</p>
                            )}
                        </div>

                        <div className="space-y-2 text-sm divide-y">
                            <div className="flex justify-between pt-1">
                                <span className="text-gray-600">💰 Nominal</span>
                                <span className="font-medium">Rp {item.nominal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-gray-600">🗓️ Tanggal Tagih</span>
                                <span className="font-medium">
                                    {new Date(item.tanggal_tagih).toLocaleDateString('id-ID')}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3">
                            <button
                                onClick={() => handleEdit(item)}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(item)}
                                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                ))}
            </div>


            {openModal && (
                <TambahanModal
                    initialData={selected}
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
