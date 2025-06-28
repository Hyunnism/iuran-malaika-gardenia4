import puppeteer from 'puppeteer'
import path from 'path'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function uploadToSupabase(localPath, supabasePath) {
    const fileBuffer = readFileSync(localPath)

    const { error: uploadError } = await supabase.storage
        .from('invoice')
        .upload(supabasePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: true
        })

    if (uploadError) throw new Error('Gagal upload PDF: ' + uploadError.message)

    const { data } = supabase.storage
        .from('invoice')
        .getPublicUrl(supabasePath)

    return data.publicUrl
}

export async function renderRondaInvoicePdf(id) {
    const url = `http://localhost:5173/invoice-ronda/${id}`
    const filePath = path.resolve(`temp/invoice_ronda_${id}.pdf`)

    const browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.pdf({ path: filePath, format: 'A4' })

    await browser.close()

    const supabasePath = `invoices/ronda/invoice_ronda_${id}.pdf`
    const publicUrl = await uploadToSupabase(filePath, supabasePath)

    unlinkSync(filePath)
    return publicUrl
}
