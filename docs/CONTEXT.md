# ContentOS Domain Glossary

## Core Terms

| Term | Meaning |
| --- | --- |
| Instance | One self-hosted ContentOS deployment, owned and operated by one person. |
| Owner | The sole user permitted to sign in to and manage an instance. Ownership is claimed by the first successful OAuth sign-in. |
| Post | A piece of long-form content owned by the instance owner. A post has a title, slug, body, word count, status, and lifecycle timestamps. |
| Draft | A post that is editable but unavailable in the public feed. |
| Published post | A post available through the public feed. |
| Scheduled post | A post intended for future publication. This is a planned lifecycle state; it does not yet have scheduling behavior. |
| Archived post | A post set aside by the owner. It is not a draft, does not appear in the public feed, and is retained until purged. |
| Soft-deleted post | A post retained in storage but omitted from normal queries. It can be restored or permanently purged. |
| Purged post | A post and its associated managed data permanently removed from the instance. |
| Writing activity | The non-negative number of words added by the owner on a calendar date in the configured time zone. Removing text does not reduce prior activity. |
| Media asset | An image or video owned by the instance, optionally associated with a post, stored in the configured object store. |
| Writing profile | The saved author preferences used to steer generated content, including writing style and an optional sample. |
| Public feed | The CORS-restricted, read-only representation of published posts consumed by external sites or tools. |

## Lifecycle Rules

- A post is created as a draft unless the owner explicitly publishes or schedules it.
- Only published posts appear in the public feed.
- A soft-deleted post is not a published post and must not appear in normal post lists, dashboard statistics, or the public feed.
- An archived post is not a draft: it is excluded from draft statistics and from continued-writing selection.
- A scheduled post requires an explicit publish-at instant and a worker that transitions it to published when due.
- A purged post cannot be restored.

## Open Decisions

- Whether the owner may sign in again after claiming the instance. The present login page blocks all sign-ins once any owner exists, which conflicts with a practical single-owner model.
- The production database target. Cloudflare Workers require a Workers-compatible database binding; the current local SQLite driver is not deployable there.
- The canonical post-body representation and derived word-count rules for rich editor content.

## Status Integrity

- `unknown` is a temporary read-time fallback while the current database permits arbitrary status strings. It prevents invalid stored data from being misrepresented as `draft`.
- T2.2 must backfill or otherwise resolve every invalid stored status before adding the status constraint. Once constrained, remove `unknown` from the domain and dashboard status unions; an invalid status read is a data-integrity error.
