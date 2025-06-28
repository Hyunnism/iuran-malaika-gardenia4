import { useEffect, useState } from 'react'
import axios from 'axios'
import useAdminId from '../../../hooks/useAdminId'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
dayjs.locale('id')

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default function JadwalRonda() {
    const [tanggal, setTanggal] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [jadwal, setJadwal] = useState({})
    const adminId = useAdminId()

    const groupByHari = (data) => {
        const grouped = {
            'Minggu': [], 'Senin': [], 'Selasa': [], 'Rabu': [], 'Kamis': [], 'Jumat': [], 'Sabtu': []
        }

        data.forEach(item => {
            const rawDay = dayjs(item.tanggal_ronda).locale('id').format('dddd')
            const normalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase()
            if (!grouped[normalizedDay]) grouped[normalizedDay] = []
            grouped[normalizedDay].push(item.user_name?.name || 'Tidak diketahui')
        })

        return grouped
    }



    const fetchJadwalMingguan = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/ronda/jadwal-mingguan`)
            if (res.data.jadwal) {
                setJadwal(groupByHari(res.data.jadwal))
            }
        } catch (err) {
            console.error('Gagal fetch jadwal:', err)
        }
    }

    useEffect(() => {
        fetchJadwalMingguan()
    }, [])

    const handleGenerate = async () => {
        if (!tanggal) {
            setError('Tanggal wajib diisi')
            return
        }

        setLoading(true)
        setError('')
        setMessage('')
        setJadwal({})

        try {
            const res = await axios.post(`${API_BASE_URL}/api/ronda/generate-jadwal`, {
                tanggal_mulai: tanggal,
                admin_id: adminId
            })

            setMessage(res.data.message || 'Jadwal berhasil dibuat')
            if (res.data.jadwal) {
                setJadwal(groupByHari(res.data.jadwal))
            }
        } catch (err) {
            if (err.response?.status === 400) {
                setError('❗ Jadwal minggu ini sudah pernah digenerate.')
            } else {
                setError(err.response?.data?.error || 'Terjadi kesalahan')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 bg-white rounded shadow">
            <h1 className="text-xl font-bold mb-4">🗓️ Generate Jadwal Ronda Mingguan</h1>

            <div className="flex items-center gap-3">
                <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="border border-gray-300 px-3 py-2 rounded"
                />
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                    {loading ? 'Memproses...' : 'Generate'}
                </button>
            </div>

            {message && <p className="text-green-600 mt-3">{message}</p>}
            {error && <p className="text-red-600 mt-3">{error}</p>}

            {Object.keys(jadwal).length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-3">📋 Jadwal Mingguan:</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {HARI_INDONESIA.map((hari) => (
                            <div key={hari} className="border rounded p-3 bg-yellow-50">
                                <h3 className="font-bold mb-2 text-center text-yellow-800">{hari}</h3>
                                <ul className="list-disc pl-4 text-sm">
                                    {jadwal[hari]?.length > 0 ? (
                                        jadwal[hari].map((nama, i) => (
                                            <li key={i}>{nama}</li>
                                        ))
                                    ) : (
                                        <li className="text-gray-400 italic">Tidak ada jadwal</li>
                                    )}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
