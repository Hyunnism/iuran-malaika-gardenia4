import { useState } from 'react'
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom'
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
            <aside
                className={`
        fixed top-0 left-0 z-50 h-full bg-gradient-to-b from-blue-800 to-blue-600 text-white
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        flex flex-col
        transition-[width] duration-300
        ${collapsed ? 'md:w-20' : 'md:w-64'}
    `}
            >
                <div className={`h-16 border-b border-blue-500 px-4 flex items-center ${collapsed || window.innerWidth < 768 ? 'justify-center' : 'justify-between'}`}>
                    {/* Logo only muncul jika tidak collapsed dan bukan mobile */}
                    {!collapsed && window.innerWidth >= 768 && (
                        <span className="text-lg font-bold">Iuran Malaika</span>
                    )}

                    <button
                        onClick={() =>
                            window.innerWidth < 768
                                ? setMobileOpen(!mobileOpen)
                                : setCollapsed(!collapsed)
                        }
                        className="text-white"
                    >
                        {window.innerWidth < 768
                            ? mobileOpen
                                ? <X size={24} />
                                : <Menu size={24} />
                            : collapsed
                                ? <Menu size={24} />
                                : <X size={24} />
                        }
                    </button>
                </div>

                <nav className="mt-6 space-y-1 px-2 flex-1 overflow-y-auto">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end
                            className={({ isActive }) =>
                                `
                    flex ${collapsed ? 'justify-center' : 'justify-start'} items-center
                    ${collapsed ? 'p-3' : 'p-2'} ${collapsed ? 'gap-0' : 'gap-3'}
                    rounded transition-all duration-200
                    ${isActive
                                    ? 'bg-white text-blue-800 font-semibold shadow-inner'
                                    : 'hover:bg-blue-700 hover:bg-opacity-30 text-white'
                                }
                    `
                            }
                        >
                            <Icon size={20} />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <button
                    onClick={handleLogout}
                    className={`w-full text-left py-3 border-t border-blue-500 hover:text-red-500 ${collapsed ? 'text-center px-0 text-xs text-red-300' : 'px-4 text-red-300'
                        }`}
                >
                    Logout
                </button>
            </aside>

            {/* Overlay mobile */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
                />
            )}

            {/* Main content */}
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

                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
