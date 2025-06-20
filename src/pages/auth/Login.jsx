import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return setError(error.message)

        // Fetch user role from `users` table
        const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single()

        if (roleError || !userData) {
            return setError('Gagal mengambil data role.')
        }

        const role = userData.role
        if (role === 'admin' || role === 'superadmin') {
            // Force userContext to refresh (optional step)
            const { data: { user: refreshedUser } } = await supabase.auth.getUser()
            if (refreshedUser) {
                navigate('/dashboard')
            }
        } else {
            const { data: { user: refreshedUser } } = await supabase.auth.getUser()
            if (refreshedUser) {
                navigate('/warga/tagihan')
            }
        }


    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-80">
                <h1 className="text-lg font-bold mb-4">Login Admin</h1>
                {error && <p className="text-red-500">{error}</p>}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input mt-2"
                />
                <button type="submit" className="btn mt-4 w-full">Login</button>
            </form>
        </div>
    )
}
