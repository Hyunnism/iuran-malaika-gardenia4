import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import useAdminId from '../../../hooks/useAdminId'
import RiwayatModal from './RiwayatModal'
import WargaModal from './WargaModal'
import { API_BASE_URL } from '@/lib/apibaseUrl'

export default function WargaList() {
    const [warga, setWarga] = useState([])
    const [selectedWarga, setSelectedWarga] = useState(null)
    const [showModal, setShowModal] = useState(null)
    const adminId = useAdminId()

    const fetchWarga = async () => {
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, name, nomor_rumah, nomor_hp')
            .eq('role', 'warga')

        if (usersError) return console.error('❌ Gagal mengambil users:', usersError.message)

        const { data: tagihanRutin, error: rutinError } = await supabase
            .from('iuran_tagihan')
            .select('user_id, status, iuran_rutin(nominal)')

        if (rutinError) return console.error('❌ Gagal mengambil tagihan rutin:', rutinError.message)

        const { data: tagihanTambahan, error: tambahanError } = await supabase
            .from('tagihan_tambahan')
            .select('user_id, status_bayar, iuran_tambahan(nominal)')

        if (tambahanError) return console.error('❌ Gagal mengambil tagihan tambahan:', tambahanError.message)

        const wargaWithStatus = users.map(user => {
            const rutin = tagihanRutin.filter(t => t.user_id === user.id)
            const tambahan = tagihanTambahan.filter(t => t.user_id === user.id)

            const summaryRutin = { belum_bayar: 0, lewat_jatuh_tempo: 0, sudah_bayar: 0, total_utang: 0 }
            rutin.forEach(t => {
                if (summaryRutin[t.status] !== undefined) {
                    summaryRutin[t.status] += 1
                }
                if (t.status !== 'sudah_bayar') {
                    summaryRutin.total_utang += t.iuran_rutin?.nominal || 0
                }
            })

            const summaryTambahan = { belum_bayar: 0, sudah_bayar: 0, total_utang: 0 }
            tambahan.forEach(t => {
                if (t.status_bayar === 'sudah_bayar') {
                    summaryTambahan.sudah_bayar += 1
                } else {
                    summaryTambahan.belum_bayar += 1
                    summaryTambahan.total_utang += t.iuran_tambahan?.nominal || 0
                }
            })

            const totalUtang = summaryRutin.total_utang + summaryTambahan.total_utang

            return {
                ...user,
                tagihan: {
                    rutin: summaryRutin,
                    tambahan: summaryTambahan,
                    total_utang: totalUtang
                }
            }
        })

        setWarga(wargaWithStatus)
    }

    const handleDelete = async (userId) => {
        const confirm = window.confirm('Yakin ingin menghapus warga ini? Semua tagihan akan ikut terhapus.')
        if (!confirm || !adminId) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/delete-warga/${userId}?admin_id=${adminId}`, {
                method: 'DELETE'
            })

            const result = await res.json()
            if (!res.ok) {
                alert(result.error || 'Gagal menghapus warga')
                return
            }

            alert('✅ Warga berhasil dihapus')
            fetchWarga()
        } catch (err) {
            console.error('❌ Error hapus warga:', err)
            alert('Terjadi kesalahan saat menghapus')
        }
    }

    useEffect(() => {
        fetchWarga()
    }, [])

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Daftar Warga</h1>
                <button
                    onClick={() => {
                        setSelectedWarga(null)
                        setShowModal('form')
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    + Tambah Warga
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {warga.map(w => (
                    <div key={w.id} className="bg-white rounded-2xl shadow-md border p-5 space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-800 text-center">{w.name}</h2>
                            <div className="flex justify-between text-sm text-gray-600 border-b py-1.5">
                                <span>🏠 Rumah</span>
                                <span className="font-medium">{w.nomor_rumah}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 border-b py-1.5">
                                <span>📱 HP</span>
                                <span className="font-medium">{w.nomor_hp || '-'}</span>
                            </div>
                        </div>

                        <div className="rounded-md overflow-hidden border text-sm divide-y">
                            <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-700">🔁 Iuran Rutin</div>
                            <div className="flex justify-between px-3 py-2">
                                <span>🕐 Belum</span>
                                <span className="font-medium">{w.tagihan.rutin.belum_bayar}</span>
                            </div>
                            <div className="flex justify-between px-3 py-2">
                                <span>⏳ Terlambat</span>
                                <span className="font-medium">{w.tagihan.rutin.lewat_jatuh_tempo}</span>
                            </div>
                            <div className="flex justify-between px-3 py-2">
                                <span>✅ Lunas</span>
                                <span className="font-medium">{w.tagihan.rutin.sudah_bayar}</span>
                            </div>

                            <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-700">➕ Iuran Tambahan</div>
                            <div className="flex justify-between px-3 py-2">
                                <span>🕐 Belum</span>
                                <span className="font-medium">{w.tagihan.tambahan.belum_bayar}</span>
                            </div>
                            <div className="flex justify-between px-3 py-2">
                                <span>✅ Lunas</span>
                                <span className="font-medium">{w.tagihan.tambahan.sudah_bayar}</span>
                            </div>
                        </div>

                        <div className="pt-1 flex justify-between items-center text-sm font-semibold text-red-600 border-t mt-2 pt-3">
                            <span>💰 Total Utang</span>
                            <span>Rp {w.tagihan.total_utang.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-3">
                            <button
                                onClick={() => {
                                    setSelectedWarga(w)
                                    setShowModal('form')
                                }}
                                className="px-3 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedWarga(w)
                                    setShowModal('riwayat')
                                }}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                            >
                                Riwayat
                            </button>
                            <button
                                onClick={() => handleDelete(w.id)}
                                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal === 'form' && (
                <WargaModal
                    initialData={selectedWarga}
                    onClose={() => {
                        setSelectedWarga(null)
                        setShowModal(null)
                    }}
                    onSave={() => {
                        setSelectedWarga(null)
                        setShowModal(null)
                        fetchWarga()
                    }}
                />
            )}

            {showModal === 'riwayat' && selectedWarga && (
                <RiwayatModal
                    user={selectedWarga}
                    onClose={() => {
                        setSelectedWarga(null)
                        setShowModal(null)
                    }}
                />
            )}
        </div>
    )
}
