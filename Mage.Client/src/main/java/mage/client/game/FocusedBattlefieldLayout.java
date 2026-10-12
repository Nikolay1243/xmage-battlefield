package mage.client.game;

import java.awt.*;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

/** Own board below a row of opponents; collapsed opponents retain a clickable strip. */
final class FocusedBattlefieldLayout implements LayoutManager {
    private final Component localBoard;
    private final Predicate<Component> collapsed;
    private int stripWidth = 112;
    private int headerHeight = 54;

    FocusedBattlefieldLayout(Component localBoard, Predicate<Component> collapsed) {
        this.localBoard = localBoard;
        this.collapsed = collapsed;
    }

    void setSizes(int stripWidth, int headerHeight) {
        this.stripWidth = stripWidth;
        this.headerHeight = headerHeight;
    }

    @Override
    public void layoutContainer(Container parent) {
        Insets insets = parent.getInsets();
        int width = Math.max(0, parent.getWidth() - insets.left - insets.right);
        int height = Math.max(0, parent.getHeight() - insets.top - insets.bottom);
        List<Component> opponents = new ArrayList<>();
        for (Component component : parent.getComponents()) {
            if (component != localBoard) opponents.add(component);
        }
        int expanded = (int) opponents.stream().filter(c -> !collapsed.test(c)).count();
        int gap = Math.min(6, height);
        int topHeight = opponents.isEmpty() ? 0
                : expanded == 0 ? Math.min(headerHeight, height / 3) : (height - gap) / 2;
        int horizontalGap = Math.min(4, width / Math.max(1, opponents.size() * 2));
        int availableWidth = Math.max(0, width - Math.max(0, opponents.size() - 1) * horizontalGap);
        int narrowWidth = Math.min(stripWidth, availableWidth / Math.max(1, opponents.size() + 1));
        int expandedWidth = expanded == 0 ? 0
                : (availableWidth - (opponents.size() - expanded) * narrowWidth) / expanded;
        int x = insets.left;
        for (int i = 0; i < opponents.size(); i++) {
            Component component = opponents.get(i);
            int boardWidth = expanded == 0 ? availableWidth / opponents.size()
                    : collapsed.test(component) ? narrowWidth : expandedWidth;
            if (i == opponents.size() - 1) boardWidth = Math.max(0, insets.left + width - x);
            component.setBounds(x, insets.top, boardWidth, topHeight);
            x += boardWidth + horizontalGap;
        }
        int ownY = opponents.isEmpty() ? 0 : topHeight + gap;
        localBoard.setBounds(insets.left, insets.top + ownY, width, Math.max(0, height - ownY));
    }

    @Override public Dimension preferredLayoutSize(Container parent) { return new Dimension(1000, 550); }
    @Override public Dimension minimumLayoutSize(Container parent) { return new Dimension(0, 0); }
    @Override public void addLayoutComponent(String name, Component component) { }
    @Override public void removeLayoutComponent(Component component) { }
}
