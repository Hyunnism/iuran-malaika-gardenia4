// src/pages/public/RiwayatPembayaran.jsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/SupabaseClient'
import { useUser } from '@/context/UserContext'
import { useNavigate } from 'react-router-dom'

export default function RiwayatPembayaran() {
    const navigate = useNavigate()
    const { user } = useUser()
    const [riwayat, setRiwayat] = useState([])

    useEffect(() => {
        const fetchRiwayat = async () => {
            const { data: rutin } = await supabase
                .from('iuran_tagihan')
                .select('id, bulan_tagih, status, tanggal_bayar, iuran_rutin(nama_iuran, nominal)')
                .eq('user_id', user.id)
                .eq('status', 'sudah_bayar')

            const { data: tambahan } = await supabase
                .from('tagihan_tambahan')
                .select('id, status_bayar, tanggal_bayar, iuran_tambahan(nama_iuran, nominal, tanggal_tagih)')
                .eq('user_id', user.id)
                .eq('status_bayar', 'sudah_bayar')

            const items = []

            if (rutin) {
                rutin.forEach(r => items.push({
                    id: r.id,
                    nama: r.iuran_rutin?.nama_iuran,
                    nominal: r.iuran_rutin?.nominal,
                    tanggal: r.bulan_tagih,
                    bayar: r.tanggal_bayar,
                    jenis: 'rutin'
                }))
            }

            if (tambahan) {
                tambahan.forEach(t => items.push({
                    id: t.id,
                    nama: t.iuran_tambahan?.nama_iuran,
                    nominal: t.iuran_tambahan?.nominal,
                    tanggal: t.iuran_tambahan?.tanggal_tagih,
                    bayar: t.tanggal_bayar,
                    jenis: 'tambahan'
                }))
            }

            items.sort((a, b) => new Date(b.bayar) - new Date(a.bayar))
            setRiwayat(items)
        }

        if (user?.id) fetchRiwayat()
    }, [user])

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold text-gray-800">📜 Riwayat Pembayaran</h1>

            {riwayat.length === 0 && (
                <p className="text-gray-500 text-sm">Belum ada riwayat pembayaran.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {riwayat.map((t, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl shadow border p-4 flex flex-col justify-between min-h-[220px] h-full"
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between items-start gap-3">
                                <h2 className="text-base font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[3.5rem]">
                                    {t.nama}
                                </h2>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap self-start ${t.jenis === 'rutin'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                >
                                    {t.jenis === 'rutin' ? 'Rutin' : 'Tambahan'}
                                </span>
                            </div>

                            <div className="text-sm text-gray-600 space-y-1 min-h-[3.5rem]">
                                <p>
                                    📅 Tanggal Tagih:{' '}
                                    {new Date(t.tanggal).toLocaleDateString('id-ID', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                                <p>
                                    🗓️ Dibayar:{' '}
                                    {new Date(t.bayar).toLocaleDateString('id-ID', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>

                            <p className="text-sm font-semibold text-gray-800">
                                💰 Rp {t.nominal?.toLocaleString()}
                            </p>
                            <div className="mt-3 text-center">
                                <button
                                    onClick={() => navigate(`/invoice/${t.id}`)}
                                    className="inline-block text-sm font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition"
                                >
                                    Lihat Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}