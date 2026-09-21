# Staging for card photographs

Drop a new or replacement card photograph here and say which card it is for;
the file name is the card's own key -- a composition group's slug, a tag's
slug or a catalogue axis (`silver`, `us-coin`, `by-topic`).

It does not belong here for long. A source photograph lives in `assets/cards/`
at the repository root, which is what `npm run cards` reads; this folder is
inside `src/`, where everything else is either imported by a page or generated
by that script, so a multi-megabyte PNG left here is a source file in the
output directory. The procedure is: move it to `assets/cards/<key>.png`, run
`npm run cards`, add the generated `.webp` to `src/lib/card-art.ts`, and empty
this folder again.
