import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function RiwayatPembayaranTabel() {
    const [pembayaran, setPembayaran] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            const { data: rutin, error: rutinError } = await supabase
                .from('iuran_tagihan')
                .select(`
  id,
  user_id,
  tanggal_bayar,
  metode_bayar,
  invoice_url,
  user:users!iuran_tagihan_user_id_fkey(name),
  iuran_rutin(nama_iuran, nominal)
`)

                .eq('status', 'sudah_bayar')


            const { data: tambahan, error: tambahanError } = await supabase
                .from('tagihan_tambahan')
                .select(`
    id,
    tanggal_bayar,
    invoice_url,
    status_bayar,
    user:users!tagihan_tambahan_user_id_fkey(name),
    iuran_tambahan(nama_iuran, nominal)
  `)
                .eq('status_bayar', 'sudah_bayar')

            if (rutinError) console.error('❌ Error rutin:', rutinError.message)
            if (tambahanError) console.error('❌ Error tambahan:', tambahanError.message)

            const combined = [
                ...(rutin || []).map(item => ({
                    id: item.id,
                    nama: item.user?.name || '-',
                    jenis: item.iuran_rutin?.nama_iuran || 'Iuran Rutin',
                    nominal: item.iuran_rutin?.nominal || 0,
                    tgl: item.tanggal_bayar,
                    metode: item.metode_bayar || '-',
                    invoice: item.invoice_url
                })),
                ...(tambahan || []).map(item => ({
                    id: item.id,
                    nama: item.user?.name || '-',
                    jenis: item.iuran_tambahan?.nama_iuran || 'Iuran Tambahan',
                    nominal: item.iuran_tambahan?.nominal || 0,
                    tgl: item.tanggal_bayar,
                    metode: '-', // optional: kamu bisa tambahkan metode jika tersedia
                    invoice: item.invoice_url
                }))
            ]

            combined.sort((a, b) => new Date(b.tgl) - new Date(a.tgl))
            setPembayaran(combined)
        }

        fetchData()
    }, [])


    return (
        <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Riwayat Pembayaran Warga</h2>
            <div className="overflow-auto max-h-[500px] border rounded">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="p-2 border">Tanggal</th>
                            <th className="p-2 border">Warga</th>
                            <th className="p-2 border">Pembayaran</th>
                            <th className="p-2 border">Nominal</th>
                            <th className="p-2 border">Metode</th>
                            <th className="p-2 border">Invoice</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pembayaran.map((item, i) => (
                            <tr key={i} className="text-center border-t">
                                <td className="p-2">{item.tgl ? new Date(item.tgl).toLocaleDateString('id-ID') : '-'}</td>
                                <td className="p-2">{item.nama}</td>
                                <td className="p-2">{item.jenis}</td>
                                <td className="p-2">Rp {item.nominal.toLocaleString()}</td>
                                <td className="p-2">{item.metode}</td>
                                <td className="p-2">
                                    <a
                                        href={`/invoice/${item.id}`}
                                        className="text-blue-600 underline hover:text-blue-800"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Lihat Invoice
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {pembayaran.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center p-4 text-gray-500">Belum ada pembayaran</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
