import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/SupabaseClient'

export default function ProfilWarga() {
    const { user } = useUser()
    const [profil, setProfil] = useState(null)

    useEffect(() => {
        const fetchProfil = async () => {
            if (user?.id) {
                const { data, error } = await supabase
                    .from('users')
                    .select('name, nomor_rumah, nomor_hp')
                    .eq('id', user.id)
                    .single()

                if (!error) setProfil(data)
            }
        }

        fetchProfil()
    }, [user])

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold text-gray-800">👤 Profil Saya</h1>

            <div className="bg-white rounded-2xl shadow border p-5 space-y-4">
                {profil ? (
                    <>
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-800">{profil.name}</h2>
                            <p className="text-sm text-gray-600">
                                🏠 Rumah: <span className="font-medium text-gray-700">{profil.nomor_rumah}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                📱 HP: <span className="font-medium text-gray-700">{profil.nomor_hp || '-'}</span>
                            </p>
                        </div>

                        <div className="pt-2 border-t text-sm text-gray-500">
                            <p>
                                ID Pengguna:{' '}
                                <span className="text-gray-700 font-medium">{user?.id}</span>
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-500">Memuat data profil...</p>
                )}
            </div>
        </div>
    )
}
