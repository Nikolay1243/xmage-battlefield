package mage.client.game;

import mage.client.MageFrame;
import mage.client.SessionHandler;
import mage.client.cards.BigCard;
import mage.client.dialog.PreferencesDialog;
import mage.client.util.GUISizeHelper;
import mage.cards.MageCard;
import mage.constants.PlayerAction;
import mage.view.GameView;
import mage.view.PlayerView;
import mage.view.UserRequestMessage;

import javax.swing.*;
import javax.swing.event.ChangeListener;
import java.awt.*;
import java.awt.event.*;
import java.lang.reflect.Field;
import java.util.Set;
import java.util.UUID;

import static mage.client.dialog.PreferencesDialog.*;

/**
 * GUI: play area panel (player with avatar/mana panel + battlefield panel)
 *
 * @author BetaSteward_at_googlemail.com, JayDi85
 */
public class PlayAreaPanel extends javax.swing.JPanel {

    private final JPopupMenu popupMenu;
    private UUID playerId;
    private String playerName;
    private UUID gameId;
    private boolean isMe = false;
    private boolean smallMode = false;
    private boolean playingMode = true;
    private final GamePanel gamePanel;
    private final PlayAreaPanelOptions options;
    private final JPanel boardContent = new JPanel(new BorderLayout());
    private final JPanel boardHeader = new JPanel(new BorderLayout(6, 0));
    private final JButton boardToggle = new JButton();
    private final JLabel boardSummary = new JLabel();
    private final JLabel lifeChange = new JLabel() {
        @Override
        protected void paintComponent(Graphics graphics) {
            Graphics2D g = (Graphics2D) graphics.create();
            g.setComposite(AlphaComposite.SrcOver.derive(effectAlpha(lifeChangeStarted, 1000)));
            super.paintComponent(g);
            g.dispose();
        }
    };
    private final Timer effectsTimer = new Timer(30, event -> tickEffects());
    private boolean boardCollapsed;
    private boolean boardPinned;
    private boolean priority;
    private boolean receivedGameState;
    private boolean animationsEnabled = true;
    private Integer previousLife;
    private long lifeChangeStarted;
    private long priorityStarted;
    private int accumulatedLifeChange;
    private Runnable toggleBoard;

    private JCheckBoxMenuItem manaPoolMenuItem1;
    private JCheckBoxMenuItem manaPoolMenuItem2;
    private JCheckBoxMenuItem useFirstManaAbilityItem;
    private JCheckBoxMenuItem allowViewHandCardsMenuItem;
    private JCheckBoxMenuItem holdPriorityMenuItem;

    public static final int PANEL_HEIGHT = 273;
    public static final int PANEL_HEIGHT_SMALL = 220;
    private static final int PANEL_HEIGHT_EXTRA_FOR_ME = 25;

    public PlayAreaPanel(PlayerView player, BigCard bigCard, UUID gameId, int priorityTime, GamePanel gamePanel,
            PlayAreaPanelOptions options) {
        this.gamePanel = gamePanel;
        this.options = options;
        initComponents();
        setOpaque(false);
        battlefieldPanel.setOpaque(false);

        // data init
        init(player, bigCard, gameId, priorityTime);
        update(null, player, null, null);
        playerPanel.sizePlayerPanel(isSmallMode());

        // init popup menu (must run after data init)
        popupMenu = new JPopupMenu();
        if (options.isPlayer) {
            addPopupMenuPlayer(player.getUserData().isAllowRequestHandToAll());
        } else {
            addPopupMenuWatcher();
        }

        setGUISize();
    }

    public void CleanUp() {
        stopEffects();
        battlefieldPanel.cleanUp();
        playerPanel.cleanUp();

        // Taken form : https://community.oracle.com/thread/2183145
        // removed the internal focus of a popupMenu data to allow GC before another popup menu is selected
        for (ChangeListener listener : MenuSelectionManager.defaultManager().getChangeListeners()) {
            if (listener.getClass().getName().contains("MenuKeyboardHelper")) {
                try {
                    Field field = listener.getClass().getDeclaredField("menuInputMap");
                    field.setAccessible(true);
                    field.set(listener, null);
                } catch (Exception e) {
                    // ignored
                }
                break;
            }
        }

        for (MouseListener ml : battlefieldPanel.getMainPanel().getMouseListeners()) {
            battlefieldPanel.getMainPanel().removeMouseListener(ml);
        }
        popupMenu.getUI().uninstallUI(this);

    }

    public void changeGUISize() {
        setGUISize();
        battlefieldPanel.changeGUISize();
        playerPanel.changeGUISize();
    }

    private void setGUISize() {
        GUISizeHelper.changePopupMenuFont(popupMenu);
        boardToggle.setFont(GUISizeHelper.dialogFont.deriveFont(Font.BOLD));
        boardSummary.setFont(GUISizeHelper.dialogFont);
        lifeChange.setFont(GUISizeHelper.dialogFont.deriveFont(Font.BOLD));
    }

    private void addPopupMenuPlayer(boolean allowRequestToShowHandCards) {

        JMenuItem menuItem;

        ActionListener skipListener = e -> {
            switch (e.getActionCommand()) {
                case "F2": {
                    if (gamePanel.getFeedbackPanel() != null) {
                        gamePanel.getFeedbackPanel().pressOKYesOrDone();
                    }
                    break;
                }
                case "F3": {
                    SessionHandler.sendPlayerAction(PlayerAction.PASS_PRIORITY_CANCEL_ALL_ACTIONS, gameId, null);
                    break;
                }
                case "F4": {
                    SessionHandler.sendPlayerAction(PlayerAction.PASS_PRIORITY_UNTIL_NEXT_TURN, gameId, null);
                    break;
                }
                case "F5": {
                    SessionHandler.sendPlayerAction(PlayerAction.PASS_PRIORITY_UNTIL_TURN_END_STEP, gameId, null);
                    break;
                }
                case "F6": {
                    SessionHandler.sendPlayerAction(PlayerAction.PASS_PRIORITY_UNTIL_NEXT_TURN_SKIP_STACK, gameId, null);
                    break;
                }
                case "F7": {
                    SessionHandler.sendPlayerAction(PlayerAction.PASS_PRIORITY_UNTIL_NEXT_MAIN_PHASE, gameId, null);
                    break;
                }
                case "F9": {
                    SessionHandler.sendPlayerAction(PlayerAction.PASS_PRIORITY_UNTIL_MY_NEXT_TURN, gameId, null);
                    break;
                }
                case "F11": {
                    SessionHandler.sendPlayerAction(PlayerAction.PASS_PRIORITY_UNTIL_END_STEP_BEFORE_MY_NEXT_TURN, gameId, null);
                    break;
                }
                default:
                    break;
            }
        };

        menuItem = new JMenuItem("<html><b>F2</b> - Confirm current request");
        menuItem.setActionCommand("F2");
        menuItem.setMnemonic(KeyEvent.VK_O);
        popupMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        menuItem = new JMenuItem("<html><b>F3</b> - Cancel active skip action");
        menuItem.setActionCommand("F3");
        menuItem.setMnemonic(KeyEvent.VK_N);
        popupMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        holdPriorityMenuItem = new JCheckBoxMenuItem("<html><b>" + (System.getProperty("os.name").contains("Mac OS X") ? "Cmd" : "Ctrl") + "+click</b> - Hold Priority");
        holdPriorityMenuItem.setMnemonic(KeyEvent.VK_P);
        holdPriorityMenuItem.setToolTipText("<html>Hold priority after casting a spell or activating an ability, instead of automatically passing priority.");
        popupMenu.add(holdPriorityMenuItem);
        holdPriorityMenuItem.addActionListener(e -> {
            boolean holdPriority = ((JCheckBoxMenuItem) e.getSource()).getState();
            gamePanel.setMenuStates(manaPoolMenuItem1.getState(), manaPoolMenuItem2.getState(), useFirstManaAbilityItem.getState(), holdPriority);
            gamePanel.holdPriority(holdPriority);
        });

        JMenu skipMenu = new JMenu("Skip");
        skipMenu.setMnemonic(KeyEvent.VK_S);
        popupMenu.add(skipMenu);

        String tooltipText = "<html>This skip actions stops if something goes to <br><b>stack</b> and if <b>attackers</b> or <b>blocker</b> have to be <b>declared</b>.";
        String everythingTooltipText = "<html>This skip actions stops if <b>attackers</b> or <b>blocker</b> have to be <b>declared</b>, but not if something goes to the <b>stack</b>.";
        menuItem = new JMenuItem("<html><b>F4</b> - Phases until next turn");
        menuItem.setActionCommand("F4");
        menuItem.setToolTipText(tooltipText);
        menuItem.setMnemonic(KeyEvent.VK_T);
        skipMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        menuItem = new JMenuItem("<html><b>F5</b> - Phases until next end step");
        menuItem.setActionCommand("F5");
        menuItem.setToolTipText(tooltipText);
        menuItem.setMnemonic(KeyEvent.VK_E);
        skipMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        menuItem = new JMenuItem("<html><b>F6</b> - Everything until the next turn");
        menuItem.setActionCommand("F6");
        menuItem.setToolTipText(everythingTooltipText);
        menuItem.setMnemonic(KeyEvent.VK_U);
        skipMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        menuItem = new JMenuItem("<html><b>F7</b> - Phases until begin of next main phase");
        menuItem.setToolTipText(tooltipText);
        menuItem.setActionCommand("F7");
        menuItem.setMnemonic(KeyEvent.VK_M);
        skipMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        menuItem = new JMenuItem("<html><b>F9</b> - Everything until your own next turn");
        menuItem.setActionCommand("F9");
        menuItem.setToolTipText(everythingTooltipText);
        menuItem.setMnemonic(KeyEvent.VK_V);
        skipMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        menuItem = new JMenuItem("<html><b>F11</b> - Everything until end step prior to your own next turn");
        menuItem.setActionCommand("F11");
        menuItem.setToolTipText(everythingTooltipText);
        menuItem.setMnemonic(KeyEvent.VK_P);
        skipMenu.add(menuItem);
        menuItem.addActionListener(skipListener);

        popupMenu.addSeparator();

        JMenu manaPoolMenu = new JMenu("Mana payment");
        manaPoolMenu.setMnemonic(KeyEvent.VK_M);
        popupMenu.add(manaPoolMenu);

        manaPoolMenuItem1 = new JCheckBoxMenuItem("Automatically", true);
        manaPoolMenuItem1.setMnemonic(KeyEvent.VK_A);
        manaPoolMenuItem1.setToolTipText("<html>If not active, produced mana goes only to the mana pool<br>"
                + "and you have to click the type of mana you want to use <br>"
                + "in the player mana pool panel for payment.");
        manaPoolMenu.add(manaPoolMenuItem1);

        // Auto pay mana from mana pool
        manaPoolMenuItem1.addActionListener(e -> {
            boolean manaPoolAutomatic = ((JCheckBoxMenuItem) e.getSource()).getState();
            PreferencesDialog.saveValue(KEY_GAME_MANA_AUTOPAYMENT, manaPoolAutomatic ? "true" : "false");
            gamePanel.setMenuStates(manaPoolAutomatic, manaPoolMenuItem2.getState(), useFirstManaAbilityItem.getState(), holdPriorityMenuItem.getState());
            SessionHandler.sendPlayerAction(manaPoolAutomatic ? PlayerAction.MANA_AUTO_PAYMENT_ON : PlayerAction.MANA_AUTO_PAYMENT_OFF, gameId, null);
        });

        manaPoolMenuItem2 = new JCheckBoxMenuItem("No automatic usage for mana already in the pool", true);
        manaPoolMenuItem2.setMnemonic(KeyEvent.VK_N);
        manaPoolMenuItem2.setToolTipText("<html>Mana that is already in the mana pool as you start casting a spell or activating an ability<br>"
                + " needs to be payed manually. So you use the mana in the pool only by clicking on the related<br>"
                + " mana symbols of mana pool area.");
        manaPoolMenu.add(manaPoolMenuItem2);

        // Auto pay mana from mana pool
        manaPoolMenuItem2.addActionListener(e -> {
            boolean manaPoolAutomaticRestricted = ((JCheckBoxMenuItem) e.getSource()).getState();
            PreferencesDialog.saveValue(KEY_GAME_MANA_AUTOPAYMENT_ONLY_ONE, manaPoolAutomaticRestricted ? "true" : "false");
            gamePanel.setMenuStates(manaPoolMenuItem1.getState(), manaPoolAutomaticRestricted, useFirstManaAbilityItem.getState(), holdPriorityMenuItem.getState());
            SessionHandler.sendPlayerAction(manaPoolAutomaticRestricted ? PlayerAction.MANA_AUTO_PAYMENT_RESTRICTED_ON : PlayerAction.MANA_AUTO_PAYMENT_RESTRICTED_OFF, gameId, null);
        });

        useFirstManaAbilityItem = new JCheckBoxMenuItem("Use first mana ability when tapping lands", false);
        useFirstManaAbilityItem.setMnemonic(KeyEvent.VK_F);
        useFirstManaAbilityItem.setToolTipText("<html>Use the first mana ability when<br>"
                + " tapping lands for mana<br>"
                + "You can hold Alt+1 whilst tapping lands to use this feature");
        manaPoolMenu.add(useFirstManaAbilityItem);

        // Use first mana ability of lands
        useFirstManaAbilityItem.addActionListener(e -> {
            boolean useFirstManaAbility = ((JCheckBoxMenuItem) e.getSource()).getState();
            PreferencesDialog.saveValue(KEY_USE_FIRST_MANA_ABILITY, useFirstManaAbility ? "true" : "false");
            gamePanel.setMenuStates(manaPoolMenuItem1.getState(), manaPoolMenuItem2.getState(), useFirstManaAbility, holdPriorityMenuItem.getState());
            SessionHandler.sendPlayerAction(useFirstManaAbility ? PlayerAction.USE_FIRST_MANA_ABILITY_ON : PlayerAction.USE_FIRST_MANA_ABILITY_OFF, gameId, null);
        });

        JMenu automaticConfirmsMenu = new JMenu("Auto-answers");
        automaticConfirmsMenu.setMnemonic(KeyEvent.VK_U);
        popupMenu.add(automaticConfirmsMenu);

        menuItem = new JMenuItem("Replacement effects - reset all auto-answers");
        menuItem.setMnemonic(KeyEvent.VK_R);
        menuItem.setToolTipText("Reset all effects that were added to the list of auto select replacement effects this game.");
        automaticConfirmsMenu.add(menuItem);
        // Reset the replacement effcts that were auto selected for the game
        menuItem.addActionListener(e -> SessionHandler.sendPlayerAction(PlayerAction.RESET_AUTO_SELECT_REPLACEMENT_EFFECTS, gameId, null));

        menuItem = new JMenuItem("Triggered abilities - reset all auto-answers for stack order");
        menuItem.setMnemonic(KeyEvent.VK_T);
        menuItem.setToolTipText("Reset all triggered ability order settings you added during the game.");
        automaticConfirmsMenu.add(menuItem);
        // Reset the replacement effcts that were auto selected for the game
        menuItem.addActionListener(e -> SessionHandler.sendPlayerAction(PlayerAction.TRIGGER_AUTO_ORDER_RESET_ALL, gameId, null));

        menuItem = new JMenuItem("Yes/no requests - reset all auto-answers");
        menuItem.setMnemonic(KeyEvent.VK_T);
        menuItem.setToolTipText("Reset all defined automatic answers for Yes/No usage requests (with two buttons).");
        automaticConfirmsMenu.add(menuItem);
        // Reset the replacement and yes/no dialogs that were auto selected for the game
        menuItem.addActionListener(e -> SessionHandler.sendPlayerAction(PlayerAction.REQUEST_AUTO_ANSWER_RESET_ALL, gameId, null));

        JMenu rollbackMainItem = new JMenu("Rollback");
        rollbackMainItem.setToolTipText("The game will be rolled back to the start of the requested turn if all players agree");
        popupMenu.add(rollbackMainItem);
        if (options.rollbackTurnsAllowed) {
            ActionListener rollBackActionListener = e -> {
                int turnsToRollBack = Integer.parseInt(e.getActionCommand());
                SessionHandler.sendPlayerAction(PlayerAction.ROLLBACK_TURNS, gameId, turnsToRollBack);
            };

            rollbackMainItem.setMnemonic(KeyEvent.VK_R);

            menuItem = new JMenuItem("To the start of the current turn");
            menuItem.setMnemonic(KeyEvent.VK_C);
            menuItem.setActionCommand("0");
            menuItem.addActionListener(rollBackActionListener);
            rollbackMainItem.add(menuItem);

            menuItem = new JMenuItem("To the start of the previous turn");
            menuItem.setMnemonic(KeyEvent.VK_P);
            menuItem.setActionCommand("1");
            menuItem.addActionListener(rollBackActionListener);
            rollbackMainItem.add(menuItem);

            menuItem = new JMenuItem("The current turn and the 2 turns before");
            menuItem.setMnemonic(KeyEvent.VK_2);
            menuItem.setActionCommand("2");
            menuItem.addActionListener(rollBackActionListener);
            rollbackMainItem.add(menuItem);

            menuItem = new JMenuItem("The current turn and the 3 turns before");
            menuItem.setMnemonic(KeyEvent.VK_3);
            menuItem.setActionCommand("3");
            menuItem.addActionListener(rollBackActionListener);
            rollbackMainItem.add(menuItem);
        } else {
            rollbackMainItem.setText(rollbackMainItem.getText() + ", restricted");
        }

        JMenu concedeMenu = new JMenu("Concede");
        concedeMenu.setMnemonic(KeyEvent.VK_C);
        popupMenu.add(concedeMenu);

        ActionListener concedeListener = e -> {
            switch (e.getActionCommand()) {
                case "Game": {
                    UserRequestMessage message = new UserRequestMessage("Confirm concede game", "Are you sure you want to concede the game?");
                    message.setButton1("No", null);
                    message.setButton2("Yes", PlayerAction.CLIENT_CONCEDE_GAME);
                    message.setGameId(gameId);
                    MageFrame.getInstance().showUserRequestDialog(message);
                    break;
                }
                case "Match": {
                    UserRequestMessage message = new UserRequestMessage("Confirm concede match", "Are you sure you want to concede the complete match?");
                    message.setButton1("No", null);
                    message.setButton2("Yes", PlayerAction.CLIENT_CONCEDE_MATCH);
                    message.setGameId(gameId);
                    MageFrame.getInstance().showUserRequestDialog(message);
                    break;
                }
                default:
                    break;
            }
        };

        // Concede Game
        menuItem = new JMenuItem("Game");
        menuItem.setMnemonic(KeyEvent.VK_G);
        menuItem.setActionCommand("Game");
        menuItem.setToolTipText("Concedes only the current game and after that the next game of the match is started if there is another game needed.");
        concedeMenu.add(menuItem);
        menuItem.addActionListener(concedeListener);

        // Concede Match
        menuItem = new JMenuItem("Match");
        menuItem.setMnemonic(KeyEvent.VK_M);
        menuItem.setActionCommand("Match");
        menuItem.setToolTipText("Concedes the complete match. So if you're in a tournament you finish the current tournament round.");
        concedeMenu.add(menuItem);
        menuItem.addActionListener(concedeListener);

        battlefieldPanel.getMainPanel().addMouseListener(new MouseAdapter() {
            @Override
            public void mouseReleased(MouseEvent e) {
                this.checkMenu(e);
            }

            // neccessary for linux and mac systems
            @Override
            public void mousePressed(MouseEvent e) {
                this.checkMenu(e);
            }

            private void checkMenu(MouseEvent e) {
                if (e.isPopupTrigger() && playingMode) {
                    popupMenu.show(e.getComponent(), e.getX(), e.getY());
                }
            }
        });

        popupMenu.addSeparator();

        // view hands
        JMenu handCardsMenu = new JMenu(String.format("Cards on hand (%s)", (options.playerItself ? "me" : playerName)));
        handCardsMenu.setMnemonic(KeyEvent.VK_H);
        popupMenu.add(handCardsMenu);
        if (!options.playerItself) {
            menuItem = new JMenuItem("Request permission to see the hand cards");
            menuItem.setMnemonic(KeyEvent.VK_P);
            handCardsMenu.add(menuItem);

            // Request to see hand cards
            menuItem.addActionListener(e -> SessionHandler.sendPlayerAction(PlayerAction.REQUEST_PERMISSION_TO_SEE_HAND_CARDS, gameId, playerId));
        } else {
            allowViewHandCardsMenuItem = new JCheckBoxMenuItem("Allow hand requests from other users", allowRequestToShowHandCards);
            allowViewHandCardsMenuItem.setMnemonic(KeyEvent.VK_A);
            allowViewHandCardsMenuItem.setToolTipText("Watchers or other players can request your hand cards once per game. Re-activate it to allow new requests.");
            handCardsMenu.add(allowViewHandCardsMenuItem);

            // requests allowed (disable -> enable to reset requested list)
            allowViewHandCardsMenuItem.addActionListener(e -> {
                boolean requestsAllowed = ((JCheckBoxMenuItem) e.getSource()).getState();
                PreferencesDialog.setPrefValue(KEY_GAME_ALLOW_REQUEST_SHOW_HAND_CARDS, requestsAllowed);
                SessionHandler.sendPlayerAction(requestsAllowed ? PlayerAction.PERMISSION_REQUESTS_ALLOWED_ON : PlayerAction.PERMISSION_REQUESTS_ALLOWED_OFF, gameId, null);
            });

            menuItem = new JMenuItem("Revoke all permission(s) to see your hand cards");
            menuItem.setMnemonic(KeyEvent.VK_R);
            menuItem.setToolTipText("Revoke already granted permission for all spectators to see your hand cards.");
            handCardsMenu.add(menuItem);

            // revoke permissions to see hand cards
            menuItem.addActionListener(e -> SessionHandler.sendPlayerAction(PlayerAction.REVOKE_PERMISSIONS_TO_SEE_HAND_CARDS, gameId, null));
        }

        // view deck (allows to view only own deck or computer)
        // it's a client side checks... same checks must be on server side too (see PlayerView)
        menuItem = new JMenuItem(String.format("<html>View deck (%s)", (options.playerItself ? "me" : playerName)));
        popupMenu.add(menuItem);
        if (options.playerItself || !options.isHuman) {
            menuItem.setMnemonic(KeyEvent.VK_D);
            menuItem.addActionListener(e -> {
                SessionHandler.sendPlayerAction(PlayerAction.VIEW_LIMITED_DECK, gameId, playerId);
            });
        } else {
            menuItem.setText(menuItem.getText() + ", restricted");
        }

        // view sideboard (allows to view only own sideboard or computer)
        // it's a client side checks... same checks must be on server side too (see PlayerView)
        menuItem = new JMenuItem(String.format("<html>View sideboard (%s)", (options.playerItself ? "me" : playerName)));
        popupMenu.add(menuItem);
        if (options.playerItself || !options.isHuman) {
            menuItem.setMnemonic(KeyEvent.VK_S);
            menuItem.addActionListener(e -> {
                SessionHandler.sendPlayerAction(PlayerAction.VIEW_SIDEBOARD, gameId, playerId);
            });
        } else {
            menuItem.setText(menuItem.getText() + ", restricted");
        }
    }

    private void addPopupMenuWatcher() {
        JMenuItem menuItem;

        menuItem = new JMenuItem("Stop watching");
        popupMenu.add(menuItem);

        // Stop watching
        menuItem.addActionListener(e -> {
            UserRequestMessage message = new UserRequestMessage("Confirm stop watching game", "Are you sure you want to stop watching the game?");
            message.setButton1("No", null);
            message.setButton2("Yes", PlayerAction.CLIENT_STOP_WATCHING);
            message.setGameId(gameId);
            MageFrame.getInstance().showUserRequestDialog(message);
        });

        // Request to see hand cards
        menuItem = new JMenuItem(String.format("Request permission to see hand cards (%s)", playerName));
        popupMenu.add(menuItem);
        menuItem.addActionListener(e -> SessionHandler.sendPlayerAction(PlayerAction.REQUEST_PERMISSION_TO_SEE_HAND_CARDS, gameId, playerId));

        battlefieldPanel.getMainPanel().addMouseListener(new MouseAdapter() {
            @Override
            public void mouseReleased(MouseEvent e) {
                this.checkMenu(e);
            }

            // neccessary for linux and mac systems
            @Override
            public void mousePressed(MouseEvent e) {
                this.checkMenu(e);
            }

            private void checkMenu(MouseEvent e) {
                if (e.isPopupTrigger() && playingMode) {
                    popupMenu.show(e.getComponent(), e.getX(), e.getY());
                }
            }
        });

    }

    public final void init(PlayerView player, BigCard bigCard, UUID gameId, int priorityTime) {
        stopEffects();
        receivedGameState = false;
        previousLife = null;
        priority = false;
        this.playerPanel.init(gameId, player.getPlayerId(), player.getControlled(), bigCard, priorityTime);
        this.battlefieldPanel.init(gameId, bigCard);
        this.gameId = gameId;
        this.playerId = player.getPlayerId();
        this.playerName = player.getName();
        this.isMe = player.getControlled();
    }

    public final void update(GameView game, PlayerView player, Set<UUID> possibleTargets, Set<UUID> chosenTargets) {
        this.playerPanel.update(game, player, possibleTargets, chosenTargets);
        this.battlefieldPanel.update(player.getBattlefield());
        boolean hasPriority = game != null && player.hasPriority();
        if (animationsEnabled && receivedGameState && isShowing()) {
            if (hasPriority && !priority) {
                priorityStarted = System.nanoTime();
                effectsTimer.start();
            }
            if (previousLife != null && previousLife != player.getLife()) {
                if (effectAlpha(lifeChangeStarted, 1000) == 0) accumulatedLifeChange = 0;
                accumulatedLifeChange += player.getLife() - previousLife;
                lifeChange.setText(String.format("%+d", accumulatedLifeChange));
                lifeChange.setForeground(accumulatedLifeChange < 0 ? new Color(210, 65, 65) : new Color(45, 160, 100));
                lifeChangeStarted = System.nanoTime();
                effectsTimer.start();
            }
        }
        previousLife = player.getLife();
        priority = hasPriority;
        receivedGameState |= game != null;
        String status = player.hasLeft() ? "Left" : hasPriority ? (boardPinned ? "Priority, pinned" : "Priority") : boardPinned ? "Pinned" : "";
        boardToggle.setText(player.getName() + (status.isEmpty() ? "" : " - " + status));
        int targetCount = possibleTargets == null ? 0 : (int) possibleTargets.stream()
                .filter(id -> id.equals(player.getPlayerId()) || player.getBattlefield().containsKey(id)).count();
        boardSummary.setText(player.getLife() + " life  |  " + player.getBattlefield().size() + " in play"
                + (targetCount > 0 ? "  |  Targets available" : ""));
        boardHeader.setToolTipText(boardToggle.getText() + ": " + boardSummary.getText());
        if (this.allowViewHandCardsMenuItem != null) {
            this.allowViewHandCardsMenuItem.setSelected(player.getUserData().isAllowRequestHandToAll());
        }
    }

    public mage.client.game.BattlefieldPanel getBattlefieldPanel() {
        return battlefieldPanel;
    }

    public PlayerPanelExt getPlayerPanel() {
        return playerPanel;
    }

    public boolean isBoardCollapsed() {
        return boardCollapsed;
    }

    public void configureBoardToggle(Runnable toggle) {
        toggleBoard = toggle;
        boardToggle.setFocusable(toggle != null);
    }

    public void setBoardExpanded(boolean expanded, boolean pinned) {
        boardPinned = pinned;
        String status = playerPanel.getPlayer().hasLeft() ? "Left" : priority ? (pinned ? "Priority, pinned" : "Priority") : pinned ? "Pinned" : "";
        boardToggle.setText(playerName + (status.isEmpty() ? "" : " - " + status));
        boardToggle.setToolTipText(toggleBoard == null ? "Your board stays open"
                : pinned ? "Unpin this board (priority keeps it open)" : "Click to keep this board open");
        if (boardCollapsed == !expanded) return;
        boardCollapsed = !expanded;
        boardContent.setVisible(expanded);
        revalidate();
        repaint();
    }

    /** Hidden permanents still point to their owner's visible collapsed header. */
    public Point getPermanentScreenPoint(MageCard permanent) {
        return boardCollapsed ? getLocationOnScreen() : permanent.getCardLocationOnScreen().getCardPoint();
    }

    public void setAnimationsEnabled(boolean enabled) {
        animationsEnabled = enabled;
        battlefieldPanel.setAnimationsEnabled(enabled);
        if (!enabled) stopEffects();
    }

    private float effectAlpha(long started, int durationMillis) {
        if (started == 0) return 0;
        return Math.max(0, 1f - (System.nanoTime() - started) / (durationMillis * 1_000_000f));
    }

    private void tickEffects() {
        if (!isShowing() || (effectAlpha(priorityStarted, 550) == 0 && effectAlpha(lifeChangeStarted, 1000) == 0)) {
            stopEffects();
        }
        repaint();
    }

    private void stopEffects() {
        effectsTimer.stop();
        priorityStarted = lifeChangeStarted = 0;
        lifeChange.setText("");
        repaint();
    }

    @Override
    public void removeNotify() {
        stopEffects();
        super.removeNotify();
    }

    @Override
    protected void paintChildren(Graphics graphics) {
        super.paintChildren(graphics);
        float alpha = effectAlpha(priorityStarted, 550);
        if (alpha > 0) {
            Graphics2D g = (Graphics2D) graphics.create();
            g.setComposite(AlphaComposite.SrcOver.derive(alpha));
            g.setColor(new Color(95, 170, 255));
            g.setStroke(new BasicStroke(3));
            g.drawRoundRect(2, 2, Math.max(0, getWidth() - 5), Math.max(0, getHeight() - 5), 8, 8);
            g.dispose();
        }
    }

    private void initComponents() {
        setBorder(BorderFactory.createLineBorder(new Color(0, 0, 0, 0)));
        playerPanel = new PlayerPanelExt(GUISizeHelper.playerPanelGuiScale);
        battlefieldPanel = new mage.client.game.BattlefieldPanel();
        battlefieldPanel.setTopPanelBattlefield(options.topRow);
        battlefieldPanel.setPreferredSize(new Dimension(Short.MAX_VALUE, Short.MAX_VALUE));

        this.setLayout(new BorderLayout());
        boardContent.setOpaque(false);
        boardContent.add(playerPanel, BorderLayout.WEST);
        boardContent.add(battlefieldPanel, BorderLayout.CENTER);
        boardHeader.setBorder(BorderFactory.createEmptyBorder(3, 6, 3, 6));
        boardToggle.setHorizontalAlignment(SwingConstants.LEADING);
        boardToggle.setMargin(new Insets(1, 4, 1, 4));
        boardToggle.addActionListener(event -> { if (toggleBoard != null) toggleBoard.run(); });
        boardHeader.add(boardToggle, BorderLayout.NORTH);
        JPanel values = new JPanel();
        values.setOpaque(false);
        values.setLayout(new BoxLayout(values, BoxLayout.X_AXIS));
        values.add(boardSummary);
        values.add(Box.createHorizontalStrut(8));
        values.add(lifeChange);
        values.add(Box.createHorizontalGlue());
        boardHeader.add(values, BorderLayout.CENTER);
        boardSummary.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent event) {
                if (SwingUtilities.isLeftMouseButton(event) && toggleBoard != null) toggleBoard.run();
            }
        });
        this.add(boardHeader, BorderLayout.NORTH);
        this.add(boardContent, BorderLayout.CENTER);
        this.add(Box.createRigidArea(new Dimension(0, 10)), BorderLayout.SOUTH); // bottom free space
    }

    private void btnCheatActionPerformed(java.awt.event.ActionEvent evt) {
        SessionHandler.cheatShow(gameId, playerId);
    }

    public boolean isSmallMode() {
        return smallMode;
    }

    public void setPlayingMode(boolean playingMode) {
        this.playingMode = playingMode;
    }

    public void setMenuStates(boolean manaPoolAutomatic, boolean manaPoolAutomaticRestricted, boolean useFirstManaAbility, boolean holdPriority) {
        if (manaPoolMenuItem1 != null) {
            manaPoolMenuItem1.setSelected(manaPoolAutomatic);
        }
        if (manaPoolMenuItem2 != null) {
            manaPoolMenuItem2.setSelected(manaPoolAutomaticRestricted);
        }
        if (useFirstManaAbilityItem != null) {
            useFirstManaAbilityItem.setSelected(useFirstManaAbility);
        }
        if (holdPriorityMenuItem != null) {
            holdPriorityMenuItem.setSelected(holdPriority);
        }
    }

    private mage.client.game.BattlefieldPanel battlefieldPanel;
    //private javax.swing.JScrollPane jScrollPane1;
    private PlayerPanelExt playerPanel;
}
