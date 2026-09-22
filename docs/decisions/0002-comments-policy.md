# ADR 0002: Comments stay out of ContentOS v1

**Status:** Accepted (2026-09-22)

## Context

M6 asks for comments after the single-owner publishing system stabilizes. The
public feed is CORS-gated JSON consumed by external sites: readers live on
those sites, not inside ContentOS. The instance has no reader identity system —
only the owner signs in (OAuth first-claim) — and every publishing-adjacent
surface has stayed owner-only by design (media library, settings, analytics).

A built-in comment system would therefore need, from nothing: anonymous or
account-backed reader submission, a moderation queue UI, spam defense on an
open Workers endpoint, and PII retention handling for commenter data.

## Decision

ContentOS v1 ships **no comments table and no comment UI** (option D, with
option C as the documented reader path):

- Readers comment where they read: on the consuming site, or through an
  external provider (e.g. Giscus, utterances) the owner embeds there.
- ContentOS stores no comment state and exposes no comment endpoints. The
  `rssFeed`/`seoMeta` publishing surface is unchanged.
- If reader demand materializes, revisit D8 with **external-provider-backed
  first**: an opt-in per-post discussion URL field, moderation delegated to
  the provider, still no local comment table. A built-in moderated system is
  the last resort, not the default.

## Actors, moderation, abuse, deletion (binding on any future implementation)

- **Actors:** anonymous reader (submits), owner (sole moderator), no reader
  accounts in v1 scope.
- **Moderation states:** `pending` → `approved` | `rejected` | `spam`.
  Nothing renders publicly until `approved`; state transitions are
  owner-only server functions, never client-derivable.
- **Abuse handling:** anonymous submission requires bot defense (Turnstile or
  equivalent) plus per-IP rate limiting before any built-in endpoint ships;
  spam stays quarantined (`spam`, never rendered) rather than silently
  dropped so the owner can audit false positives.
- **Deletion and retention:** owner hard-deletes any comment at any time;
  rejected/spam rows are purged after 90 days; purging a post purges its
  comments with it. Commenter PII is limited to what moderation needs
  (no emails stored for anonymous comments).

## Consequences

- M6.1 is complete with this record; M6.2 stays open and blocked on a D8
  revisit with demonstrated reader demand.
- No schema, migration, route, or UI work for comments in v1. The `Comments:
  Not implemented` baseline stands as an intentional scope boundary, not a
  gap.
- Any future comments proposal must satisfy the states, abuse, and deletion
  rules above before adding a table.

## Alternatives considered

- **Built-in public comments with moderation queue:** rejected for v1 —
  open submission on Workers invites spam, and the queue UI plus bot
  defense is a full milestone for a single-owner blog with no reader
  accounts.
- **Built-in authenticated comments:** rejected — reader accounts would
  double the auth surface (registration, sessions, recovery) for a CMS
  whose only user is the owner.
- **Provider embed managed by ContentOS settings:** deferred, not rejected —
  this is the designated second step if D8 is revisited.
