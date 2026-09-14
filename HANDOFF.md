# Continuing Tutoria

Repository: https://github.com/Aleksandr112Kupruk222/Tutoria
Branch: main
Live site: https://tutoria-game-lab-aleks.akupruk.chatgpt.site
Sites project ID: appgprj_6aa69ce33ea0819184a05cbf1ba14e1f

## Product rules

- Digital Technologies hub, with white/near-black surfaces and cyan, magenta and green accents.
- Every signed-in teacher has full access to all folders and lessons, including drafts, editing, publishing, moving, ordering and deletion.
- Students see published lessons only. Folder deletion preserves lessons as drafts in teacher-only Unassigned. Student lesson navigation returns to its folder.
- Admin manages accounts. Initial temporary passwords require 8 characters; first-login replacement passwords require 12. Deleting an account preserves shared content.
- Prepare with AI exports timestamped captions plus a prompt/JSON template for the teacher's chosen AI assistant; importing its result creates editable student-facing content. No paid AI API is required.
- Student library opens folders into vertical lesson lists, with search on the main page. Teacher folders support drag ordering.

## Development and verification

Read AGENTS.md and relevant local Next.js documentation before edits. Read README.md for architecture and local setup. Use the existing lockfile. Next.js exports public pages; scripts/build-worker.mjs bundles the API and stages dist. Hosted accounts/content are in D1, not Git. Local databases are separate.

Run pnpm build. Relevant integration checks: node tests/integration.mjs; for AI exchange changes also node tests/chatgpt-exchange.mjs; for video guide changes also node tests/playback.mjs. Never overwrite applied drizzle migrations; append new ones for schema changes. Do not reset production data, accounts or secrets.

## Publish changes to the SAME live site

GitHub pushes do not automatically update this site. The next agent must have the Sites plugin/tools available and access to the existing Site, normally through the same signed-in owner account.

1. Apply sites-building and sites-hosting skills. Reuse .openai/hosting.json and its project_id. Call get_site to confirm the existing site and preserve public access. Do not create a replacement Site.
2. Pull main, implement requested changes, run relevant checks and build. Refresh the execution profile using the installed Sites plugin script. Follow that machine's supported build/package flow rather than copying old machine paths.
3. Commit and push main to GitHub. Obtain a source repository write credential for the existing Sites project and push the identical source to its returned repository/branch. Keep credentials out of files, remote URLs and output.
4. Read the full commit SHA after the source push succeeds. Package the validated build from that exact commit, including the Worker, public assets, hosting manifest and existing/new migrations.
5. Use save_site_version with the exact SHA and archive, then deploy_site_version for this PUBLIC site. Follow current tool schemas. Poll get_deployment_status until succeeded and report the returned live URL.
6. Preserve existing hosted environment values and D1 data. Do not replace them with local demo settings. If Sites tools or account access are missing, say deployment is blocked; do not claim a GitHub push published it.

Last application publication before this handoff: version 9, source 2a83bbb73725b56cee9b669cf8e1a16c6a8e1a9b. Later documentation commits do not change the deployed application.
