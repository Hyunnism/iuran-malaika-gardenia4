import { useState } from 'react'
import { Outlet, useLocation, useNavigate, NavLink, matchPath } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Home, Users, CreditCard, Menu, X } from 'lucide-react'

export default function AdminLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: Home },
        { to: '/dashboard/iuran', label: 'Iuran', icon: CreditCard },
        { to: '/dashboard/iuran/tambahan', label: 'Iuran Tambahan', icon: CreditCard },
        { to: '/dashboard/pengguna', label: 'Warga', icon: Users }

    ]

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900">
            {/* Sidebar */}
            <aside className={`${collapsed ? 'w-20' : 'w-64'} ${mobileOpen ? 'block' : 'hidden'} md:block bg-gradient-to-b from-blue-800 to-blue-600 text-white transition-all duration-300 flex-shrink-0`}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-blue-500">
                    {!collapsed && <span className="text-lg font-bold">Iuran Malaika</span>}
                    <button onClick={() => window.innerWidth < 768 ? setMobileOpen(false) : setCollapsed(!collapsed)}>
                        {collapsed ? <Menu /> : <X />}
                    </button>
                </div>

                <nav className="mt-6 space-y-1 px-2">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end
                            className={({ isActive }) =>
                                `flex items-center gap-3 p-2 rounded transition-all duration-200 ${isActive
                                    ? 'bg-white text-blue-800 font-semibold shadow-inner'
                                    : 'hover:bg-blue-700 hover:bg-opacity-30 text-white'
                                }`
                            }
                        >
                            <Icon size={20} />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>



                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-300 hover:text-red-500 mt-auto">
                    Logout
                </button>
            </aside>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black bg-opacity-40 md:hidden z-30" />
            )}

            {/* Main Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white border-b shadow px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-gray-700" onClick={() => setMobileOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <span className="text-xl font-semibold text-gray-700">Admin Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="hidden sm:inline">Hyun (Superadmin)</span>
                        <button onClick={handleLogout} className="text-red-500 hover:underline">Logout</button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
