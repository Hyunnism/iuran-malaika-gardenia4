import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function generateAndUploadInvoicePdf(invoiceUrl, fileName, jenis, tagihanId) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.goto(invoiceUrl, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true })

    await browser.close()

    // Upload ke Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('invoice')
        .upload(`invoice/${fileName}`, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
        })

    if (uploadError) throw new Error('Gagal upload PDF ke storage: ' + uploadError.message)

    // Dapatkan URL publik
    const { data: publicUrlData } = supabase.storage
        .from('invoice')
        .getPublicUrl(`invoice/${fileName}`)

    // Tentukan nama tabel berdasarkan jenis
    const table = jenis === 'rutin' ? 'iuran_tagihan' : 'tagihan_tambahan'

    // Update ke kolom invoice_url
    const { error: updateErr } = await supabase
        .from(table)
        .update({ invoice_url: publicUrlData.publicUrl })
        .eq('id', tagihanId)

    if (updateErr) throw new Error('Gagal update invoice_url ke tagihan: ' + updateErr.message)

    return publicUrlData.publicUrl
}
