import express from 'express'
import midtransClient from 'midtrans-client'
import dotenv from 'dotenv'
import { generateAndUploadInvoicePdf } from '../utils/renderInvoicePdf.js'
dotenv.config()

const router = express.Router()

const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY
})

router.post('/create-snap', async (req, res) => {
    const { user_id, tagihan_id, jenis } = req.body

    try {
        let nominal = 0
        let namaIuran = 'Iuran'
        let userName = 'Warga'

        if (jenis === 'rutin') {
            const { data: tagihan } = await req.supabase
                .from('iuran_tagihan')
                .select('*, users(name), iuran_rutin(nama_iuran, nominal)')
                .eq('id', tagihan_id)
                .single()

            if (!tagihan) return res.status(404).json({ error: 'Tagihan rutin tidak ditemukan' })
            nominal = tagihan.iuran_rutin.nominal
            namaIuran = tagihan.iuran_rutin.nama_iuran
            userName = tagihan.users.name
        } else if (jenis === 'tambahan') {
            const { data: tagihan } = await req.supabase
                .from('tagihan_tambahan')
                .select('*, users(name), iuran_tambahan(nama_iuran, nominal)')
                .eq('id', tagihan_id)
                .single()

            if (!tagihan) return res.status(404).json({ error: 'Tagihan tambahan tidak ditemukan' })
            nominal = tagihan.iuran_tambahan.nominal
            namaIuran = tagihan.iuran_tambahan.nama_iuran
            userName = tagihan.users.name
        } else {
            return res.status(400).json({ error: 'Jenis tagihan tidak valid' })
        }

        const order_id = `INV-${jenis}-${tagihan_id}`

        const parameter = {
            transaction_details: {
                order_id,
                gross_amount: nominal
            },
            customer_details: {
                first_name: userName,
                email: `${user_id}@iuran.local`
            },
            item_details: [
                {
                    id: tagihan_id,
                    price: nominal,
                    quantity: 1,
                    name: namaIuran
                }
            ]
        }

        const transaction = await snap.createTransaction(parameter)
        return res.json({ payment_url: transaction.redirect_url })
    } catch (err) {
        console.error('❌ Midtrans error:', err)
        return res.status(500).json({ error: err.message })
    }
})

// === WEBHOOK ===
router.post('/webhook', async (req, res) => {
    const notification = req.body
    const supabase = req.supabase

    try {
        if (notification.transaction_status === 'settlement') {
            const { order_id, gross_amount, payment_type } = notification
            const parts = order_id.split('-')
            const jenis = parts[1]
            const tagihan_id = parts.slice(2).join('-')

            const table = jenis === 'rutin' ? 'iuran_tagihan' : 'tagihan_tambahan'
            const statusKey = jenis === 'rutin' ? 'status' : 'status_bayar'

            const { data: tagihanData, error: tagihanErr } = await supabase
                .from(table)
                .select('user_id')
                .eq('id', tagihan_id)
                .single()

            if (tagihanErr || !tagihanData?.user_id) {
                console.error('❌ Tagihan tidak ditemukan:', tagihanErr?.message)
                return res.status(400).json({ error: 'Tagihan tidak ditemukan' })
            }

            await supabase.from(table).update({
                [statusKey]: 'sudah_bayar',
                tanggal_bayar: new Date().toISOString(),
                metode_bayar: payment_type,
                order_id
            }).eq('id', tagihan_id)

            const { data: insertedLog } = await supabase
                .from('pembayaran_log')
                .insert({
                    user_id: tagihanData.user_id,
                    tagihan_id,
                    jenis,
                    metode: payment_type,
                    amount: parseInt(gross_amount),
                    waktu: new Date().toISOString(),
                    midtrans_order_id: order_id,
                    midtrans_response: notification
                })
                .select('id')
                .single()

            // ✅ Generate PDF dan upload ke Supabase
            if (insertedLog) {
                const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
                const invoiceUrl = `${baseUrl}/invoice/${tagihan_id}`
                const fileName = `invoice-${tagihan_id}.pdf`

                try {
                    await generateAndUploadInvoicePdf(invoiceUrl, fileName, jenis, tagihan_id)
                    console.log('✅ Invoice berhasil disimpan')
                } catch (err) {
                    console.error('❌ Gagal simpan invoice PDF:', err)
                }
            }

            return res.status(200).send('ok')
        }

        return res.status(200).send('ignored')
    } catch (err) {
        console.error('❌ Webhook error:', err)
        return res.status(500).json({ error: 'Webhook gagal' })
    }
})

// 🧪 Tes manual generate invoice PDF dan simpan ke Supabase
router.post('/test-generate-invoice', async (req, res) => {
    const { tagihan_id, jenis } = req.body
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173'

    try {
        const invoiceUrl = `${baseUrl}/invoice/public/${jenis}/${tagihan_id}`
        const fileName = `invoice-${tagihan_id}.pdf`

        const pdfUrl = await generateAndUploadInvoicePdf(invoiceUrl, fileName, jenis, tagihan_id)
        return res.json({ success: true, invoice_url: pdfUrl })
    } catch (err) {
        console.error('❌ Gagal generate invoice PDF:', err)
        return res.status(500).json({ error: err.message })
    }
})


export default router
