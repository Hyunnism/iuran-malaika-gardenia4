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

// === CREATE SNAP ===
router.post('/create-snap', async (req, res) => {
    const { user_id, tagihan_id, jenis } = req.body
    const supabase = req.supabase

    try {
        let nominal = 0
        let namaIuran = 'Iuran'
        let userName = 'Warga'

        if (jenis === 'rutin') {
            const { data: tagihan, error: tagihanErr } = await supabase
                .from('iuran_tagihan').select('*').eq('id', tagihan_id).single()

            if (tagihanErr || !tagihan) {
                return res.status(404).json({ error: 'Tagihan rutin tidak ditemukan' })
            }

            const { data: iuran } = await supabase
                .from('iuran_rutin').select('nama_iuran, nominal')
                .eq('id', tagihan.iuran_rutin_id).single()

            const { data: user } = await supabase
                .from('users').select('name').eq('id', tagihan.user_id).single()

            nominal = iuran?.nominal || 0
            namaIuran = iuran?.nama_iuran || 'Iuran Rutin'
            userName = user?.name || 'Warga'
        }

        else if (jenis === 'tambahan') {
            const { data: tagihan, error: tagihanErr } = await supabase
                .from('tagihan_tambahan').select('*').eq('id', tagihan_id).single()

            if (tagihanErr || !tagihan) {
                return res.status(404).json({ error: 'Tagihan tambahan tidak ditemukan' })
            }

            const { data: iuran } = await supabase
                .from('iuran_tambahan').select('nama_iuran, nominal')
                .eq('id', tagihan.iuran_tambahan_id).single()

            const { data: user } = await supabase
                .from('users').select('name').eq('id', tagihan.user_id).single()

            nominal = iuran?.nominal || 0
            namaIuran = iuran?.nama_iuran || 'Iuran Tambahan'
            userName = user?.name || 'Warga'
        }

        else {
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
        const { order_id } = notification

        // 📦 DEBUG: log isi notifikasi
        console.log('📦 Midtrans Webhook Payload:', JSON.stringify(notification, null, 2))
        console.log('🧾 order_id:', order_id)
        console.log('💳 payment_type:', notification.payment_type)
        console.log('📌 transaction_status:', notification.transaction_status)
        console.log('🔐 fraud_status:', notification.fraud_status)

        if (!order_id || !order_id.startsWith('INV-')) {
            console.warn('⚠️ Notifikasi tidak valid, order_id:', order_id)
            return res.status(200).send('ignored')
        }

        let transactionStatus = notification.transaction_status
        const paymentType = notification.payment_type

        if (transactionStatus === 'capture' && paymentType === 'credit_card') {
            transactionStatus = 'settlement'
        }

        if (transactionStatus !== 'settlement' || notification.fraud_status === 'deny') {
            console.warn('⚠️ Notifikasi bukan transaksi sukses, status:', transactionStatus)
            return res.status(200).send('ignored')
        }

        const parts = order_id.split('-')
        const jenis = parts[1]
        const tagihan_id = parts.slice(2).join('-')

        const table = jenis === 'rutin' ? 'iuran_tagihan' : 'tagihan_tambahan'
        const statusKey = jenis === 'rutin' ? 'status' : 'status_bayar'

        const { data: tagihanData, error: tagihanErr } = await supabase
            .from(table).select('user_id').eq('id', tagihan_id).single()

        if (tagihanErr || !tagihanData?.user_id) {
            console.error('❌ Tagihan tidak ditemukan:', tagihanErr?.message)
            return res.status(400).json({ error: 'Tagihan tidak ditemukan' })
        }

        const updatePayload = {
            tanggal_bayar: new Date().toISOString(),
            order_id
        }

        if (jenis === 'rutin') {
            updatePayload.status = 'sudah_bayar'
            updatePayload.metode_bayar = paymentType || 'unknown'
        } else if (jenis === 'tambahan') {
            updatePayload.status_bayar = 'sudah_bayar'
            updatePayload.metode_bayar = paymentType || 'unknown'
        }

        const { error: updateErr } = await supabase
            .from(table)
            .update(updatePayload)
            .eq('id', tagihan_id)

        if (updateErr) {
            console.error('❌ Gagal update tagihan:', updateErr.message)
            return res.status(500).json({ error: 'Gagal update tagihan' })
        }

        const { data: insertedLog } = await supabase
            .from('pembayaran_log')
            .insert({
                user_id: tagihanData.user_id,
                tagihan_id,
                jenis,
                metode: paymentType || 'unknown',
                amount: parseInt(notification.gross_amount),
                waktu: new Date().toISOString(),
                midtrans_order_id: order_id,
                midtrans_response: notification
            })
            .select('id')
            .single()

        if (insertedLog) {
            const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
            const invoiceUrl = `${baseUrl}/invoice/public/${jenis}/${tagihan_id}`
            const fileName = `invoice-${tagihan_id}.pdf`

            try {
                await generateAndUploadInvoicePdf(invoiceUrl, fileName, jenis, tagihan_id)
                console.log('✅ Invoice berhasil disimpan ke Supabase')
            } catch (err) {
                console.error('❌ Gagal generate/simpan invoice:', err)
            }
        }

        return res.status(200).send('ok')

    } catch (err) {
        console.error('❌ Webhook error:', err)
        return res.status(500).json({ error: 'Webhook gagal' })
    }
})


// === TEST INVOICE MANUAL ===
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
