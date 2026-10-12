# Focused multiplayer battlefields

In games with three or more players, **Focus boards** keeps your battlefield
full-width below the opponents. Opponents without priority collapse to headers
showing their name, life, and permanent count. Click an opponent's name or summary
to pin that board open; click again to unpin it. A player with priority remains
expanded even after unpinning. Pins survive priority changes for the current game.
Turning Focus boards off shows every opponent. Spectator and two-player seating
use their existing layouts.

**Animations** controls a first set of non-blocking effects: a brief priority
outline, a fading life delta, and an expanding outline on arriving permanents.
Effects use Swing timers, never delay model updates or input, don't replay the
initial battlefield, and are discarded when hidden, disabled, or cleaned up.
Multiple life changes during an effect are combined. This is an initial feedback
pass, not a full card-flight or combat-animation renderer.

Collapsed boards continue receiving state updates. Open a header to interact
with that player's permanents or player controls. The summary indicates available
targets; combat and card-reference arrows use the collapsed header as an anchor.

## Verification

Run from the repository root:

```sh
mvn -pl Mage.Client -am -Dtest=BoardFocusStateTest,FocusedBattlefieldLayoutTest \
  -Dsurefire.failIfNoSpecifiedTests=false -Djava.awt.headless=true test
```

Tests cover priority handoffs, manual pins, unpinning the priority player, no
priority, overview mode, and four-player layouts at widescreen/laptop sizes.

Live-game checklist:

- In a four-player game, pass priority around the table; keep the local board open.
- Pin two opponents, pass priority, then unpin each.
- Target a player and a permanent on a collapsed board after expanding its header.
- Check attacks, blocks, planeswalker attacks, and stack target arrows while
  changing which boards are expanded.
- Gain/lose life and resolve permanents; turn Animations off during an effect.
- Resize the window and change GUI font size; check a departing player, reconnect,
  spectator mode, and a two-player game.

Noncreature land stacks overlap horizontally on a shared baseline, with exposed
clickable strips. Width and auto-fit calculations include the horizontal overlap;
creature stacks and attachment layout retain their existing arrangement.

No server protocol or rules-engine changes are required.
