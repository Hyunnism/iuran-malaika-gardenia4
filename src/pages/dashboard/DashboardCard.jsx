import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardCard() {
    const [stats, setStats] = useState({
        warga: 0,
        tagihanRutin: 0,
        tagihanTambahan: 0,
        bayar: 0,
        iuranRutin: 0,
        iuranTambahan: 0
    })

    useEffect(() => {
        const fetchStats = async () => {
            const now = new Date()
            const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            const akhirBulan = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
            const bulanTagih = now.toISOString().slice(0, 7) + '-01'

            const [
                { count: wargaCount },
                { data: bayarRutin },
                { data: tagihanRutinData },
                { count: iuranRutinCount },
                { data: bayarTambahan },
                { data: rawTagihanTambahan },
                { count: iuranTambahanCount }
            ] = await Promise.all([
                supabase.from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'warga'),

                supabase.from('iuran_tagihan')
                    .select('iuran_rutin(nominal)')
                    .eq('status', 'sudah_bayar'),

                supabase.from('iuran_tagihan')
                    .select('id, iuran_rutin(aktif)')
                    .eq('bulan_tagih', bulanTagih),

                supabase.from('iuran_rutin')
                    .select('*', { count: 'exact', head: true })
                    .eq('aktif', true),

                supabase.from('tagihan_tambahan')
                    .select('iuran_tambahan(nominal)')
                    .eq('status_bayar', 'sudah_bayar'),

                supabase.from('tagihan_tambahan')
                    .select('id, iuran_tambahan(tanggal_tagih)'),

                supabase.from('iuran_tambahan')
                    .select('*', { count: 'exact', head: true }),
            ])

            // 💰 Pembayaran masuk
            const totalBayarRutin = bayarRutin?.reduce(
                (sum, row) => sum + (row.iuran_rutin?.nominal || 0), 0
            )
            const totalBayarTambahan = bayarTambahan?.reduce(
                (sum, row) => sum + (row.iuran_tambahan?.nominal || 0), 0
            )
            const totalBayar = totalBayarRutin + totalBayarTambahan

            // 🧾 Tagihan tambahan bulan ini
            const tagihanTambahanBulanIni = (rawTagihanTambahan || []).filter(t => {
                const tanggal = t.iuran_tambahan?.tanggal_tagih
                return tanggal >= awalBulan && tanggal < akhirBulan
            }).length

            // 🧾 Tagihan rutin aktif bulan ini
            const tagihanRutinAktifCount = (tagihanRutinData || []).filter(
                t => t.iuran_rutin?.aktif
            ).length

            setStats({
                warga: wargaCount || 0,
                tagihanRutin: tagihanRutinAktifCount,
                tagihanTambahan: tagihanTambahanBulanIni,
                bayar: totalBayar,
                iuranRutin: iuranRutinCount || 0,
                iuranTambahan: iuranTambahanCount || 0
            })
        }

        fetchStats()
    }, [])

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Total Warga" value={stats.warga} />
            <StatCard title="Tagihan Rutin Bulan Ini" value={stats.tagihanRutin} />
            <StatCard title="Tagihan Tambahan Bulan Ini" value={stats.tagihanTambahan} />
            <StatCard title="Pembayaran Masuk" value={`Rp ${stats.bayar.toLocaleString()}`} />
            <StatCard title="Jenis Iuran Aktif" value={stats.iuranRutin} />
            <StatCard title="Jenis Iuran Tambahan" value={stats.iuranTambahan} />
        </div>
    )
}

function StatCard({ title, value }) {
    return (
        <div className="bg-white p-5 rounded shadow">
            <h3 className="text-gray-500 text-sm mb-1">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    )
}
