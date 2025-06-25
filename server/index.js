import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { logActivity } from './utils/logActivity.js'


dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

app.use((req, res, next) => {
    req.supabase = supabase
    next()
})

// ✅ CREATE WARGA
app.post('/api/create-warga', async (req, res) => {
    const { name, nomor_rumah, nomor_hp, created_by } = req.body
    const email = `${nomor_rumah.replace(/\s+/g, '').toLowerCase()}@iuran.local`
    const password = 'warga123'

    try {
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
        if (listErr) throw listErr

        const emailUsed = list.users.find(u => u.email === email)
        if (emailUsed) {
            return res.status(400).json({ error: 'Email sudah digunakan' })
        }

        const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })

        if (authErr || !auth?.user) {
            return res.status(400).json({ error: authErr?.message || 'Gagal membuat akun auth' })
        }

        const userId = auth.user.id

        const { error: insertError } = await supabase.from('users').insert({
            id: userId,
            name,
            nomor_rumah,
            nomor_hp,
            role: 'warga',
            created_by
        })

        if (insertError) {
            return res.status(400).json({ error: insertError.message })
        }

        const { data: rutinList, error: rutinError } = await supabase
            .from('iuran_rutin')
            .select('id')
            .eq('aktif', true) // ⬅️ hanya ambil iuran aktif


        if (rutinError) {
            return res.status(400).json({ error: rutinError.message })
        }

        const bulanIni = new Date()
        bulanIni.setDate(1)

        const tagihanBaru = rutinList.map(rutin => ({
            user_id: userId,
            iuran_rutin_id: rutin.id,
            bulan_tagih: bulanIni.toISOString(),
            status: 'belum_bayar'
        }))

        const { error: tagihanError } = await supabase
            .from('iuran_tagihan')
            .insert(tagihanBaru)

        if (tagihanError) {
            return res.status(400).json({ error: tagihanError.message })
        }

        // ✅ Audit Log
        await logActivity(supabase, {
            user_id: created_by,
            action: 'create',
            table_name: 'users',
            row_id: userId,
            keterangan: `Menambahkan akun warga ${name}`
        })

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Error create-warga:', err)
        return res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
})

// ✅ IURAN TAMBAHAN
app.post('/api/iuran-tambahan', async (req, res) => {
    const { nama_iuran, deskripsi, nominal, tanggal_tagih, created_by } = req.body

    try {
        const { data: inserted, error: insertErr } = await supabase
            .from('iuran_tambahan')
            .insert([{ nama_iuran, deskripsi, nominal, tanggal_tagih, created_by }])
            .select()
            .single()

        if (insertErr) return res.status(400).json({ error: insertErr.message })

        const tambahanId = inserted.id

        const { data: warga, error: wargaErr } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'warga')

        if (wargaErr) return res.status(400).json({ error: wargaErr.message })

        const semuaTagihan = warga.map(w => ({
            user_id: w.id,
            iuran_tambahan_id: tambahanId,
            status_bayar: 'belum_bayar' // ⬅️ TAMBAHKAN INI!
        }))


        const { error: tagihanErr } = await supabase
            .from('tagihan_tambahan')
            .insert(semuaTagihan)

        if (tagihanErr) return res.status(400).json({ error: tagihanErr.message })

        // ✅ Audit Log
        await logActivity(supabase, {
            user_id: created_by,
            action: 'create',
            table_name: 'iuran_tambahan',
            row_id: tambahanId,
            keterangan: `Menambahkan iuran tambahan: ${nama_iuran}`
        })

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Error tambah iuran tambahan:', err)
        return res.status(500).json({ error: err.message || 'Server error' })
    }
})

// ✅ IURAN TAMBAHAN - UPDATE
app.put('/api/iuran-tambahan/:id', async (req, res) => {
    const id = req.params.id
    const { nama_iuran, deskripsi, nominal, tanggal_tagih, updated_by } = req.body

    try {
        const { error: updateErr } = await supabase
            .from('iuran_tambahan')
            .update({
                nama_iuran,
                deskripsi,
                nominal,
                tanggal_tagih,
                updated_by,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateErr) return res.status(400).json({ error: updateErr.message })

        await logActivity(supabase, {
            user_id: updated_by,
            action: 'update',
            table_name: 'iuran_tambahan',
            row_id: id,
            keterangan: `Mengedit iuran tambahan: ${nama_iuran}`
        })

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Error update iuran tambahan:', err)
        return res.status(500).json({ error: err.message })
    }
})

// ✅ API Generate Iuran Rutin (Manual via Endpoint)
app.post('/api/generate-tagihan-rutin', async (req, res) => {
    const now = new Date()
    const bulanTagih = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10) // YYYY-MM-01

    try {
        // 🔍 Cek apakah sudah ada tagihan untuk bulan ini
        const { data: existing, error: checkErr } = await supabase
            .from('iuran_tagihan')
            .select('id')
            .eq('bulan_tagih', bulanTagih)
            .limit(1)

        if (checkErr) {
            return res.status(500).json({ error: 'Gagal cek tagihan: ' + checkErr.message })
        }

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'Tagihan rutin bulan ini sudah ada' })
        }

        // ✅ Jalankan fungsi SQL (rpc)
        const { error: rpcError } = await supabase.rpc('generate_iuran_tagihan')

        if (rpcError) {
            return res.status(500).json({ error: 'Gagal generate tagihan rutin: ' + rpcError.message })
        }

        return res.json({ success: true, message: 'Tagihan rutin berhasil digenerate' })
    } catch (err) {
        console.error('❌ Gagal generate tagihan rutin:', err)
        return res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
})


// ✅ GENERATE TAGIHAN TAMBAHAN
app.post('/api/generate-tagihan-tambahan', async (req, res) => {
    const { iuran_tambahan_id } = req.body

    if (!iuran_tambahan_id) {
        return res.status(400).json({ error: 'ID iuran_tambahan wajib diisi' })
    }

    try {
        const { data: warga, error: wargaError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'warga')

        if (wargaError) throw wargaError

        const inserts = warga.map(w => ({
            user_id: w.id,
            iuran_tambahan_id,
            status_bayar: false
        }))

        const { error: insertError } = await supabase
            .from('tagihan_tambahan')
            .insert(inserts)

        if (insertError) throw insertError

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Gagal generate tagihan tambahan:', err)
        return res.status(500).json({ error: err.message })
    }
})

// ✅ DELETE WARGA
app.delete('/api/delete-warga/:id', async (req, res) => {
    const userId = req.params.id
    const { admin_id } = req.query

    try {
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
        if (listErr) throw listErr

        const target = list.users.find(u => u.id === userId)
        if (target) {
            const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
            if (deleteAuthError) throw deleteAuthError
        }

        const { error: deleteDbError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId)

        if (deleteDbError) return res.status(400).json({ error: deleteDbError.message })

        // ✅ Audit Log
        await logActivity(supabase, {
            user_id: admin_id,
            action: 'delete',
            table_name: 'users',
            row_id: userId,
            keterangan: 'Menghapus warga dan akun'
        })

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Gagal hapus warga:', err)
        return res.status(500).json({ error: err.message })
    }
})

// ✅ DELETE IURAN RUTIN - update iuran lalu soft delete + log
app.delete('/api/iuran-rutin/:id', async (req, res) => {
    const iuranId = req.params.id
    const { admin_id } = req.query

    try {
        // 1. Tandai sebagai nonaktif (bukan hard delete)
        const { error: updateErr } = await supabase
            .from('iuran_rutin')
            .update({ aktif: false, updated_by: admin_id, updated_at: new Date().toISOString() })
            .eq('id', iuranId)

        if (updateErr) return res.status(400).json({ error: updateErr.message })

        // 2. Audit log ke activity_logs
        await logActivity(supabase, {
            user_id: admin_id,
            action: 'delete',
            table_name: 'iuran_rutin',
            row_id: iuranId,
            keterangan: 'Menonaktifkan iuran rutin (soft delete)'
        })

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Gagal hapus iuran rutin:', err)
        return res.status(500).json({ error: err.message })
    }
})

// ✅ DELETE IURAN TAMBAHAN - hapus iuran dan tagihan terkait, + log
app.delete('/api/iuran-tambahan/:id', async (req, res) => {
    const id = req.params.id
    const { admin_id } = req.query

    try {
        // 1. Hapus semua tagihan tambahan terkait
        const { error: deleteTagihanErr } = await supabase
            .from('tagihan_tambahan')
            .delete()
            .eq('iuran_tambahan_id', id)

        if (deleteTagihanErr) {
            return res.status(400).json({ error: 'Gagal hapus tagihan tambahan: ' + deleteTagihanErr.message })
        }

        // 2. Hapus iuran_tambahan
        const { error: deleteIuranErr } = await supabase
            .from('iuran_tambahan')
            .delete()
            .eq('id', id)

        if (deleteIuranErr) {
            return res.status(400).json({ error: 'Gagal hapus iuran tambahan: ' + deleteIuranErr.message })
        }

        // 3. Catat audit log
        await logActivity(supabase, {
            user_id: admin_id,
            action: 'delete',
            table_name: 'iuran_tambahan',
            row_id: id,
            keterangan: 'Menghapus iuran tambahan dan semua tagihan terkait'
        })

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Gagal hapus iuran tambahan:', err)
        return res.status(500).json({ error: err.message || 'Gagal hapus' })
    }
})



// ✅ API log aktivitas manual (untuk frontend)
app.post('/api/log-activity', async (req, res) => {
    const { user_id, action, table_name, row_id, keterangan } = req.body

    try {
        const { error } = await supabase.from('activity_logs').insert({
            user_id,
            action,
            table_name,
            row_id,
            keterangan
        })

        if (error) return res.status(400).json({ error: error.message })

        return res.json({ success: true })
    } catch (err) {
        console.error('❌ Gagal tulis log aktivitas:', err)
        return res.status(500).json({ error: err.message })
    }
})



import midtransRoutes from './routes/midtrans.js'
app.use('/api/midtrans', midtransRoutes)

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`)
})
