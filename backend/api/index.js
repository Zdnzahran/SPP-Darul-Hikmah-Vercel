// Entry point untuk Vercel Serverless Function.
// Vercel memakai file ini sebagai handler; Express menangani routing-nya sendiri.
import { buatApp } from '../src/app.js';

const app = buatApp();
export default app;

