// src/pages/public/Invoice.jsx
import { useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/SupabaseClient'
import html2pdf from 'html2pdf.js'

export default function Invoice() {
    const { id } = useParams()
    const [data, setData] = useState(null)
    const ref = useRef()

    useEffect(() => {
        const fetchData = async () => {
            // 🔍 Cek apakah ini tagihan rutin
            let { data: tagihan } = await supabase
                .from('iuran_tagihan')
                .select('*')
                .eq('id', id)
                .single()

            if (tagihan) {
                // Ambil data iuran dan warga secara manual
                const [{ data: iuran }, { data: user }] = await Promise.all([
                    supabase.from('iuran_rutin').select('nama_iuran, nominal').eq('id', tagihan.iuran_rutin_id).single(),
                    supabase.from('users').select('name, nomor_rumah').eq('id', tagihan.user_id).single()
                ])

                setData({
                    ...tagihan,
                    nama: iuran?.nama_iuran,
                    nominal: iuran?.nominal,
                    jenis: 'rutin',
                    nama_warga: user?.name,
                    nomor_rumah: user?.nomor_rumah
                })
                return
            }

            // 🔍 Cek apakah ini tagihan tambahan
            let { data: tambahan } = await supabase
                .from('tagihan_tambahan')
                .select('*')
                .eq('id', id)
                .single()

            if (tambahan) {
                const [{ data: iuran }, { data: user }] = await Promise.all([
                    supabase.from('iuran_tambahan').select('nama_iuran, nominal').eq('id', tambahan.iuran_tambahan_id).single(),
                    supabase.from('users').select('name, nomor_rumah').eq('id', tambahan.user_id).single()
                ])

                setData({
                    ...tambahan,
                    nama: iuran?.nama_iuran,
                    nominal: iuran?.nominal,
                    jenis: 'tambahan',
                    nama_warga: user?.name,
                    nomor_rumah: user?.nomor_rumah
                })
                return
            }

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
        <div className="max-w-xl mx-auto p-6 bg-white shadow-2xl rounded-xl mt-10 text-gray-800" ref={ref}>
            {/* Header */}
            <div className="text-center border-b border-dashed pb-4 mb-6">
                <h1 className="text-2xl font-extrabold text-gray-900">🧾 INVOICE PEMBAYARAN</h1>
                <p className="text-xs text-gray-500 mt-1">ID: {id}</p>
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
                        <td className="font-medium w-40">Nama Warga</td>
                        <td>: {data.nama_warga || '-'}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Nomor Rumah</td>
                        <td>: {data.nomor_rumah || '-'}</td>
                    </tr>
                </tbody>
            </table>

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
                        <td>: Rp {data.nominal?.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Status</td>
                        <td>: {(data.status || data.status_bayar)?.replace('_', ' ')}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Dibayar Pada</td>
                        <td>: {data.tanggal_bayar ? new Date(data.tanggal_bayar).toLocaleDateString('id-ID') : '-'}</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer */}
            <div className="border-t border-dashed pt-4 text-center">
                <p className="text-xs text-gray-500">Terima kasih atas partisipasi Anda 🙏</p>
                <button
                    onClick={handleDownload}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                    Download Invoice (PDF)
                </button>
            </div>
        </div>
    )

}
