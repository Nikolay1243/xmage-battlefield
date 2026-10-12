package mage.players;

/** Client-only inspection of server-provided playable stats. Does not change wire classes. */
public final class SmartSkipActions {
    private SmartSkipActions() {}
    public static boolean hasNonManaAction(PlayableObjectStats stats) {
        return !stats.basicPlayAbilities.isEmpty() || !stats.basicCastAbilities.isEmpty() || !stats.other.isEmpty();
    }
}
