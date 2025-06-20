import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function useAdminId() {
    const [adminId, setAdminId] = useState(null)

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setAdminId(session?.user?.id || null)
        }

        getSession()
    }, [])

    return adminId
}
