import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function RiwayatModal({ user, onClose }) {
    const [riwayat, setRiwayat] = useState([])
    const [tagihanTambahan, setTagihanTambahan] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            // 🔁 Iuran Rutin
            const { data: rutinData, error: rutinError } = await supabase
                .from('iuran_tagihan')
                .select('id,bulan_tagih,status,tanggal_bayar,invoice_url,iuran_rutin(id,nama_iuran,nominal)')
                .eq('user_id', user.id)

            if (rutinError) {
                console.error('❌ Gagal ambil iuran_tagihan:', rutinError.message)
            }

            setRiwayat(rutinData || [])

            // ➕ Tagihan Tambahan tanpa relasi
            const { data: tagihanData, error: tagihanError } = await supabase
                .from('tagihan_tambahan')
                .select('*')
                .eq('user_id', user.id)

            if (tagihanError) {
                console.error('❌ Gagal ambil tagihan_tambahan:', tagihanError.message)
                return
            }

            const iuranIds = tagihanData.map(t => t.iuran_tambahan_id)

            const { data: iuranList, error: iuranError } = await supabase
                .from('iuran_tambahan')
                .select('id,nama_iuran,nominal,tanggal_tagih')
                .in('id', iuranIds)

            if (iuranError) {
                console.error('❌ Gagal ambil iuran_tambahan:', iuranError.message)
                return
            }

            // 🔗 Gabungkan manual
            const merged = tagihanData.map(t => {
                const detail = iuranList.find(i => i.id === t.iuran_tambahan_id)
                return { ...t, iuran_tambahan: detail }
            })

            // 🔃 Urutkan dari terbaru
            merged.sort((a, b) => new Date(b.iuran_tambahan?.tanggal_tagih) - new Date(a.iuran_tambahan?.tanggal_tagih))

            setTagihanTambahan(merged)
        }

        fetchData()
    }, [user.id])

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Riwayat Tagihan: {user.name}</h2>

                {/* 🔁 Iuran Rutin */}
                <h3 className="text-lg font-semibold mb-2">Iuran Rutin</h3>
                <div className="overflow-y-auto max-h-72 mb-4">
                    <table className="w-full text-sm border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border">Bulan</th>
                                <th className="p-2 border">Nominal</th>
                                <th className="p-2 border">Status</th>
                                <th className="p-2 border">Tgl Bayar</th>
                                <th className="p-2 border">Invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riwayat.map((item, i) => (
                                <tr key={i} className="text-center">
                                    <td className="border p-2">
                                        {new Date(item.bulan_tagih).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="border p-2">
                                        Rp {item.iuran_rutin?.nominal?.toLocaleString()}
                                    </td>
                                    <td className="border p-2 capitalize">
                                        {item.status.replace('_', ' ')}
                                    </td>
                                    <td className="border p-2">
                                        {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleDateString('id-ID') : '-'}
                                    </td>
                                    <td className="border p-2">
                                        {item.tanggal_bayar
                                            ? <>
                                                <a
                                                    href={`/invoice/${item.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 text-xs underline hover:text-blue-800"
                                                >
                                                    Lihat Invoice
                                                </a>
                                            </>
                                            : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ➕ Iuran Tambahan */}
                <h3 className="text-lg font-semibold mb-2">Iuran Tambahan</h3>
                <div className="overflow-y-auto max-h-72">
                    <table className="w-full text-sm border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border">Nama</th>
                                <th className="p-2 border">Nominal</th>
                                <th className="p-2 border">Status</th>
                                <th className="p-2 border">Tgl Bayar</th>
                                <th className="p-2 border">Invoice</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tagihanTambahan.map((item, i) => (
                                <tr key={i} className="text-center">
                                    <td className="border p-2">{item.iuran_tambahan?.nama_iuran}</td>
                                    <td className="border p-2">
                                        Rp {item.iuran_tambahan?.nominal?.toLocaleString()}
                                    </td>
                                    <td className="border p-2 capitalize">
                                        {item.status_bayar?.replace('_', ' ') || '-'}
                                    </td>
                                    <td className="border p-2">
                                        {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleDateString('id-ID') : '-'}
                                    </td>
                                    <td className="border p-2">
                                        {item.tanggal_bayar
                                            ? <>
                                                <a
                                                    href={`/invoice/${item.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 text-xs underline hover:text-blue-800"
                                                >
                                                    Lihat Invoice
                                                </a>
                                            </>
                                            : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="text-right mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    )
}
