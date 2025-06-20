export async function logActivity(supabase, { user_id, action, table_name, row_id, keterangan }) {
    const { error } = await supabase.from('activity_logs').insert({
        user_id,
        action,
        table_name,
        row_id,
        keterangan
    })

    if (error) {
        console.error(`❌ Gagal log aktivitas (${action}) ke tabel ${table_name}:`, error.message)
    }
}
