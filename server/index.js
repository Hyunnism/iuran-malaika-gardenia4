import express from 'express'
import cors from 'cors'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { logActivity } from './utils/logActivity.js'
import { renderRondaInvoicePdf } from './utils/renderRondaInvoicePdf.js'


dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
    origin: [
        'capacitor://localhost',
        'http://localhost',
        'https://localhost',
        'http://localhost:5173',
        'https://malaikagardenia.netlify.app',
        'https://malaikaserver-production.up.railway.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}))

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

app.post('/api/ronda/generate-jadwal', async (req, res) => {
    const { tanggal_mulai, admin_id } = req.body;

    if (!tanggal_mulai || !admin_id) {
        return res.status(400).json({ error: 'tanggal_mulai dan admin_id wajib diisi' });
    }

    try {
        const tanggalStart = dayjs(tanggal_mulai).startOf('week')
        const tanggalEnd = tanggalStart.add(6, 'day')
        const tanggalAwalStr = tanggalStart.toISOString().split('T')[0];
        const tanggalAkhirStr = tanggalEnd.toISOString().split('T')[0];

        // ✅ Cek apakah sudah ada jadwal di minggu ini
        const { data: existing, error: checkErr } = await supabase
            .from('iuran_ronda')
            .select('id')
            .gte('tanggal_ronda', tanggalAwalStr)
            .lte('tanggal_ronda', tanggalAkhirStr);

        if (checkErr) throw checkErr;

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Jadwal ronda untuk minggu ini sudah ada.' });
        }

        // ✅ Ambil data warga
        const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'warga')
            .order('created_at', { ascending: true });

        if (userErr) throw userErr;

        if (users.length < 20) {
            return res.status(400).json({ error: 'Minimal 20 warga diperlukan untuk pembagian mingguan.' });
        }

        // ✅ Bagi jadwal
        const jadwalPerHari = [3, 3, 3, 3, 3, 3, 2]; // 6 hari × 3 + 1 hari × 2
        const insertData = [];
        let userIndex = 0;

        for (let i = 0; i < 7; i++) {
            const tanggalFormatted = tanggalStart.add(i, 'day').format('YYYY-MM-DD')

            const jumlahWargaHariIni = jadwalPerHari[i];
            for (let j = 0; j < jumlahWargaHariIni; j++) {
                const user = users[userIndex];
                if (!user) break;

                insertData.push({
                    user_id: user.id,
                    tanggal_ronda: tanggalFormatted,
                    absen: false,
                    denda: 0,
                    status_bayar: false
                });

                userIndex++;
            }
        }

        // ✅ Insert ke DB
        const { error: insertErr } = await supabase
            .from('iuran_ronda')
            .insert(insertData);

        if (insertErr) throw insertErr;

        // ✅ Audit log
        await logActivity(supabase, {
            user_id: admin_id,
            action: 'create',
            table_name: 'iuran_ronda',
            row_id: null,
            keterangan: `Generate jadwal ronda mingguan mulai ${tanggalAwalStr}`
        });

        // ✅ Ambil jadwal yang barusan dibuat (dengan join nama warga)
        const { data: jadwal, error: jadwalErr } = await supabase
            .from('iuran_ronda')
            .select(`
                tanggal_ronda,
                user_name:users(name)
            `)
            .gte('tanggal_ronda', tanggalAwalStr)
            .lte('tanggal_ronda', tanggalAkhirStr)
            .order('tanggal_ronda', { ascending: true });

        if (jadwalErr) throw jadwalErr;

        // ✅ Kirim data ke frontend
        return res.status(200).json({
            message: '✅ Jadwal ronda mingguan berhasil dibuat.',
            tanggal: `${tanggalAwalStr} s.d. ${tanggalAkhirStr}`,
            total_dibuat: insertData.length,
            jadwal
        });
    } catch (err) {
        console.error('❌ Gagal generate jadwal ronda:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/ronda/jadwal-mingguan', async (req, res) => {
    try {
        const today = new Date();
        const start = new Date(today);
        const dayOfWeek = today.getDay(); // 0 = Minggu, 6 = Sabtu

        // Awal minggu = hari Minggu paling dekat ke belakang
        start.setDate(today.getDate() - dayOfWeek);

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Sabtu

        const tanggalAwalStr = start.toISOString().split('T')[0];
        const tanggalAkhirStr = end.toISOString().split('T')[0];

        const { data: jadwal, error } = await supabase
            .from('iuran_ronda')
            .select(`
  tanggal_ronda,
  user_name:users(name)
`)
            .gte('tanggal_ronda', tanggalAwalStr)
            .lte('tanggal_ronda', tanggalAkhirStr)
            .order('tanggal_ronda', { ascending: true });


        if (error) throw error;

        return res.status(200).json({ jadwal });
    } catch (err) {
        console.error('Gagal ambil jadwal ronda mingguan:', err);
        return res.status(500).json({ error: err.message });
    }
});


app.get('/api/ronda/absensi', async (req, res) => {
    const { tanggal } = req.query
    if (!tanggal) return res.status(400).json({ error: 'Tanggal wajib diisi' })

    try {
        const { data, error } = await supabase
            .from('iuran_ronda')
            .select('id, user_id, absen, denda, users(name)')
            .eq('tanggal_ronda', tanggal)

        if (error) throw error

        const result = data.map(item => ({
            id: item.id,
            user_id: item.user_id,
            absen: item.absen,
            denda: item.denda,
            user_name: item.users.name
        }))

        res.json(result)
    } catch (err) {
        console.error('❌ Gagal ambil absensi ronda:', err)
        res.status(500).json({ error: err.message })
    }
})

app.put('/api/ronda/update-absensi', async (req, res) => {
    const { tanggal_ronda, updated_by, data } = req.body

    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Data absensi tidak valid' })
    }

    try {
        const updates = data.map(row => ({
            id: row.id,
            absen: row.absen,
            denda: row.denda
        }))

        for (const row of updates) {
            await supabase
                .from('iuran_ronda')
                .update({ absen: row.absen, denda: row.denda })
                .eq('id', row.id)
        }

        await logActivity(supabase, {
            user_id: updated_by,
            action: 'update',
            table_name: 'iuran_ronda',
            row_id: null,
            keterangan: `Update absensi ronda tanggal ${tanggal_ronda}`
        })

        res.json({ success: true })
    } catch (err) {
        console.error('❌ Gagal update absensi ronda:', err)
        res.status(500).json({ error: err.message })
    }
})

app.post('/api/ronda/generate-invoice', async (req, res) => {
    const { admin_id } = req.body

    try {
        const { data, error } = await supabase
            .from('iuran_ronda')
            .select('id')
            .eq('absen', false)
            .eq('status_bayar', false)
            .gt('denda', 0)

        if (error) throw error

        for (const item of data) {
            const invoiceUrl = await renderRondaInvoicePdf(item.id)
            await supabase
                .from('iuran_ronda')
                .update({ invoice_url: invoiceUrl })
                .eq('id', item.id)
        }

        await logActivity(supabase, {
            user_id: admin_id,
            action: 'generate',
            table_name: 'iuran_ronda',
            row_id: null,
            keterangan: 'Generate invoice denda ronda otomatis'
        })

        res.json({ success: true, count: data.length })
    } catch (err) {
        console.error('❌ Gagal generate invoice ronda:', err)
        res.status(500).json({ error: err.message })
    }
})

app.get('/api/ronda/bolos-belum-bayar', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('iuran_ronda')
            .select('id, tanggal_ronda, denda, invoice_url, users(name)')
            .eq('absen', false)
            .eq('status_bayar', false)
            .gt('denda', 0)

        if (error) throw error

        res.json(data)
    } catch (err) {
        console.error('❌ Gagal ambil data denda belum bayar:', err)
        res.status(500).json({ error: err.message })
    }
})

app.put('/api/ronda/tandai-lunas', async (req, res) => {
    const { id, admin_id } = req.body

    if (!id || !admin_id) {
        return res.status(400).json({ error: 'ID dan admin_id wajib diisi' })
    }

    try {
        await supabase
            .from('iuran_ronda')
            .update({ status_bayar: true })
            .eq('id', id)

        await logActivity(supabase, {
            user_id: admin_id,
            action: 'update',
            table_name: 'iuran_ronda',
            row_id: id,
            keterangan: 'Tandai pembayaran denda ronda sebagai lunas'
        })

        res.json({ success: true })
    } catch (err) {
        console.error('❌ Gagal tandai lunas:', err)
        res.status(500).json({ error: err.message })
    }
})

app.get('/api/ronda/statistik', async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('statistik_ronda_per_warga')

        if (error) throw error

        res.json(data)
    } catch (err) {
        console.error('❌ Gagal ambil statistik ronda:', err)
        res.status(500).json({ error: err.message })
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
