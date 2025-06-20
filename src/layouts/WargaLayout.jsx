import { useUser } from '@/context/UserContext'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
    HomeIcon,
    ReceiptTextIcon,
    UserIcon,
    LogOutIcon
} from 'lucide-react'

const navItems = [
    { label: 'Tagihan', icon: HomeIcon, path: '/warga/tagihan' },
    { label: 'Riwayat', icon: ReceiptTextIcon, path: '/warga/riwayat' },
    { label: 'Profil', icon: UserIcon, path: '/warga/profil' },
]

export default function WargaLayout() {
    const { logout } = useUser()
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
            <main className="flex-1 p-4 pb-20 max-w-4xl mx-auto w-full">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow z-50 flex justify-around py-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const active = location.pathname === item.path
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center text-xs font-medium px-2 py-1 rounded transition-colors duration-150 ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                        >
                            <Icon className="w-5 h-5 mb-0.5" />
                            {item.label}
                        </button>
                    )
                })}

                <button
                    onClick={() => {
                        logout()
                        navigate('/login')
                    }}
                    className="flex flex-col items-center text-xs font-medium text-red-500 px-2 py-1"
                >
                    <LogOutIcon className="w-5 h-5 mb-0.5" />
                    Keluar
                </button>
            </nav>
        </div>
    )
}
