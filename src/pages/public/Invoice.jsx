// src/pages/public/Invoice.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/SupabaseClient'
import html2pdf from 'html2pdf.js'

export default function Invoice() {
    const [metodePembayaran, setMetodePembayaran] = useState(null)
    const [invoiceUrl, setInvoiceUrl] = useState(null)
    const navigate = useNavigate()
    const { id } = useParams()
    const [data, setData] = useState(null)
    const ref = useRef()

    useEffect(() => {
        const fetchData = async () => {
            // Coba ambil tagihan rutin dulu
            const { data: tagihanRutin } = await supabase
                .from('iuran_tagihan')
                .select('*')
                .eq('id', id)
                .single()

            if (tagihanRutin) {
                const [{ data: iuran }, { data: user }] = await Promise.all([
                    supabase.from('iuran_rutin').select('nama_iuran, nominal').eq('id', tagihanRutin.iuran_rutin_id).single(),
                    supabase.from('users').select('name, nomor_rumah').eq('id', tagihanRutin.user_id).single()
                ])

                setData({
                    ...tagihanRutin,
                    nama: iuran?.nama_iuran,
                    nominal: iuran?.nominal,
                    jenis: 'rutin',
                    nama_warga: user?.name,
                    nomor_rumah: user?.nomor_rumah
                })

                setInvoiceUrl(tagihanRutin.invoice_url || null)

                // ⬇ Ambil metode dari pembayaran_log
                const { data: log } = await supabase
                    .from('pembayaran_log')
                    .select('metode')
                    .eq('tagihan_id', id)
                    .eq('jenis', 'rutin')
                    .order('waktu', { ascending: false })
                    .limit(1)
                    .single()

                if (log?.metode) setMetodePembayaran(log.metode)

                return
            }

            // Jika bukan tagihan rutin, cek tagihan tambahan
            const { data: tagihanTambahan } = await supabase
                .from('tagihan_tambahan')
                .select('*')
                .eq('id', id)
                .single()

            if (tagihanTambahan) {
                const [{ data: iuran }, { data: user }] = await Promise.all([
                    supabase.from('iuran_tambahan').select('nama_iuran, nominal').eq('id', tagihanTambahan.iuran_tambahan_id).single(),
                    supabase.from('users').select('name, nomor_rumah').eq('id', tagihanTambahan.user_id).single()
                ])

                setData({
                    ...tagihanTambahan,
                    nama: iuran?.nama_iuran,
                    nominal: iuran?.nominal,
                    jenis: 'tambahan',
                    nama_warga: user?.name,
                    nomor_rumah: user?.nomor_rumah
                })

                setInvoiceUrl(tagihanTambahan.invoice_url || null)

                // ⬇ Ambil metode dari pembayaran_log
                const { data: log } = await supabase
                    .from('pembayaran_log')
                    .select('metode')
                    .eq('tagihan_id', id)
                    .eq('jenis', 'tambahan')
                    .order('waktu', { ascending: false })
                    .limit(1)
                    .single()

                if (log?.metode) setMetodePembayaran(log.metode)

                return
            }

            // Jika keduanya tidak ditemukan
            setData('not_found')
        }


        fetchData()
    }, [id])

    const handleDownload = () => {
        html2pdf().from(ref.current).save(`Invoice-${id}.pdf`)
    }

    if (data === null) {
        return <p className="text-center text-gray-500 mt-10">Memuat invoice...</p>
    }

    if (data === 'not_found') {
        return <p className="text-center text-red-500 mt-10">❌ Tagihan tidak ditemukan atau data relasi tidak lengkap.</p>
    }

    return (
        <>

            {/* Tombol kembali */}
            <div className="max-w-xl mx-auto mt-6">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-4 text-sm text-blue-600 hover:underline"
                >
                    ← Kembali ke Riwayat
                </button>
            </div>

            <div className="max-w-xl mx-auto p-6 bg-white shadow-2xl rounded-xl mt-10 text-gray-800" ref={ref}>
                {/* Header */}
                <div className="text-center border-b border-dashed pb-4 mb-6">
                    <h1 className="text-2xl font-extrabold text-gray-900">🧾 INVOICE PEMBAYARAN</h1>
                    <p className="text-xs text-gray-500 mt-1">ID Tagihan: {id}</p>
                </div>

                {/* Informasi Warga */}
                <div className="grid grid-cols-2 gap-y-2 text-sm mb-6">
                    <div className="font-medium">Nama Warga:</div>
                    <div>{data.nama_warga || '-'}</div>
                    <div className="font-medium">Nomor Rumah:</div>
                    <div>{data.nomor_rumah || '-'}</div>
                </div>

                {/* Rincian Iuran */}
                <table className="text-sm text-left w-full mb-6">
                    <tbody>
                        <tr>
                            <td className="font-medium w-40">Nama Iuran</td>
                            <td>: {data.nama}</td>
                        </tr>
                        <tr>
                            <td className="font-medium">Jenis</td>
                            <td>: {data.jenis === 'rutin' ? 'Rutin Bulanan' : 'Tambahan / Event'}</td>
                        </tr>
                        <tr>
                            <td className="font-medium">Nominal</td>
                            <td>: Rp {data.nominal?.toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                            <td className="font-medium">Status</td>
                            <td>: {(data.status || data.status_bayar)?.replace('_', ' ')}</td>
                        </tr>
                        <tr>
                            <td className="font-medium">Dibayar Pada</td>
                            <td>: {data.tanggal_bayar ? new Date(data.tanggal_bayar).toLocaleDateString('id-ID') : '-'}</td>
                        </tr>
                        <tr>
                            <td className="font-medium">Metode Pembayaran</td>
                            <td>: {metodePembayaran || '-'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer */}
                <div className="border-t border-dashed pt-4 text-center mt-6">
                    <p className="text-xs text-gray-500 mb-4">
                        Terima kasih atas partisipasi Anda 🙏
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                        {/* ✅ Tombol download PDF Final */}
                        {invoiceUrl ? (
                            <a
                                href={invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm shadow hover:bg-green-700 transition"
                            >
                                📄 <span>Unduh Invoice Final (PDF)</span>
                            </a>
                        ) : (
                            <button
                                disabled
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-md text-sm shadow cursor-not-allowed"
                            >
                                ⏳ <span>Menyiapkan Invoice...</span>
                            </button>
                        )}

                        {/* 🔄 Fallback manual */}
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm shadow hover:bg-blue-700 transition"
                        >
                            🛠️ <span>Unduh Manual (HTML ke PDF)</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
