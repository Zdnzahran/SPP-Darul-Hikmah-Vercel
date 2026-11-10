import { buatApp } from '../backend/src/app.js';
import { sinkronTagihan } from '../backend/src/tagihan.js';

const app = buatApp();

// Endpoint khusus Vercel Cron atau pinger (untuk trigger sinkronisasi tagihan)
app.get('/api/cron', async (req, res) => {
  try {
    const hasil = await sinkronTagihan();
    res.json({
      sukses: true,
      pesan: 'Sinkronisasi tagihan selesai.',
      detail: hasil,
    });
  } catch (err) {
    console.error('Sinkronisasi via cron gagal:', err);
    res.status(500).json({
      sukses: false,
      pesan: 'Gagal melakukan sinkronisasi tagihan.',
      error: err.message,
    });
  }
});

export default app;

