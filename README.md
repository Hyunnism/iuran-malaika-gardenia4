# 💰 Malaika Iuran – Sistem Manajemen Iuran RT

Malaika Iuran adalah aplikasi web yang dirancang untuk memudahkan pengelolaan iuran rutin dan tambahan di lingkungan RT/RW. Aplikasi ini memungkinkan admin mencatat, memantau, dan mencetak invoice iuran warga, serta warga dapat melihat dan membayar tagihan secara online.

---

## 🚀 Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database & Auth**: Supabase (PostgreSQL)
- **Payments**: Midtrans Snap API
- **PDF Rendering**: Puppeteer
- **Storage**: Supabase Storage
- **Scheduler**: Supabase Edge Functions + Cron

---

## 📁 Struktur Direktori

```bash
malaika-iuran/
│
├── public/                     # HTML publik
│
├── server/                    # Backend Express
│   ├── routes/
│   │   └── midTrans.js        # Webhook & Snap integration
│   ├── utils/
│   │   ├── LogActivity.js     # Audit Trail helper
│   │   └── renderInvoicePdf.js # Generate & upload PDF to Supabase
│   └── index.js               # Main server entry
│
├── src/                       # Frontend React
│   ├── assets/                # Logo, icons, dsb
│   ├── components/            # Komponen UI
│   ├── context/               # UserContext (role & auth)
│   ├── hooks/                 # Custom hooks (e.g., useAdminId)
│   ├── layouts/               # Layout admin dan warga
│   ├── lib/                   # Supabase client init
│   ├── pages/
│   │   ├── auth/              # Login page
│   │   ├── public/            # Halaman warga (invoice, profil, dsb)
│   │   └── dashboard/         # Halaman admin
│   ├── routes/                # ProtectedRoute (role-based access)
│   ├── styles/                # Tailwind config
│   └── App.jsx, main.jsx      # Entry point
│
├── supabase/                  # Supabase CLI project
│   ├── config.toml
│   └── functions/
│       └── generate_iuran_tagihan/ # Cron function (tiap bulan)
│
├── .env                       # Env global
├── tailwind.config.js
└── vite.config.js
