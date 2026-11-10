import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { AppError, penanganError } from './errors.js';
import { sinkronTagihan } from './tagihan.js';
import authRouter, { wajibLogin } from './auth.js';
import sppRouter from './routes/spp.js';
import kelasRouter from './routes/kelas.js';
import siswaRouter from './routes/siswa.js';
import pembayaranRouter from './routes/pembayaran.js';
import tagihanRouter from './routes/tagihan.js';
import laporanRouter from './routes/laporan.js';

export function buatApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.production) app.set('trust proxy', 1); // di belakang proxy HTTPS (nginx, PaaS)

  // CORS: izinkan domain frontend yang didaftarkan di ALLOWED_ORIGINS.
  // Di deploy terpisah (mis. Vercel), frontend dan backend beda domain sehingga perlu header ini.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Izinkan semua origin di development; di production hanya yang terdaftar.
    if (origin && (!config.production || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Pastikan path selalu diawali /api jika di-rewrite tanpa /api (misal di Vercel/serverless)
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) {
      req.url = `/api${req.url}`;
    }
    next();
  });

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

  app.use('/api/auth', authRouter); // login terbuka; rute lain di dalamnya memeriksa login sendiri
  app.use('/api', wajibLogin); // semua rute di bawah ini wajib login
  app.use('/api/spp', sppRouter);
  app.use('/api/kelas', kelasRouter);
  app.use('/api/siswa', siswaRouter);
  app.use('/api/pembayaran', pembayaranRouter);
  app.use('/api/tagihan', tagihanRouter);
  app.use('/api/laporan', laporanRouter);
  app.use('/api', (req, res, next) => next(new AppError(404, 'TIDAK_DITEMUKAN', 'Alamat API tidak ditemukan.')));

  // Produksi: Express ikut menyajikan hasil build frontend (frontend/dist).
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(penanganError);
  return app;
}
