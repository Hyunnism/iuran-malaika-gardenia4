import DashboardCard from './DashboardCard'
import RiwayatPembayaranTabel from './RiwayatPembayaranTabel'

export default function DashboardHome() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard Admin</h1>
            <p className="text-gray-600">Selamat datang di sistem iuran warga!</p>

            {/* ⬇️ Tambahkan ini untuk menampilkan statistik */}
            <DashboardCard />
            <RiwayatPembayaranTabel />
        </div>
    )
}
