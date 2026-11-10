export class ApiError extends Error {
  constructor(pesan, status, detail) {
    super(pesan);
    this.status = status;
    this.detail = detail;
  }
}

// VITE_API_URL diisi saat deploy frontend ke Vercel: URL backend Vercel (mis. https://spp-backend.vercel.app).
// Saat development lokal, dikosongkan agar proxy Vite yang menangani (/api → localhost:4000).
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/** Semua permintaan ke backend lewat sini. Mengembalikan JSON, atau null untuk 204. */
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      // 'include' diperlukan agar cookie (token login) dikirim ke domain backend yang berbeda.
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.pesan || 'Terjadi kesalahan.', res.status, data?.error?.detail);
  return data;
}
