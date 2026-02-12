# Tools

## Update User Profiles Tool.html

Browser-based. Use to **create missing `userPrivate/{uid}` docs** (blank defaults). Requires temporary permissive Firestore rules; see the yellow box in the file.

---

## sync-auth-to-userPrivate.js

Node script. Use **after** every user has a `userPrivate` doc. It matches Auth UIDs to `userPrivate` and backfills **email**, **signUpMethod**, and (for Google users) **googlePhotoURL** / **googleName** from Firebase Auth.

**Run:** `npm run sync-userprivate` (from project root)

**Setup:**

1. Firebase Console → Project Settings → Service accounts → **Generate new private key**. Save the JSON (e.g. as `service-account.json` in project root). Add `service-account.json` to `.gitignore` (already added).
2. Set the key path:
   - **Option A:** Put `service-account.json` in the **tools/** folder (next to the script). The script will find it.
   - **Option B:** Put `service-account.json` in project root.
   - **Option C:** `set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json` (Windows) or `export GOOGLE_APPLICATION_CREDENTIALS=./tools/service-account.json` (Mac/Linux).
3. Temporarily allow write on `userPrivate` in Firestore rules (or use Admin SDK rules that allow your service account).
4. Run: `npm run sync-userprivate`.
5. Restore your normal Firestore rules when done.

**Behavior:** Lists all Auth users, and for each UID updates the corresponding `userPrivate/{uid}` doc with `email`, `signUpMethod` (`google` or `email`), and if Google: `googlePhotoURL`, `googleName`. Skips UIDs that have no `userPrivate` doc.
