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
        <div className="max-w-xl mx-auto my-10 p-8 border shadow rounded">
            <h1 className="text-2xl font-bold mb-4">Invoice Pembayaran</h1>
            <p><strong>Nama:</strong> {user.name}</p>
            <p><strong>Rumah:</strong> {user.nomor_rumah}</p>
            <p><strong>Jenis Iuran:</strong> {iuran.nama_iuran}</p>
            <p><strong>Nominal:</strong> Rp {iuran.nominal.toLocaleString('id-ID')}</p>
            <p><strong>Status:</strong> {status}</p>
            {tanggalBayar && (
                <p><strong>Tanggal Bayar:</strong> {new Date(tanggalBayar).toLocaleString('id-ID')}</p>
            )}
            <p className="text-sm mt-6 text-gray-500">
                Halaman publik ini digunakan untuk pencetakan invoice otomatis tanpa login.
            </p>
        </div>
    )
}

export default InvoicePublic
