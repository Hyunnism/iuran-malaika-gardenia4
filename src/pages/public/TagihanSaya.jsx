// src/pages/public/TagihanSaya.jsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/SupabaseClient'
import { useUser } from '@/context/UserContext'
import { API_BASE_URL } from '@/lib/apibaseUrl'

export default function TagihanSaya() {
    const { user } = useUser()
    const [tagihan, setTagihan] = useState([])

    useEffect(() => {
        const fetchTagihan = async () => {
            const { data: rutin } = await supabase
                .from('iuran_tagihan')
                .select(`id, bulan_tagih, status, iuran_rutin(nama_iuran, nominal)`)
                .eq('user_id', user.id)
                .eq('status', 'belum_bayar')

            const { data: tambahan } = await supabase
                .from('tagihan_tambahan')
                .select(`id, status_bayar, tanggal_bayar, iuran_tambahan(nama_iuran, nominal, tanggal_tagih)`)
                .eq('user_id', user.id)
                .eq('status_bayar', 'belum_bayar')

            const items = []

            if (rutin) {
                rutin.forEach(r => items.push({
                    id: r.id,
                    nama: r.iuran_rutin?.nama_iuran,
                    nominal: r.iuran_rutin?.nominal,
                    tanggal: r.bulan_tagih,
                    jenis: 'rutin'
                }))
            }

            if (tambahan) {
                tambahan.forEach(t => items.push({
                    id: t.id,
                    nama: t.iuran_tambahan?.nama_iuran,
                    nominal: t.iuran_tambahan?.nominal,
                    tanggal: t.iuran_tambahan?.tanggal_tagih,
                    jenis: 'tambahan'
                }))
            }

            items.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
            setTagihan(items)
        }

        if (user?.id) fetchTagihan()
    }, [user])

    const handleBayar = async (item) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/midtrans/create-snap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    tagihan_id: item.id,
                    jenis: item.jenis
                })
            })

            const text = await res.text()
            if (!res.ok) {
                console.error('❌ Error HTTP:', res.status, text)
                alert(`Gagal [${res.status}]: ${text}`)
                return
            }

            const data = JSON.parse(text)
            if (data?.payment_url) {
                window.location.href = data.payment_url
            } else {
                console.error('❌ Tidak ada payment_url:', data)
                alert('Gagal mendapatkan link pembayaran.')
            }
        } catch (err) {
            console.error('❌ Fetch error:', err)
            alert('Gagal konek ke server. Cek koneksi atau setting API_BASE_URL')
        }
    }



    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold text-gray-800">🧾 Tagihan Saya</h1>

            {tagihan.length === 0 && (
                <p className="text-gray-500 text-sm">Tidak ada tagihan saat ini.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tagihan.map((t, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl shadow border p-4 flex flex-col justify-between min-h-[220px] h-full"
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between items-start gap-3">
                                <h2 className="text-lg font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[3.5rem]">
                                    {t.nama}
                                </h2>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap self-start ${t.jenis === 'rutin'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                >
                                    {t.jenis === 'rutin' ? 'Rutin' : 'Tambahan'}
                                </span>
                            </div>

                            <div className="text-sm space-y-1 min-h-[3.5rem]">
                                <p className="text-gray-600">
                                    📅 Tanggal Tagih:{' '}
                                    {new Date(t.tanggal).toLocaleDateString('id-ID', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                                <p className="font-semibold text-gray-700">
                                    💰 Rp {t.nominal?.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => handleBayar(t)}
                            className="mt-4 w-full py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                            Bayar Sekarang
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
