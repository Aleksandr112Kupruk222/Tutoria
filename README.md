# Tutoria — Games Design Learning Hub

React / Next.js student and teacher interfaces, a Cloudflare-compatible Worker API, and a SQLite-compatible D1 database. The visual theme uses the supplied near-black, white, cyan, magenta and green reference.

## What is implemented

- Separate student library and teacher login/dashboard.
- Aleks and Ben teacher accounts, salted password hashes, expiring HttpOnly sessions, login throttling, same-origin write protection and per-teacher ownership checks.
- Initial password `1234`, with a mandatory new password of at least 12 characters before accessing the dashboard or connecting YouTube. Initial account hashes are provisioned through a server secret, not shipped in client code. No public account registration or password recovery is implemented yet.
- Folders owned by each teacher: create, edit and assign videos. Unreal Engine, 3D Modelling and Sample lessons are created when a teacher completes onboarding.
- Add a YouTube URL, edit all lesson content, save private drafts, explicitly publish, or unpublish. Saving edits does not replace the published lesson. Conflicting revisions are rejected.
- A deterministic, AI-free transcript draft builder: groups timed cues, extracts action passages, uses description chapters when imported during creation, matches a small game-development glossary and flags corrections/warnings. It creates suggested objectives from extracted step titles. Source passages and original timestamps remain available for review. It does not invent code, quizzes or extension activities.
- Per-teacher YouTube OAuth flow, encrypted refresh-token storage, reconnect/disconnect and owner-authorised video/caption import. Connection stays disabled until the Google configuration below is supplied. This is implemented but has not been exercised with real Google credentials.
- Basic plain text, timestamped text, SRT and WebVTT import as a fallback. Quizzes, concepts, troubleshooting and extension activities are optional until a teacher writes them.

The existing GDQuest example is illustrative, not a transcript of that video. The user's real video has not been imported: https://www.youtube.com/watch?v=mJF9q-yZ-G8

## Local development

Use Node 22.13+ and pnpm 11.19. Install with `pnpm install --frozen-lockfile`.

1. `pnpm build` produces the public Next.js pages and Worker bundle.
2. Run `pnpm dev` in one terminal (Next.js on port 3000).
3. Run `pnpm dev:api` in another terminal (complete application on http://localhost:3001).

Use port 3001 for working accounts and folders. Port 3000 alone is the frontend and has no API. `dev:api` uses a persistent local database under ignored `.wrangler/tutoria`. Fresh local usernames are Aleks and Ben (case insensitive), initial password 1234; each must choose a new password on first sign-in. Changing a password invalidates other sessions. Local data is separate from hosted data.

`node tests/integration.mjs` runs isolated tests after building. It does not change the development or hosted database.

## Files and architecture

- `content/player-controller.json`: portable sample lesson document.
- `lib/lessons.ts`: validated draft and publication schemas and transcript parsing.
- `lib/draft-builder.ts`: deterministic English action extraction and glossary rules.
- `components/lesson-editor.tsx`: reusable teacher editor.
- `components/tutoria.tsx`: student library, lesson renderer and shared shell.
- `worker/index.ts`: account, folder, lesson and publishing endpoints.
- `worker/security.ts`: password verification, server sessions, limits and encryption helpers.
- `worker/youtube.ts`: per-teacher Google OAuth and caption import.
- `db/schema.ts` and `drizzle/`: schema and generated, append-only migrations.

Next.js exports public UI assets; the Worker provides authenticated API access and serves those assets through ASSETS. DB is the only persistent binding. Content remains ordinary JSON inside the database and can be exported from the editor. There are no AI dependencies or AI API calls. Hosting authentication, runtime and database remain host dependencies; the Worker/database adapters can be replaced when moving hosts.

## Hosted accounts and access

The current review site retains its owner-private Sites access policy. Application passwords are an additional login layer. Creating the Ben application account does not grant Ben access through the outer Sites gate; the owner must separately share the review site with Ben when ready. Do not switch the review site to public while temporary credentials remain unused. Teachers cannot read or mutate one another's drafts or YouTube connections. Students receive only published lesson JSON; quiz answers are visible client-side because this is formative practice.

`BOOTSTRAP_ACCOUNTS` is a secret JSON array of `{id,username,name,hash}`. Hashes use independent random salts and PBKDF2-SHA256 with 100,000 iterations (compatible with Workers WebCrypto). The bootstrap inserts only missing accounts and never resets existing passwords. Remove this secret after both accounts have been created. Any future public launch should include stronger password hashing where supported, administrator invitations, recovery, broader IP rate limiting and an explicit access-policy review.

## Connect each teacher's YouTube channel

One Google Cloud application serves all teachers. Each teacher signs in to their own Tutoria account, selects Connect YouTube and grants Google permission for their own channel. Google passwords never go through Tutoria.

Before this button can be enabled:

1. Create or select a Google Cloud project and enable YouTube Data API v3.
2. Configure the OAuth consent screen. During testing, add Aleks's and Ben's Google accounts as test users. Google may require verification before broader use; testing-mode authorisations may need reconnecting.
3. Create a Web Application OAuth client. Register exactly:
   `https://tutoria-game-lab-aleks.akupruk.chatgpt.site/api/youtube/callback`
4. Set server environment variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (secret), `TOKEN_ENCRYPTION_KEY` (secret, base64 encoding of 32 random bytes), and `APP_ORIGIN` (the exact HTTPS site origin, no trailing slash). Never prefix these with NEXT_PUBLIC_. Never put tokens or keys in the lesson JSON, Git or chat.
5. Redeploy the saved version to apply the environment revision. Each teacher can then connect independently.

The flow uses state bound to the teacher's server session, PKCE, a ten-minute expiry, one-time state consumption and AES-GCM encrypted refresh tokens. It requests youtube.force-ssl because the caption download API requires it. This permission is broader than read-only; the code only reads videos, channels and captions. Available caption tracks are selected, favouring English. Missing or inaccessible captions give a manual import message instead of scraping.

References checked 13 September 2026:
- Google web-server OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Caption listing: https://developers.google.com/youtube/v3/docs/captions/list
- Caption download (requires edit permission): https://developers.google.com/youtube/v3/docs/captions/download
- Video metadata: https://developers.google.com/youtube/v3/docs/videos/list

## Draft generation limits

Rule-based extraction is a starting point, not semantic understanding. It can group phrases poorly, miss silently demonstrated actions and produce awkward objectives. Check timestamps, corrections, software versions and names before publication. The glossary is curated and extendable. Advanced WebVTT regions/styling, automatic-caption overlap deduplication and visual analysis are not implemented. No real channel tokens have been configured or tested yet.

## Verification

Production compilation and TypeScript are checked. Integration tests cover action extraction, correction flags, glossary matches, login/password change, secure cookie attributes, teacher ownership, cross-site write rejection, unpublished content isolation, draft/published separation, stale revision rejection, unconfigured OAuth and logout. Real Google consent/caption retrieval requires the owner's OAuth setup. The new interface has not been browser-interaction tested in this iteration.

## Prepare a lesson with your own ChatGPT

In the teacher editor, open **Prepare with AI**. Import the video's SRT/VTT in that same tab, then download the preparation pack. It contains a reusable prompt, the `tutoria-chatgpt-v1` template and that video's timestamped source captions. Upload it yourself to your AI assistant (for example ChatGPT or Claude) and request the completed JSON file. Tutoria makes no AI API calls.

Return the file to the same editor panel or paste its JSON. Validation checks required fields, video identity, exact source-caption start times, quiz answer indices and size. Preview the sections and steps, apply to the editor, save as a draft and review before publishing. Import keeps the selected lesson ID, folder, video, original transcript and resources. Section titles become prefixes on student step titles. Teacher notes persist in draft JSON and are omitted from published JSON.

Optional concepts, troubleshooting, activities, quiz and teacher notes can be empty arrays. Templates and instructions are generated together in `lib/chatgpt-exchange.ts`; change the format version if introducing an incompatible exchange shape. The existing full-lesson backup importer remains separate.

Checks: `node tests/chatgpt-exchange.mjs` and `node tests/integration.mjs` (after building the Worker).

Video creation accepts a URL and folder without a title; the draft uses Untitled lesson until edited or filled by AI. Preparation prompts address students directly and reserve teacher commentary for private review notes. The exchange format identifier remains unchanged for compatibility.
