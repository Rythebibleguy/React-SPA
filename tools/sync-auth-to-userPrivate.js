/**
 * Sync Firebase Auth user data (email, signUpMethod, Google profile) into userPrivate docs.
 * Run with: node tools/sync-auth-to-userPrivate.js
 *
 * Setup:
 * 1. Firebase Console → Project Settings → Service accounts → Generate new private key.
 * 2. Save the JSON key as tools/service-account.json (or project root; both are in .gitignore).
 * 3. Or set env: GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json.
 * 4. Temporarily allow write on userPrivate in Firestore rules, then run this script.
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const projectId = 'rythebibleguy-app';
const defaultTimezone = process.env.DEFAULT_TIMEZONE || 'UTC+0';

function getSignUpMethod(providerData) {
  if (!providerData || providerData.length === 0) return null;
  const providerIds = providerData.map((p) => p.providerId);
  if (providerIds.includes('google.com')) return 'google';
  if (providerIds.includes('password')) return 'email';
  return providerIds[0] || null;
}

function getGoogleProfile(providerData) {
  const google = providerData?.find((p) => p.providerId === 'google.com');
  if (!google) return { googlePhotoURL: null, googleName: null };
  return {
    googlePhotoURL: google.photoURL || null,
    googleName: google.displayName || null,
  };
}

function getEmail(user) {
  if (user.email) return user.email;
  const fromProvider = user.providerData?.find((p) => p.email);
  return fromProvider?.email || null;
}

async function main() {
  let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    const inTools = join(__dirname, 'service-account.json');
    const inToolsDouble = join(__dirname, 'service-account.json.json');
    const inRoot = join(__dirname, '..', 'service-account.json');
    keyPath = existsSync(inTools)
      ? inTools
      : existsSync(inToolsDouble)
        ? inToolsDouble
        : inRoot;
  }
  if (!existsSync(keyPath)) {
    console.error(
      'Missing service account key. Put service-account.json in tools/ or project root, or set GOOGLE_APPLICATION_CREDENTIALS.'
    );
    process.exit(1);
  }

  const key = JSON.parse(readFileSync(keyPath, 'utf8'));
  if (key.project_id !== projectId) {
    console.error(`Service account project_id must be ${projectId}.`);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(key) });
  const auth = admin.auth();
  const db = admin.firestore();

  console.log('Listing Firebase Auth users and syncing to userPrivate...\n');
  let total = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    nextPageToken = listResult.pageToken;
    const users = listResult.users;

    for (const user of users) {
      total++;
      const uid = user.uid;
      const signUpMethod = getSignUpMethod(user.providerData);
      if (signUpMethod === 'email') {
        skipped++;
        continue;
      }
      const email = getEmail(user);
      const { googlePhotoURL, googleName } = getGoogleProfile(user.providerData);

      try {
        const privateRef = db.collection('userPrivate').doc(uid);
        const snap = await privateRef.get();
        if (!snap.exists) {
          console.log(`⏭️ ${uid.slice(0, 8)}… no userPrivate doc, skip`);
          skipped++;
          continue;
        }

        const updates = {
          email,
          signUpMethod,
          ...(googlePhotoURL != null && { googlePhotoURL }),
          ...(googleName != null && { googleName }),
        };
        await privateRef.update(updates);
        updated++;
        console.log(
          `✅ ${uid.slice(0, 8)}… ${email || '(no email)'} | ${signUpMethod || '(unknown)'}`
        );
      } catch (err) {
        errors++;
        console.error(`❌ ${uid.slice(0, 8)}… ${err.message}`);
      }
    }
  } while (nextPageToken);

  console.log('\n---');
  console.log(`Total Auth users: ${total}`);
  console.log(`Updated userPrivate: ${updated}`);
  console.log(`Skipped (no doc): ${skipped}`);
  console.log(`Errors: ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
