// src/routes/ProtectedRoute.jsx
import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/SupabaseClient'

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useUser()
    const [userData, setUserData] = useState(null)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        const fetchUser = async () => {
            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                setUserData(data)
            }
            setChecking(false)
        }

        if (user) fetchUser()
        else setChecking(false)
    }, [user])

    if (loading || checking) return null // atau loading spinner

    if (!user) return <Navigate to="/login" />
    if (userData && !allowedRoles.includes(userData.role)) return <Navigate to="/" />

    return children
}
