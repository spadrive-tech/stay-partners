<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All app data comes from the external Kiataka API via `src/lib/api.ts` (bearer token in localStorage); do not add a managed backend — the brief requires the existing Kiataka server.
- Signed-in pages live under the `src/routes/_portal/` pathless layout (ssr: false, redirects to /login without a token) — the token only exists in the browser.
- AI listing descriptions run through a createServerFn (`src/lib/describe.functions.ts` → `describe.server.ts`) calling Lovable AI Gateway — keeps the key server-side without adding a managed backend.
- Yearly rentals share listing and booking APIs with stays, using a listing type and request-type discriminator; separate rental terms and availability from nightly stay rules to avoid mixing lease and hotel behaviour.
