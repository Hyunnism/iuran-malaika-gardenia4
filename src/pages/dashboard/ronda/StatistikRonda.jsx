import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import axios from 'axios'


export default function StatistikRonda() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/ronda/statistik`)
                setData(res.data || [])
            } catch (err) {
                console.error('❌ Gagal fetch statistik:', err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])



    if (loading) return <p>Loading statistik ronda...</p>

    return (
        <div className="p-4 bg-white shadow rounded-xl">
            <h2 className="text-xl font-semibold mb-4">📊 Statistik Ronda Warga</h2>
            <table className="w-full text-sm border">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2 border">Nama</th>
                        <th className="p-2 border">Total Ronda</th>
                        <th className="p-2 border">Total Bolos</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(item => (
                        <tr key={item.user_id}>
                            <td className="p-2 border">{item.name}</td>
                            <td className="p-2 border text-center">{item.jumlah_ronda}</td>
                            <td className="p-2 border text-center">{item.jumlah_bolos}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
