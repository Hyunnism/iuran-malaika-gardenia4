import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import Login from '@/pages/auth/Login'
import DashboardHome from '@/pages/dashboard'
import IuranList from '@/pages/dashboard/iuran/IuranList'
import IuranTambahanList from '@/pages/dashboard/iuran/IuranTambahanList'
import WargaList from '@/pages/dashboard/pengguna/WargaList'
import WargaLayout from '@/layouts/WargaLayout'

import Invoice from '@/pages/public/Invoice'
import InvoicePublic from '@/pages/public/InvoicePublic'
import TagihanSaya from '@/pages/public/TagihanSaya'
import RiwayatPembayaran from '@/pages/public/RiwayatPembayaran'
import ProfilWarga from '@/pages/public/ProfilWarga'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/invoice/public/:jenis/:id" element={<InvoicePublic />} />

      <Route path="/invoice/:id" element={
        <ProtectedRoute allowedRoles={['warga', 'admin', 'superadmin']}>
          <Invoice />
        </ProtectedRoute>
      } />

      {/* Admin & Superadmin */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardHome />} />
        <Route path="iuran" element={<IuranList />} />
        <Route path="iuran/tambahan" element={<IuranTambahanList />} />
        <Route path="pengguna" element={<WargaList />} />
      </Route>

      {/* Warga */}
      <Route path="/warga" element={
        <ProtectedRoute allowedRoles={['warga']}>
          <WargaLayout />
        </ProtectedRoute>
      }>
        <Route index element={<TagihanSaya />} />
        <Route path="tagihan" element={<TagihanSaya />} />
        <Route path="riwayat" element={<RiwayatPembayaran />} />
        <Route path="profil" element={<ProfilWarga />} />
      </Route>
    </Routes>
  )
}

export default App
