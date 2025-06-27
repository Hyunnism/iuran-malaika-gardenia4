import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/SupabaseClient'

function InvoicePublic() {
    const { id, jenis } = useParams()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchInvoice() {
            try {
                let tagihan
                let user
                let iuran

                if (jenis === 'rutin') {
                    const { data: tagihanData, error: tagihanErr } = await supabase
                        .from('iuran_tagihan')
                        .select('*')
                        .eq('id', id)
                        .single()

                    if (tagihanErr || !tagihanData) throw new Error('Tagihan rutin tidak ditemukan.')

                    const [userRes, iuranRes] = await Promise.all([
                        supabase.from('users').select('name, nomor_rumah').eq('id', tagihanData.user_id).single(),
                        supabase.from('iuran_rutin').select('nama_iuran, nominal').eq('id', tagihanData.iuran_rutin_id).single()
                    ])

                    if (userRes.error || iuranRes.error) throw new Error('Data pengguna atau iuran rutin tidak ditemukan.')

                    tagihan = tagihanData
                    user = userRes.data
                    iuran = iuranRes.data

                } else if (jenis === 'tambahan') {
                    const { data: tagihanData, error: tagihanErr } = await supabase
                        .from('tagihan_tambahan')
                        .select('*')
                        .eq('id', id)
                        .single()

                    if (tagihanErr || !tagihanData) throw new Error('Tagihan tambahan tidak ditemukan.')

                    const [userRes, iuranRes] = await Promise.all([
                        supabase.from('users').select('name, nomor_rumah').eq('id', tagihanData.user_id).single(),
                        supabase.from('iuran_tambahan').select('nama_iuran, nominal').eq('id', tagihanData.iuran_tambahan_id).single()
                    ])

                    if (userRes.error || iuranRes.error) throw new Error('Data pengguna atau iuran tambahan tidak ditemukan.')

                    tagihan = tagihanData
                    user = userRes.data
                    iuran = iuranRes.data

                } else {
                    throw new Error('Jenis tagihan tidak valid.')
                }

                setData({ tagihan, user, iuran })
            } catch (err) {
                setError(err.message || 'Gagal memuat invoice.')
            } finally {
                setLoading(false)
            }
        }

        fetchInvoice()
    }, [id, jenis])

    if (loading) return <div className="p-4 text-center">Loading...</div>
    if (error) return <div className="p-4 text-red-500 text-center">{error}</div>

    const {
        tagihan,
        user,
        iuran
    } = data

    const status = tagihan.status || tagihan.status_bayar
    const tanggalBayar = tagihan.tanggal_bayar

    return (
        <div className="max-w-xl mx-auto my-10 p-6 bg-white shadow-lg rounded-lg text-gray-800">
            {/* Header */}
            <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold">🧾 INVOICE PEMBAYARAN</h1>
                <p className="text-xs text-gray-500 mt-1">ID Tagihan: {id}</p>
            </div>

            {/* Info Warga */}
            <div className="grid grid-cols-2 text-sm gap-y-2 mb-4">
                <div className="font-medium">Nama Warga:</div>
                <div>{user.name}</div>
                <div className="font-medium">Nomor Rumah:</div>
                <div>{user.nomor_rumah}</div>
            </div>

            {/* Rincian Iuran */}
            <table className="text-sm text-left w-full mb-4">
                <tbody>
                    <tr>
                        <td className="font-medium w-40">Jenis Iuran</td>
                        <td>: {iuran.nama_iuran}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Kategori</td>
                        <td>: {jenis === 'rutin' ? 'Rutin Bulanan' : 'Tambahan / Event'}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Nominal</td>
                        <td>: Rp {iuran.nominal.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Status</td>
                        <td>: {status?.replace('_', ' ')}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Dibayar Pada</td>
                        <td>: {tanggalBayar ? new Date(tanggalBayar).toLocaleDateString('id-ID') : '-'}</td>
                    </tr>
                    <tr>
                        <td className="font-medium">Metode Bayar</td>
                        <td>: {tagihan.metode_bayar ? tagihan.metode_bayar : '-'}</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer */}
            <p className="text-xs text-gray-500 text-center mt-6">
                Halaman ini adalah bukti pembayaran resmi. Terima kasih 🙏
            </p>
        </div>
    )

}

export default InvoicePublic
