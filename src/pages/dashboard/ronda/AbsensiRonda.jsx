import { useEffect, useState } from 'react'
import axios from 'axios'
import useAdminId from '../../../hooks/useAdminId'

export default function AbsensiRonda() {
    const [tanggal, setTanggal] = useState('')
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const adminId = useAdminId()

    const fetchData = async () => {
        if (!tanggal) return

        setLoading(true)
        setMessage('')
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/ronda/absensi?tanggal=${tanggal}`)
            setData(res.data || [])
        } catch (err) {
            console.error(err)
            setMessage('Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    const handleAbsenToggle = (index) => {
        const newData = [...data]
        newData[index].absen = !newData[index].absen
        newData[index].denda = newData[index].absen ? 0 : 5000
        setData(newData)
    }

    const handleSimpan = async () => {
        setSaving(true)
        setMessage('')
        try {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/ronda/update-absensi`, {
                tanggal_ronda: tanggal,
                updated_by: adminId,
                data: data.map(d => ({
                    id: d.id,
                    absen: d.absen,
                    denda: d.denda
                }))
            })
            setMessage('✅ Absensi berhasil disimpan')
        } catch (err) {
            console.error(err)
            setMessage('❌ Gagal menyimpan absensi')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-4 bg-white rounded shadow">
            <h1 className="text-xl font-bold mb-4">📋 Absensi Ronda</h1>

            <div className="flex items-center gap-3 mb-4">
                <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="border p-2 rounded"
                />
                <button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                    Cari Jadwal
                </button>
            </div>

            {loading ? (
                <p>Loading data...</p>
            ) : (
                <table className="w-full border">
                    <thead>
                        <tr className="bg-gray-100 text-left">
                            <th className="p-2">Nama</th>
                            <th className="p-2">Hadir?</th>
                            <th className="p-2">Denda</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((w, i) => (
                            <tr key={w.id} className="border-t">
                                <td className="p-2">{w.user_name}</td>
                                <td className="p-2">
                                    <input
                                        type="checkbox"
                                        checked={w.absen}
                                        onChange={() => handleAbsenToggle(i)}
                                    />
                                </td>
                                <td className="p-2 text-red-600">
                                    {w.denda > 0 ? `Rp${w.denda.toLocaleString()}` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div className="mt-4">
                <button
                    onClick={handleSimpan}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                    {saving ? 'Menyimpan...' : 'Simpan Absensi'}
                </button>
            </div>

            {message && <p className="mt-3 text-blue-600">{message}</p>}
        </div>
    )
}
