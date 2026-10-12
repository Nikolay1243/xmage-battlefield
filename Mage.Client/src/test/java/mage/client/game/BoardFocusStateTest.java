package mage.client.game;

import org.junit.Test;
import java.util.UUID;
import static org.junit.Assert.*;

public class BoardFocusStateTest {
    @Test
    public void priorityMovesWithoutLosingManualExpansions() {
        UUID me = UUID.randomUUID();
        UUID alice = UUID.randomUUID();
        UUID bob = UUID.randomUUID();
        UUID carol = UUID.randomUUID();
        BoardFocusState focus = new BoardFocusState(me);
        focus.setPriorityPlayer(alice);
        assertTrue(focus.isExpanded(me));
        assertTrue(focus.isExpanded(alice));
        assertFalse(focus.isExpanded(bob));
        assertFalse(focus.isExpanded(carol));

        focus.togglePinned(bob);
        focus.setPriorityPlayer(carol);
        assertFalse(focus.isExpanded(alice));
        assertTrue(focus.isExpanded(bob));
        assertTrue(focus.isExpanded(carol));
        focus.setPriorityPlayer(me);
        assertTrue(focus.isExpanded(me));
        assertTrue(focus.isExpanded(bob));
        assertFalse(focus.isExpanded(carol));
        focus.togglePinned(bob);
        assertFalse(focus.isExpanded(bob));
    }

    @Test
    public void unpinningPriorityDoesNotHideItAndOverviewPreservesPins() {
        UUID me = UUID.randomUUID();
        UUID opponent = UUID.randomUUID();
        BoardFocusState focus = new BoardFocusState(me);
        focus.setPriorityPlayer(opponent);
        focus.togglePinned(opponent);
        focus.togglePinned(opponent);
        assertTrue(focus.isExpanded(opponent));
        focus.setPriorityPlayer(null);
        assertFalse(focus.isExpanded(opponent));
        focus.setEnabled(false);
        assertTrue(focus.isExpanded(opponent));
        focus.togglePinned(opponent);
        focus.setEnabled(true);
        assertTrue(focus.isExpanded(opponent));
        focus.togglePinned(me);
        assertFalse(focus.isPinned(me));
        assertTrue(focus.isExpanded(me));
    }
}
