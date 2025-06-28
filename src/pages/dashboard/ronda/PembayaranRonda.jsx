import { useEffect, useState } from 'react'
import axios from 'axios'
import useAdminId from '../../../hooks/useAdminId'

export default function PembayaranRonda() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const adminId = useAdminId()

    const fetchBelumBayar = async () => {
        setLoading(true)
        setMessage('')
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/ronda/bolos-belum-bayar`)
            setData(res.data || [])
        } catch (err) {
            console.error(err)
            setMessage('Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateInvoice = async () => {
        setMessage('Memproses invoice...')
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/ronda/generate-invoice`, {
                admin_id: adminId
            })
            setMessage(`Invoice berhasil digenerate (${res.data.count})`)
            fetchBelumBayar()
        } catch (err) {
            console.error(err)
            setMessage('Gagal generate invoice')
        }
    }

    const handleTandaiLunas = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/ronda/tandai-lunas`, {
                id,
                admin_id: adminId
            })
            fetchBelumBayar()
        } catch (err) {
            console.error(err)
            setMessage('Gagal tandai lunas')
        }
    }

    useEffect(() => {
        fetchBelumBayar()
    }, [])

    return (
        <div className="p-4 bg-white rounded shadow">
            <h1 className="text-xl font-bold mb-4">💳 Pembayaran Denda Ronda</h1>

            <button
                onClick={handleGenerateInvoice}
                className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
                🔁 Generate Invoice PDF
            </button>

            {loading ? (
                <p>Memuat data...</p>
            ) : data.length === 0 ? (
                <p>Tidak ada denda ronda yang belum dibayar.</p>
            ) : (
                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Nama</th>
                            <th className="p-2">Tanggal</th>
                            <th className="p-2">Denda</th>
                            <th className="p-2">Invoice</th>
                            <th className="p-2">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id} className="border-t">
                                <td className="p-2">{item.users.name}</td>
                                <td className="p-2">{new Date(item.tanggal_ronda).toLocaleDateString()}</td>
                                <td className="p-2 text-red-600">Rp{item.denda.toLocaleString()}</td>
                                <td className="p-2">
                                    {item.invoice_url ? (
                                        <a
                                            href={item.invoice_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 underline"
                                        >
                                            Lihat Invoice
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className="p-2">
                                    <button
                                        onClick={() => handleTandaiLunas(item.id)}
                                        className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                                    >
                                        Tandai Lunas
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {message && <p className="mt-3 text-blue-600">{message}</p>}
        </div>
    )
}
