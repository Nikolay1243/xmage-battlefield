# Xmage Battlefield

An experimental XMage client refresh focused on readable multiplayer battlefields and responsive, animated gameplay at **1920 × 1080**. The existing Java engine still handles Magic rules, hidden information and server connectivity; a TypeScript/PixiJS renderer presents the game.

## Battlefield features

- Your battlefield stays expanded. Opponents expand when they act rather than every time priority changes; manually pinned boards stay open. Collapsed players have commander artwork and distinct colours.
- Creatures, artifacts and enchantments are grouped into readable rows, with adaptive card sizes and scrolling for crowded boards. Lands use a thin horizontal band grouped by type and name.
- Large hand cards rise on hover, with playable-card feedback. Card previews show artwork and formatted rules; long rules can be scrolled with the mouse wheel while hovering.
- Compact player headers expose life, mana and clickable library, graveyard and exile zones. Command zones collapse by default. Player details show available commander damage, tax and poison information.
- A thin phase strip separates your board from opponents and contains the current turn, prompts, pass and skip controls.
- Floating chat and zone windows keep the battlefield clear. The stack appears only when occupied and displays spell or ability rules.
- Commander crowns, counters, token markers, attachments and summoning-sickness icons identify battlefield state. Combat arrows point to defending players' life totals.
- Short spawn, attack, block, damage, buff, death and stack-exit animations follow game updates without delaying input. Offscreen opponent activity scrolls into view.
- Original custom sounds accompany gameplay. Regular XMage audio is muted while Battlefield audio is active, and an attention cue plays when input is needed while the native window is unfocused.
- Saved preferences control card size, animation intensity, volume and preview position. Reduced-motion settings are respected.

**Smart Skip** is optional: it passes empty-stack priority when the server reports no relevant actions, while keeping your main phases and combat manual. **Auto Pay** is optional: it spends pool mana and taps eligible lands for ordinary coloured/generic costs. Ambiguous mana sources and unsupported costs remain manual.

## Running this version

This repository contains source and packaged web resources; downloading the standard upstream XMage client does not install Battlefield.

Build the refreshed Java client and install it into a compatible XMage client distribution, keeping its dependency jars. Join a game, then select **Modern battlefield (experimental)** above the existing battlefield.

On Apple silicon macOS, the optional native WebKit host opens Battlefield in a client-managed companion window. The Swing lobby and remaining native dialogs stay available. Other platforms open the renderer in a browser. Keep the Java client running in either case.

Copy the files from [`Mage.Client/renderer/sound-pack`](Mage.Client/renderer/sound-pack) into a `battlefield-sounds` folder in the client working directory. Its README describes supported files. The updated splash screen is included in the client sources.

## Building and previewing

Use a current Node.js version supporting `--experimental-strip-types`, npm, Maven and a suitable JDK. Development and Apple silicon runtime checks have used Java 21.

```sh
cd Mage.Client/renderer
npm ci
npm test
npm run build
cd ../..
mvn -pl Mage.Client -am -DskipTests package
```

The web build writes resources into `Mage.Client/src/main/resources/mage/client/game/renderer`; rebuild these after renderer changes. The packaged client needs no Node runtime or CDN.

To build the macOS companion (requires the Swift toolchain):

```sh
cd Mage.Client/renderer
sh native/build-macos.sh /absolute/path/to/client/lib
```

To preview without a server:

```sh
cd Mage.Client/renderer
npm run dev -- --port 5178
```

Open `http://127.0.0.1:5178/?demo`. Use `?demo&stress` for crowded four-player boards and a long stack. Demo mode is a UI fixture, not a playable standalone client.

## Current scope and limitations

Battlefield is opt-in and still experimental. Some ability pickers, context menus, trigger ordering and complex interactions use native XMage dialogs. Auto Pay does not cover every mana ability or cost. Stack exits cannot reliably distinguish resolution from countering using the available game snapshots. Connection information is limited to what the client receives.

Automated checks cover renderer layout and activity handling, board focus, image redaction, preferences and payment planning. Four-player demo stress checks target 1080p; complete live Commander testing remains necessary. Smaller screens are not the design target.

The loopback bridge serves each game through a separate local URL and forwards validated interactions to the Java client. It exports only game views already available to that player. This fork does not replace XMage's server or rules engine.

See the [renderer guide](Mage.Client/renderer/README.md) for integration details and the [upstream XMage wiki](https://github.com/magefree/mage/wiki) for server, deck editor and development documentation.

## Feedback and upstream

Report Battlefield-specific issues in [this fork's issue tracker](https://github.com/Nikolay1243/xmage-battlefield/issues), including the game situation and whether the original XMage view behaves differently.

Xmage Battlefield builds on [XMage](https://github.com/magefree/mage), which provides rules enforcement, multiplayer formats, AI, drafting, tournaments and deck editing. Thanks to its contributors. Existing licences and asset notices remain applicable; renderer asset attribution is in [THIRD_PARTY_NOTICES.txt](Mage.Client/renderer/public/THIRD_PARTY_NOTICES.txt).
