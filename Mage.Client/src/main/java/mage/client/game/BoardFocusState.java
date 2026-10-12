package mage.client.game;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/** Client-only visibility state; inspecting a board never changes game priority. */
final class BoardFocusState {
    private final UUID localPlayer;
    private final Set<UUID> pinned = new HashSet<>();
    private UUID priorityPlayer;
    private boolean enabled = true;

    BoardFocusState(UUID localPlayer) {
        this.localPlayer = localPlayer;
    }

    void setPriorityPlayer(UUID priorityPlayer) {
        this.priorityPlayer = priorityPlayer;
    }

    void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    boolean isExpanded(UUID player) {
        return !enabled || player.equals(localPlayer) || player.equals(priorityPlayer) || pinned.contains(player);
    }

    boolean isPinned(UUID player) {
        return pinned.contains(player);
    }

    void togglePinned(UUID player) {
        if (!player.equals(localPlayer) && !pinned.remove(player)) {
            pinned.add(player);
        }
    }
}
