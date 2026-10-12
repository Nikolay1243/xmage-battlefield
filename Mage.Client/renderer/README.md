# Xmage Battlefield

TypeScript + PixiJS, designed and checked at **1920 × 1080**. The Java rules engine and network session remain authoritative. This is an opt-in experimental gameplay renderer, opened with **Modern battlefield (experimental)** above the existing battlefield.

## Use

1. Launch the rebuilt XMage client and join a game.
2. Click **Modern battlefield (experimental)**. On Apple silicon macOS, the installed native host opens a client-managed WebKit battlefield window; other platforms use a browser tab. Both are served by that game's local Java client. The macOS battlefield is a companion window, separate from the Swing lobby. Use **Full screen** for the full 1080p layout.
3. Your board stays open. An opponent expands when they act; priority passes alone do not change the layout. **Open board / Pin / Unpin** controls persistent inspection. **All boards** expands everyone.
4. Hover over your hand near the bottom to expand it. Hover over a card for its large image and rules. Click cards or a player's life button to send the standard XMage selection callback.
5. Scroll over nonland permanents to see overflowing rows. Scroll over the horizontal land band to reach a very large group. Lands group by name and tap state, while remaining individually clickable.
6. The stack opens when its contents change. Its heading toggles the drawer. Contextual feedback buttons reuse the native Java buttons, including their enabled state and semantics.
7. **XMage dialogs** brings the Java window forward for ability pickers, number/pile choices, other zones and complex dialogs. These have not yet been ported; the browser displays a notice and blocks gameplay input while a native dialog is open. Keep the Java window open.

Animations are visual only; game callbacks never await transitions. **Effects off** and the operating system's reduced-motion preference disable interpolation. Watchers cannot issue card/player input. The bridge publishes only views already provided to this client's player, with hidden faces and their image URLs omitted.

## Build and preview

```sh
cd Mage.Client/renderer
npm ci
npm test
npm run build
npm run dev -- --port 5178
```

Open `http://127.0.0.1:5178/?demo` for a clearly labelled four-player sample (31 permanents plus a commander per player). Plain dev mode expects a live bridge and is not a standalone game client. Production assets are checked into `../src/main/resources/mage/client/game/renderer`; rebuild them after changing source, then build the Maven client. No Node runtime or CDN is needed by the packaged client.

The bridge binds to 127.0.0.1 on an ephemeral port and uses a separate random URL per game. Mutations must be same-origin POSTs. Stale revisions and duplicate input are rejected. Server actions run on the Swing EDT. Images load through XMage's existing cache, with asynchronous Scryfall downloads cached locally when art is missing. Unavailable art falls back to a labelled card. Mana symbols come from Scryfall's symbol assets. Closing the Java game stops its timer and HTTP server. Closing the browser alone does not concede or close the game.

## Validation and remaining migration

Automated tests cover 1080p layout bounds, board focus/pin persistence, permanent and land scrolling, hand overlap, hidden-face redaction and bounded request bodies. Java compilation and the existing focus tests also run. Browser checks exercise opening/pinning boards, priority handoff, stack folding and the rendered viewport.

This first integration does not replace every XMage interaction: native zone browsers, card context menus, complex choices, combat drag shortcuts, mana preferences and advanced shortcuts remain in Java. The collapsible right-hand chat drawer uses the existing game chat. The command zone is separate from battlefield permanents, and player headers show available mana. Combat state is drawn with attacker/defender/blocker lines; selection uses standard clicks. A full live Commander session is still needed to validate these transitions against a server before making this the default renderer. Spawn, stat-change, attacker-lunge and blocker-shield effects follow changes to game snapshots. Animations never delay callbacks. More elaborate spell effects and sound design remain future work. Native skip controls mirror the existing Java buttons and skip state. Foreground presence suppresses background feedback alerts only while this renderer has focus; it expires when the window closes or stops reporting.

For startup regression checks, use `npm run build` followed by `npm run preview -- --port 5179`, and open `http://127.0.0.1:5179/?demo`. Preview applies the same CSP as the Java bridge; the Vite development server does not. The `pixi.js/unsafe-eval` side-effect import installs static shader helpers and must remain present.

## Native macOS host

Build the Apple silicon WebKit companion with `sh native/build-macos.sh /absolute/path/to/client/lib` (requires the macOS Swift toolchain). Java launches the installed executable in `lib/XMageBattlefield.app/Contents/MacOS/XMageBattlefield` and closes it with the game. The window permits only navigation to its game's loopback origin. The native Full screen action uses the macOS window control. `?demo&empty` previews empty battlefields for mask regressions; the demo's Preview effects button steps through spawn, buff, attack and block examples.

Player library and graveyard buttons open independent draggable floating panels. Graveyard cards support the standard selection callback. Libraries show only their card count and a revealed top card already supplied by XMage; hidden library contents are never exported.

## Gameplay polish

Battlefields group creatures, artifacts and enchantments and shrink crowded nonland rows within bounded card sizes. Tokens, counters, attachments and summoning sickness have overlays. Player information shows public commander damage and tax, poison, current turn, departure state and the client connection. Unreported commander information stays unknown.

Search dialogs expose only cards the Java client has already been authorized to show. Pile choices and bounded multi-number distributions use the original callbacks. Popup-based trigger ordering and unsupported legacy dialogs still open in XMage.

Settings save client-wide to `renderer-preferences.json`: card size, animation intensity, effects sound volume and preview side. Snapshot-driven attack, block, damage, death and stack-exit effects do not delay input. Stack exits cannot distinguish resolution from countering from the available snapshots.

Use `?demo&stress` for crowded four-player boards and an 18-card stack at 1920×1080. Choice fixtures are `?demo&scenario=search`, `distribution` and `piles`. These are UI stress checks, not a replacement for a live four-player server match.

Smart Skip is an opt-in per-game toggle in the Skip menu. It passes foreground priority only when the server reports no non-basic-mana actions and the stack is empty. Main phases and combat on your turn remain manual. Unknown playable data, special actions and native choices stop automatic passing; each input sequence is submitted at most once and revalidated on the EDT.

Auto Pay is an opt-in per-game phase-strip toggle. It plans complete ordinary coloured/generic payments with pool mana and untapped noncreature lands having one unambiguous basic mana ability. It submits one source per input sequence, revalidates server state before each callback and stops for unsupported costs/abilities, native choices, lost focus or disconnection. Hybrid, Phyrexian, unresolved X, sacrifice/life mana abilities and ambiguous sources remain manual. A payment is capped at 20 automatic responses. Tests cover cost parsing, ambiguous sources, colour preservation and insufficient mana; live server validation is still required.

Custom sound packs live in the installed client’s `battlefield-sounds` folder; copy the files from `sound-pack/` into that folder; see its README for event filenames and supported formats. The loopback bridge serves only recognized sound filenames (8 MB maximum). Regular Java audio is muted by a per-window heartbeat lease and restores when no renderer remains. Focus controls foreground feedback separately. This does not alter saved XMage sound settings.
