import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'marine-will-2cjpc';

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.projectId) {
      projectId = parsed.projectId;
    }
  }
} catch (e) {
  console.warn('[Firebase Admin] Notice: could not load config from file:', e);
}

if (!getApps().length) {
  try {
    initializeApp({
      projectId,
    });
  } catch (err: any) {
    console.warn('[Firebase Admin] Initialization notice:', err?.message);
  }
}

let adminAuthInstance: any;
try {
  adminAuthInstance = getAuth();
} catch (err: any) {
  console.warn('[Firebase Admin] getAuth fallback notice:', err?.message);
  adminAuthInstance = {
    verifyIdToken: async () => {
      throw new Error('Firebase Admin Auth not initialized');
    }
  };
}

export const adminAuth = adminAuthInstance;
