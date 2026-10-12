package mage.client.game;

import org.junit.Test;
import javax.swing.*;
import java.awt.*;
import java.util.HashSet;
import java.util.Set;
import static org.junit.Assert.*;

public class FocusedBattlefieldLayoutTest {
    @Test
    public void fourPlayerLayoutFitsWidescreenAndLaptopSizes() throws Exception {
        SwingUtilities.invokeAndWait(() -> {
            for (Dimension size : new Dimension[]{new Dimension(1280, 720), new Dimension(1440, 900),
                    new Dimension(900, 420)}) {
                JPanel me = new JPanel();
                JPanel alice = new JPanel();
                JPanel bob = new JPanel();
                JPanel carol = new JPanel();
                Set<Component> collapsed = new HashSet<>();
                collapsed.add(bob);
                collapsed.add(carol);
                JPanel table = new JPanel(new FocusedBattlefieldLayout(me, collapsed::contains));
                for (Component board : new Component[]{me, alice, bob, carol}) table.add(board);
                table.setSize(size);
                table.doLayout();
                assertEquals(size.width, me.getWidth());
                assertTrue(alice.getWidth() > size.width / 2);
                assertEquals(112, bob.getWidth());
                assertTrue(me.getY() >= alice.getHeight());
                assertWithinBoundsAndDisjoint(table);

                // Opening a second opponent shares space without shrinking the local board.
                collapsed.remove(bob);
                table.doLayout();
                assertTrue(Math.abs(alice.getWidth() - bob.getWidth()) <= 1);
                assertEquals(size.width, me.getWidth());
                assertWithinBoundsAndDisjoint(table);

                // With local priority, collapsed headers release their height to the local board.
                collapsed.add(alice);
                collapsed.add(bob);
                table.doLayout();
                assertEquals(54, alice.getHeight());
                assertTrue(me.getHeight() > size.height * 0.8);
                assertWithinBoundsAndDisjoint(table);
            }
        });
    }

    private void assertWithinBoundsAndDisjoint(Container table) {
        Component[] boards = table.getComponents();
        for (int i = 0; i < boards.length; i++) {
            Rectangle bounds = boards[i].getBounds();
            assertTrue(bounds.width > 0);
            assertTrue(bounds.height > 0);
            assertTrue(new Rectangle(table.getSize()).contains(bounds));
            for (int j = i + 1; j < boards.length; j++) {
                assertFalse(bounds.intersects(boards[j].getBounds()));
            }
        }
    }
}
