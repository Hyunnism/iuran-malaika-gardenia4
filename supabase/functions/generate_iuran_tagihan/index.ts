import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
serve(async (req)=>{
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  // 📅 Ambil bulan dari query param atau default ke bulan ini
  const url = new URL(req.url);
  const paramBulan = url.searchParams.get('bulan') // format: '2025-07-01'
  ;
  const bulanTagih = paramBulan || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  // 🧪 Cek apakah sudah ada tagihan untuk bulan itu
  const { data: existing, error: checkErr } = await supabase.from('iuran_tagihan').select('id').eq('bulan_tagih', bulanTagih).limit(1);
  if (checkErr) {
    return new Response(JSON.stringify({
      error: checkErr.message
    }), {
      status: 500
    });
  }
  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({
      error: `Tagihan untuk bulan ${bulanTagih} sudah digenerate`
    }), {
      status: 400
    });
  }
  // ✅ Jalankan generate dengan parameter bulan tertentu
  const { error } = await supabase.rpc('generate_iuran_tagihan', {
    target_bulan: bulanTagih
  });
  if (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500
    });
  }
  return new Response(JSON.stringify({
    message: `✅ Tagihan berhasil dibuat untuk bulan ${bulanTagih}`
  }), {
    status: 200
  });
});
