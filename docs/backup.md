# Back up and restore an instance

In Settings → Storage → Danger zone, **Download backup** saves a version-1
ContentOS JSON file. It includes every post (including trash), settings,
writing activity, and base64-encoded media objects. Keep the file private: it
contains unpublished writing and any settings values saved in the database.

**Restore a backup** accepts version-1 JSON files. Files up to 16 MiB use a
single request; larger files upload each original/preview object as a separate
raw stream and then submit a metadata-only commit:

- **Merge** retains current posts and settings, adds the imported posts/media,
  renames colliding slugs with `-imported-2` (then `-imported-3`, etc.), and
  keeps the larger writing-activity count for matching dates. A source
  settings row is used only when the destination has none.
- **Replace** requires typing `REPLACE`. It replaces this owner's posts,
  media, settings, and activity with the backup. It does not delete the owner
  account, credentials, sessions, or other users' data.

Media objects receive new immutable keys beneath the destination owner's R2
prefix, and URLs and editor media references are remapped. New exports include
post/media IDs for accurate references; older version-1 exports without IDs
are also accepted, resolving references through their source URLs. Storage
configuration (bucket/account/public URL) always comes from the destination
environment, never the source settings row. Configure `R2_PUBLIC_URL` for a
backup containing managed objects.

The importer validates metadata and staged objects before committing database
changes in one D1 batch. Large restores keep the Worker below the JSON/media
buffering limit: each raw media request streams into R2 (up to 50 MiB per
object), and the final metadata request is capped at 16 MiB. The browser reads
the JSON file and uploads one object at a time, showing progress and allowing
cancel before the commit begins. Cancel or an upload/DB failure removes staged
objects; on a successful Replace the old managed objects are removed. An
interrupted browser with no chance to send Cancel may leave staging objects in
R2; these can be identified by the `restore-<session>` key prefix. A committed
restore has a D1 marker so a lost response can be retried without duplicating
posts. Apply migration `0007` before deploying the chunked endpoints.

A backup with a missing original R2 object cannot be restored; exports mark
absent objects with `missing: true` so this can be diagnosed before import.
Missing previews are allowed and restored without a preview.

Verification: run `./node_modules/.bin/tsx scripts/backup-import-e2e.ts` and
`./node_modules/.bin/tsx scripts/backup-chunked-e2e.ts`; inspect the repeatable
artifacts under `docs/e2e/backup-import.log` and `docs/e2e/backup-chunked.log`.
