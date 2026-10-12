package mage.client.table;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.util.ArrayList;
import java.util.List;

/**
 * Presentation for the lobby's existing actions and filters. Buttons retain their
 * listeners and models, including the persisted multi-select filter settings.
 */
final class LobbyHeader extends JPanel {

    private final JLabel title = new JLabel("Server lobby");
    private final JLabel subtitle = new JLabel("Find a table, join a match, or start your own.");
    private final List<JLabel> filterLabels = new ArrayList<>();

    LobbyHeader(JButton newMatch, JButton newTournament, JButton[] quickActions,
                JToggleButton[] tables, JToggleButton[] formats, JToggleButton[] options) {
        super(new GridBagLayout());
        setBorder(BorderFactory.createEmptyBorder(12, 14, 12, 14));

        JPanel heading = new JPanel(new BorderLayout(16, 0));
        heading.setOpaque(false);
        JPanel introduction = new JPanel(new GridLayout(2, 1, 0, 2));
        introduction.setOpaque(false);
        introduction.add(title);
        introduction.add(subtitle);
        heading.add(introduction, BorderLayout.CENTER);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.TRAILING, 6, 0));
        actions.setOpaque(false);
        newMatch.setText("New match");
        newTournament.setText("New tournament");
        actions.add(newMatch);
        actions.add(newTournament);
        for (JButton action : quickActions) {
            actions.add(action);
        }
        heading.add(actions, BorderLayout.LINE_END);

        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = 0;
        constraints.gridy = 0;
        constraints.gridwidth = 2;
        constraints.weightx = 1;
        constraints.fill = GridBagConstraints.HORIZONTAL;
        constraints.insets = new Insets(0, 0, 10, 0);
        add(heading, constraints);
        addFilterRow("Tables", tables, 1);
        addFilterRow("Formats", formats, 2);
        addFilterRow("Options", options, 3);
    }

    private void addFilterRow(String name, JToggleButton[] buttons, int row) {
        JLabel label = new JLabel(name);
        filterLabels.add(label);
        JPanel choices = new JPanel(new FlowLayout(FlowLayout.LEADING, 4, 2));
        choices.setOpaque(false);
        for (JToggleButton button : buttons) {
            // These controls previously relied on icon tooltips and mouse input.
            button.setFocusable(true);
            button.setRequestFocusEnabled(true);
            button.setFocusPainted(true);
            button.setHorizontalTextPosition(SwingConstants.TRAILING);
            button.setVerticalTextPosition(SwingConstants.CENTER);
            button.setMargin(new Insets(3, 8, 3, 8));
            choices.add(button);
            button.addFocusListener(new FocusAdapter() {
                @Override
                public void focusGained(FocusEvent event) {
                    choices.scrollRectToVisible(button.getBounds());
                }
            });
        }

        // Keep every filter reachable at smaller window sizes or larger fonts.
        JScrollPane scroll = new JScrollPane(choices,
                ScrollPaneConstants.VERTICAL_SCROLLBAR_NEVER,
                ScrollPaneConstants.HORIZONTAL_SCROLLBAR_AS_NEEDED) {
            @Override
            public Dimension getPreferredSize() {
                Dimension size = super.getPreferredSize();
                size.height = choices.getPreferredSize().height;
                if (getWidth() > 0 && choices.getPreferredSize().width > getWidth()) {
                    size.height += getHorizontalScrollBar().getPreferredSize().height;
                }
                return size;
            }

            @Override
            public Dimension getMinimumSize() {
                return new Dimension(0, getPreferredSize().height);
            }
        };
        scroll.setBorder(BorderFactory.createEmptyBorder());
        scroll.setViewportBorder(BorderFactory.createEmptyBorder());
        scroll.setOpaque(false);
        scroll.getViewport().setOpaque(false);
        scroll.getHorizontalScrollBar().setUnitIncrement(24);
        scroll.addComponentListener(new ComponentAdapter() {
            @Override
            public void componentResized(ComponentEvent event) {
                revalidate();
            }
        });
        label.setLabelFor(scroll);

        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = 0;
        constraints.gridy = row;
        constraints.anchor = GridBagConstraints.LINE_START;
        constraints.insets = new Insets(2, 0, 2, 12);
        add(label, constraints);
        constraints.gridx = 1;
        constraints.weightx = 1;
        constraints.fill = GridBagConstraints.HORIZONTAL;
        constraints.insets = new Insets(0, 0, 0, 0);
        add(scroll, constraints);
    }

    void setLobbyFont(Font font) {
        title.setFont(font.deriveFont(Font.BOLD, font.getSize2D() + 7));
        subtitle.setFont(font);
        for (JLabel label : filterLabels) {
            label.setFont(font.deriveFont(Font.BOLD));
        }
        revalidate();
    }
}
