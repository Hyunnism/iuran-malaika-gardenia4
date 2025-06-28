import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../../lib/SupabaseClient'

export default function InvoiceRondaPublic() {
    const { id } = useParams()
    const [data, setData] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            const { data, error } = await supabase
                .from('iuran_ronda')
                .select('*, users(name, nomor_rumah)')
                .eq('id', id)
                .single()

            if (!error) setData(data)
        }

        fetchData()
    }, [id])

    if (!data) return <p>Memuat invoice...</p>

    return (
        <div className="p-8 max-w-xl mx-auto text-sm">
            <h1 className="text-2xl font-bold mb-4">Invoice Denda Ronda</h1>
            <p><strong>Nama:</strong> {data.users.name}</p>
            <p><strong>Nomor Rumah:</strong> {data.users.nomor_rumah}</p>
            <p><strong>Tanggal Ronda:</strong> {new Date(data.tanggal_ronda).toLocaleDateString()}</p>
            <p><strong>Status Hadir:</strong> {data.absen ? 'Hadir' : 'Tidak Hadir'}</p>
            <p><strong>Denda:</strong> Rp{data.denda.toLocaleString()}</p>
            <p><strong>Status Bayar:</strong> {data.status_bayar ? 'Sudah Lunas' : 'Belum Bayar'}</p>
        </div>
    )
}
