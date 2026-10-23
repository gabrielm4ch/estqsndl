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

- Keep stock movement validation and purchase lifecycle rules in `src/lib/store.ts` so individual and batch screens share identical safeguards.
- Persist monthly purchase sequence high-water marks alongside browser data and migrate legacy requests on load so deletion never reuses a code.
- Record return dates per outgoing movement and process selected returns atomically and idempotently so repeat actions cannot inflate stock.
- Lovable Cloud is connected because the user asked for it, but application data still lives in the browser store; only move a table to the database when the user explicitly asks, since migrating changes how data is shared and backed up.
- Apply the bundled initial catalog through a one-time local-store migration keyed by code plus description, preserving existing records and repeated-code products without recreating deleted items.
- Persist generated-purchase acknowledgements atomically with registration using item IDs and stock signatures, so cancelling never hides shortages and changed stock can appear again.
