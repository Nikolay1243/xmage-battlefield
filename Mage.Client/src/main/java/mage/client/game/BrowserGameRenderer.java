package mage.client.game;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import mage.client.SessionHandler;
import mage.client.util.DefaultActionCallback;
import mage.client.util.CardsViewUtil;
import mage.constants.CardType;
import mage.view.*;
import org.mage.plugins.card.images.ImageCache;

import javax.imageio.ImageIO;
import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.List;
import java.util.concurrent.*;

/** Loopback-only, per-game browser bridge. The Java client remains authoritative. */
final class BrowserGameRenderer implements AutoCloseable {
    private static final Gson JSON = new Gson();
    private static final String RESOURCES = "/mage/client/game/renderer/";
    private final GamePanel panel;
    private final RendererArtCache art = new RendererArtCache();
    private final HttpServer server;
    private final ExecutorService executor;
    private final String prefix = "/" + UUID.randomUUID() + "/";
    private final javax.swing.Timer timer;
    private volatile byte[] snapshot = "{}".getBytes(StandardCharsets.UTF_8);
    private volatile Map<String, CardView> imageCards = Collections.emptyMap();
    private long revision;
    private long lastAcceptedRevision = -1;
    private String previous = "";
    private boolean closed;
    private Process nativeWindow;
    private final Map<UUID,CardView> commanderPortraits = new HashMap<>();

    BrowserGameRenderer(GamePanel panel) throws IOException {
        this.panel = panel;
        server = HttpServer.create(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0), 0);
        executor = Executors.newFixedThreadPool(3, runnable -> {
            Thread thread = new Thread(runnable, "xmage-browser-renderer");
            thread.setDaemon(true);
            return thread;
        });
        server.setExecutor(executor);
        server.createContext(prefix, this::handle);
        timer = new javax.swing.Timer(150, event -> publish());
        publish();
        server.start();
        timer.start();
    }

    URI getUri() { return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + prefix); }

    void open() throws IOException {
        File host = new File("lib/XMageBattlefield.app/Contents/MacOS/XMageBattlefield");
        if (System.getProperty("os.name", "").startsWith("Mac") && host.canExecute()) {
            if(nativeWindow != null && nativeWindow.isAlive()) return;
            nativeWindow = new ProcessBuilder(host.getAbsolutePath(), getUri().toString()).redirectError(new File("renderer-window.log")).start();
            return;
        }
        if (!Desktop.isDesktopSupported() || !Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
            throw new IOException("No browser is available. Open " + getUri() + " manually.");
        }
        Desktop.getDesktop().browse(getUri());
    }

    private void publish() {
        GameView game = panel.getLastGameData().game;
        if (game == null || closed) return;
        Map<String, CardView> images = new HashMap<>();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("serverConnected",SessionHandler.getSession()!=null&&SessionHandler.isConnected());
        data.put("inputSequence", panel.getLastGameData().messageId);
        data.put("localPlayer", panel.rendererPlayerId());
        data.put("preferences",RendererPreferences.get());
        data.put("turn", game.getTurn());
        data.put("activePlayer",game.getActivePlayerId());
        data.put("phase", String.valueOf(game.getPhase()));
        data.put("step", String.valueOf(game.getStep()));
        List<Map<String, Object>> players = new ArrayList<>();
        for (PlayerView player : game.getPlayers()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", player.getPlayerId()); row.put("name", player.getName());
            Map<String, Integer> mana = new LinkedHashMap<>();
            ManaPoolView pool=player.getManaPool();
            mana.put("W",pool.getWhite());mana.put("U",pool.getBlue());mana.put("B",pool.getBlack());mana.put("R",pool.getRed());mana.put("G",pool.getGreen());mana.put("C",pool.getColorless());
            row.put("mana",mana);
            row.put("active",player.isActive());row.put("left",player.hasLeft());row.put("counters",player.getCounters());
            row.put("designations",player.getDesignationNames());
            row.put("targetable", panel.getLastGameData().targets != null && panel.getLastGameData().targets.contains(player.getPlayerId()));
            row.put("life", player.getLife()); row.put("priority", player.hasPriority());
            row.put("handCount", player.getHandCount()); row.put("libraryCount", player.getLibraryCount());
            row.put("exileCount", player.getExile().size());
            row.put("exile", cards(player.getExile().values(), images));
            row.put("graveyardCount", player.getGraveyard().size());
            row.put("graveyard", cards(player.getGraveyard().values(), images));
            row.put("library", cards(player.getTopCard()==null?Collections.emptyList():Collections.singletonList(player.getTopCard()), images));
            row.put("battlefield", cards(player.getBattlefield().values(), images));
            row.put("command", cards(CardsViewUtil.convertCommandObject(player.getCommandObjectList()).values(), images));
            // Retain a previously public commander portrait when it leaves the command zone.
            if(!commanderPortraits.containsKey(player.getPlayerId())) {
                CardView commander=CardsViewUtil.convertCommandObject(player.getCommandObjectList()).values().stream().filter(card -> !card.isFaceDown() && (card.getCardTypes().contains(CardType.CREATURE) || card.getCardTypes().contains(CardType.PLANESWALKER))).findFirst().orElse(null);
                if(commander==null)commander=player.getBattlefield().values().stream().filter(card -> !card.isFaceDown() && card.getCardIcons().stream().anyMatch(icon -> icon.getIconType()==mage.abilities.icon.CardIconType.COMMANDER)).findFirst().orElse(null);
                if(commander!=null)commanderPortraits.put(player.getPlayerId(),commander);
            }
            CardView portrait=commanderPortraits.get(player.getPlayerId());
            if(portrait!=null)row.put("commanderPortrait",cards(Collections.singletonList(portrait),images).get(0));
            players.add(row);
        }
        data.put("players", players);
        data.put("hand", cards(game.getMyHand().values(), images));
        data.put("stack", cards(game.getStack().values(), images));
        data.put("chat", panel.rendererChatText());
        data.put("prompt", panel.rendererFeedback().rendererMessage());
        data.put("actions", panel.rendererFeedback().rendererActions());
        data.put("skips", panel.rendererSkips());
        data.put("smartSkipAvailable", canSmartSkip(game));
        data.put("manaPayment",isManaPayment());
        data.put("autoPayNext",isManaPayment()?mage.players.RendererAutoPay.next(game,panel.rendererPlayerId(),panel.rendererFeedback().rendererMessage()):null);
        data.put("choices",panel.rendererChoices());
        data.put("numberChoice",panel.rendererNumberChoice());
        data.put("distribution",panel.rendererDistribution());
        mage.client.dialog.ShowCardsDialog cardDialog=panel.rendererCardDialog();
        if(cardDialog!=null){Map<String,Object> choice=new LinkedHashMap<>();choice.put("title",cardDialog.rendererTitle());List<Map<String,Object>> rows=cards(cardDialog.rendererCards().values(),images);for(Map<String,Object> row:rows){UUID id=UUID.fromString((String)row.get("id"));row.put("selected",panel.getLastGameData().getChosenTargets().contains(id));row.put("targetable",panel.getLastGameData().targets==null||panel.getLastGameData().targets.contains(id));}choice.put("restricted",true);choice.put("cards",rows);data.put("cardChoice",choice);}
        mage.client.dialog.PickPileDialog pileDialog=panel.rendererPileDialog();
        if(pileDialog!=null){Map<String,Object> choice=new LinkedHashMap<>();choice.put("title",pileDialog.rendererTitle());choice.put("piles",Arrays.asList(cards(pileDialog.rendererPile(0).values(),images),cards(pileDialog.rendererPile(1).values(),images)));data.put("pileChoice",choice);}
        data.put("nativeRequired", panel.rendererNeedsNativeDialog());
        data.put("ended", panel.rendererFeedback().getMode() == FeedbackPanel.FeedbackMode.END);
        data.put("needsInput",panel.rendererPlayerId()!=null&&panel.rendererFeedback().getMode()!=FeedbackPanel.FeedbackMode.INFORM&&panel.rendererFeedback().getMode()!=FeedbackPanel.FeedbackMode.END&&(panel.rendererNeedsNativeDialog()||panel.rendererFeedback().rendererActions().stream().anyMatch(a->Boolean.TRUE.equals(a.get("enabled")))));
        List<Map<String, Object>> combat = new ArrayList<>();
        for (CombatGroupView group : game.getCombat()) {
            for (UUID attacker : group.getAttackers().keySet()) {
                Map<String, Object> arrow = new LinkedHashMap<>();
                arrow.put("attacker", attacker); arrow.put("defender", group.getDefenderId());
                arrow.put("blockers", group.getBlockers().keySet()); combat.add(arrow);
            }
        }
        data.put("combat", combat);
        String serialized = JSON.toJson(data);
        if (!serialized.equals(previous)) {
            previous = serialized;
            data.put("revision", ++revision);
            imageCards = Collections.unmodifiableMap(images);
            snapshot = JSON.toJson(data).getBytes(StandardCharsets.UTF_8);
        }
    }

    static List<Map<String, Object>> cards(Collection<? extends CardView> cards, Map<String, CardView> images) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (CardView card : cards) {
            String id = card.getId().toString();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", id); row.put("faceDown", card.isFaceDown());
            // Never send hidden faces through the browser bridge.
            row.put("name", card.isFaceDown() ? "Face-down card" : card.getDisplayName());
            row.put("manaCost",card.isFaceDown()?Collections.emptyList():card.getManaCostSymbols());
            row.put("types", card.isFaceDown() ? "" : card.getTypeText());
            row.put("rules", card.isFaceDown() ? Collections.emptyList() : card.getRules());
            if(!card.isFaceDown()&&card instanceof StackAbilityView&&((StackAbilityView)card).getSourceCard()!=null)row.put("sourceId",((StackAbilityView)card).getSourceCard().getId());
            row.put("power", card.isFaceDown() || !card.getCardTypes().contains(CardType.CREATURE) ? "" : card.getPower());
            row.put("toughness", card.isFaceDown() || !card.getCardTypes().contains(CardType.CREATURE) ? "" : card.getToughness());
            row.put("land", !card.isFaceDown() && card.getCardTypes().contains(CardType.LAND));
            row.put("landTypes",card.isFaceDown()?Collections.emptyList():card.getSubTypes().stream().map(Object::toString).collect(java.util.stream.Collectors.toList()));
            row.put("creature", !card.isFaceDown() && (card.getCardTypes().contains(CardType.CREATURE) || card.getCardTypes().contains(CardType.PLANESWALKER)));
            row.put("commander", card instanceof CommanderView || card.getCardIcons().stream().anyMatch(icon -> icon.getIconType()==mage.abilities.icon.CardIconType.COMMANDER));
            row.put("summoningSickness", card.getCardTypes().contains(CardType.CREATURE) && card instanceof PermanentView && ((PermanentView) card).hasSummoningSickness());
            row.put("tapped", card instanceof PermanentView && ((PermanentView) card).isTapped());
            row.put("targetable", card.isChoosable());
            row.put("playable", card.isPlayable()); row.put("selected", card.isSelected());
            row.put("token", !card.isFaceDown() && card.isToken());
            row.put("counters",card.isFaceDown()||card.getCounters()==null?Collections.emptyList():card.getCounters());
            row.put("damage",card instanceof PermanentView?((PermanentView)card).getDamage():0);
            row.put("attachments", card instanceof PermanentView ? ((PermanentView) card).getAttachments() : Collections.emptyList());
            row.put("targets", card.isFaceDown() || card.getTargets() == null ? Collections.emptyList() : card.getTargets());
            if (!card.isFaceDown()) {
                // Signature permits transforms/face changes to refresh without invalidating unrelated textures.
                String imageKey = id + "-" + Integer.toHexString(card.getRenderSignature().hashCode()) + ".png";
                row.put("image", "image/" + imageKey); images.put(imageKey, card);
            }
            result.add(row);
        }
        return result;
    }

    private void handle(HttpExchange request) throws IOException {
        try {
            String path = request.getRequestURI().getPath();
            if (!path.startsWith(prefix)) { reply(request, 404, "text/plain", new byte[0]); return; }
            // Reject cross-origin mutation requests; the unguessable path also isolates browser sessions.
            String origin = request.getRequestHeaders().getFirst("Origin");
            String expected = "http://127.0.0.1:" + server.getAddress().getPort();
            if (origin != null && !origin.equals(expected)) { reply(request, 403, "text/plain", new byte[0]); return; }
            String relative = path.substring(prefix.length());
            if(relative.equals("sounds/manifest")) {
                Map<String,String> available=new LinkedHashMap<>();
                for(String name:new String[]{"spawn","buff","debuff","attack","block","damage","death","leave","stack-exit","cast","priority","attention"})
                    for(String extension:new String[]{"wav","mp3","ogg"}) {
                        java.nio.file.Path file=customSound(name+"."+extension);
                        if(java.nio.file.Files.isRegularFile(file)){available.put(name,name+"."+extension);break;}
                    }
                reply(request,200,"application/json",JSON.toJson(available).getBytes(StandardCharsets.UTF_8));return;
            }
            if(relative.startsWith("sounds/")) {
                java.nio.file.Path file=customSound(relative.substring(7));
                if(file==null||!java.nio.file.Files.isRegularFile(file)){reply(request,404,"text/plain",new byte[0]);return;}
                try(InputStream input=java.nio.file.Files.newInputStream(file)) {
                    String mime=file.toString().endsWith(".wav")?"audio/wav":file.toString().endsWith(".mp3")?"audio/mpeg":"audio/ogg";
                    reply(request,200,mime,readLimited(input,8*1024*1024));return;
                }
            }
            if (relative.equals("action")) {
                if (!request.getRequestMethod().equals("POST")) { reply(request, 405, "text/plain", new byte[0]); return; }
                byte[] body = readLimited(request.getRequestBody(), 4096);
                JsonObject action = JSON.fromJson(new String(body, StandardCharsets.UTF_8), JsonObject.class);
                FutureTask<Boolean> apply = new FutureTask<>(() -> apply(action));
                SwingUtilities.invokeLater(apply);
                boolean accepted;
                try { accepted = apply.get(3, TimeUnit.SECONDS); }
                catch (Exception error) { apply.cancel(false); accepted = false; }
                reply(request, accepted ? 200 : 409, "application/json", "{}".getBytes(StandardCharsets.UTF_8));
                return;
            }
            if (!request.getRequestMethod().equals("GET")) { reply(request, 405, "text/plain", new byte[0]); return; }
            if (relative.equals("state")) { reply(request, 200, "application/json", snapshot); return; }
            if (relative.startsWith("image/")) {
                CardView card = imageCards.get(relative.substring(6));
                if (card == null || card.isFaceDown()) { reply(request, 404, "text/plain", new byte[0]); return; }
                byte[] image = art.get(card);
                if (image == null) { reply(request, 404, "text/plain", new byte[0]); return; }
                reply(request, 200, "image/png", image); return;
            }
            if (relative.isEmpty()) relative = "index.html";
            if (relative.contains("..") || !relative.matches("[a-zA-Z0-9_./-]+")) { reply(request, 404, "text/plain", new byte[0]); return; }
            try (InputStream resource = getClass().getResourceAsStream(RESOURCES + relative)) {
                if (resource == null) { reply(request, 404, "text/plain", "Build Mage.Client/renderer first.".getBytes(StandardCharsets.UTF_8)); return; }
                String mime = relative.endsWith(".jpg") || relative.endsWith(".jpeg") ? "image/jpeg" : relative.endsWith(".svg") ? "image/svg+xml" : relative.endsWith(".png") ? "image/png" : relative.endsWith(".js") ? "text/javascript" : relative.endsWith(".css") ? "text/css" : "text/html";
                reply(request, 200, mime, readLimited(resource, 8 * 1024 * 1024));
            }
        } catch (RuntimeException error) { reply(request, 400, "text/plain", new byte[0]); }
        finally { request.close(); }
    }

    private boolean isManaPayment() {
        return !panel.rendererNeedsNativeDialog() && panel.rendererFeedback().getMode()==FeedbackPanel.FeedbackMode.CANCEL
                && panel.rendererFeedback().rendererMessage().startsWith("Pay {");
    }

    private boolean canSmartSkip(GameView game) {
        if(game==null || panel.rendererPlayerId()==null || panel.rendererNeedsNativeDialog()
                || !panel.getLastGameData().showPlayable || game.getCanPlayObjects()==null
                || game.getSpecial() || !game.getStack().isEmpty()
                || panel.rendererFeedback().getMode()!=FeedbackPanel.FeedbackMode.SELECT
                || !panel.rendererFeedback().rendererMessage().startsWith("Play instants and activated abilities")) return false;
        mage.view.PlayerView me=game.getPlayers().stream().filter(p->p.getPlayerId().equals(panel.rendererPlayerId())).findFirst().orElse(null);
        if(me==null || !me.hasPriority() || me.hasLeft())return false;
        // Keep the local player's main phases and combat decisions manual.
        if(me.isActive() && game.getStep()!=mage.constants.PhaseStep.UPKEEP
                && game.getStep()!=mage.constants.PhaseStep.DRAW
                && game.getStep()!=mage.constants.PhaseStep.END_COMBAT
                && game.getStep()!=mage.constants.PhaseStep.END_TURN
                && game.getStep()!=mage.constants.PhaseStep.CLEANUP)return false;
        if(game.getCanPlayObjects().getObjects().values().stream().anyMatch(mage.players.SmartSkipActions::hasNonManaAction))return false;
        return panel.rendererFeedback().rendererActions().stream().anyMatch(a->"right".equals(a.get("id")) && Boolean.TRUE.equals(a.get("enabled")) && "Done".equals(a.get("label")));
    }

    private boolean apply(JsonObject action) {
        if (closed || action == null || !action.has("kind") || !action.has("id")) return false;
        String kind = action.get("kind").getAsString(), id = action.get("id").getAsString();
        if (kind.equals("presence")) { panel.rendererPresence(id.equals("focused")); mage.client.util.audio.AudioManager.battlefieldPresence(panel.rendererGameId(),action.has("audio")&&action.get("audio").getAsBoolean()); return true; }
        if (kind.equals("native")) { panel.rendererShowNative(); return true; }
        if (kind.equals("chat")) return panel.rendererSendChat(id);
        if(kind.equals("preferences"))return RendererPreferences.save(id);
        if(SessionHandler.getSession()==null||!SessionHandler.isConnected())return false;
        // Skip settings are independent of the current prompt revision.
        if (kind.equals("skip")) return !panel.rendererNeedsNativeDialog() && panel.rendererSkip(id);
        // Re-publish on the EDT before validation so delayed input cannot act on a new prompt.
        publish();
        if(kind.equals("choice")||kind.equals("number")||kind.equals("distribution")||kind.equals("pile")||kind.equals("card-choice")||kind.equals("choice-control")) {
            if(!action.has("revision")||action.get("revision").getAsLong()!=revision||revision==lastAcceptedRevision)return false;
            boolean accepted=kind.equals("distribution")?panel.rendererDistributionChoose(id):kind.equals("pile")?panel.rendererPileChoose(id):kind.equals("card-choice")?panel.rendererCardChoose(id):kind.equals("choice-control")?(panel.rendererCardDialog()!=null&&panel.rendererFeedback().rendererClick(id)):panel.rendererChoose(kind,id);if(accepted)lastAcceptedRevision=revision;return accepted;
        }
        if (!action.has("revision") || action.get("revision").getAsLong() != revision || revision == lastAcceptedRevision || panel.rendererNeedsNativeDialog()) return false;
        if(kind.equals("auto-pay")) {
            if(!isManaPayment())return false;
            String next=mage.players.RendererAutoPay.next(panel.getLastGameData().game,panel.rendererPlayerId(),panel.rendererFeedback().rendererMessage());
            if(next==null||!next.equals(id))return false;
            lastAcceptedRevision=revision;
            if(next.startsWith("pool:")) {
                String color=next.split(":")[1];
                mage.constants.ManaType type=color.equals("W")?mage.constants.ManaType.WHITE:color.equals("U")?mage.constants.ManaType.BLUE:color.equals("B")?mage.constants.ManaType.BLACK:color.equals("R")?mage.constants.ManaType.RED:color.equals("G")?mage.constants.ManaType.GREEN:mage.constants.ManaType.COLORLESS;
                return SessionHandler.sendPlayerManaType(panel.rendererGameId(),panel.rendererPlayerId(),type);
            }
            DefaultActionCallback.instance.mouseClicked(panel.rendererGameId(),panel.getLastGameData().game.getPlayers().stream().filter(p->p.getPlayerId().equals(panel.rendererPlayerId())).findFirst().get().getBattlefield().get(UUID.fromString(next)));
            return true;
        }
        if(kind.equals("smart-pass")) {
            boolean accepted=canSmartSkip(panel.getLastGameData().game)&&panel.rendererFeedback().rendererClick("right");
            if(accepted)lastAcceptedRevision=revision;
            return accepted;
        }
        if (kind.equals("control")) {
            boolean accepted = panel.rendererFeedback().rendererClick(id);
            if (accepted) lastAcceptedRevision = revision;
            return accepted;
        }
        if (panel.rendererPlayerId() == null) return false;
        if (kind.equals("card")) {
            GameView game = panel.getLastGameData().game;
            CardView card = game.getMyHand().get(UUID.fromString(id));
            if (card == null) card = game.getStack().get(UUID.fromString(id));
            for (PlayerView player : game.getPlayers()) {
                if (card == null) card = player.getBattlefield().get(UUID.fromString(id));
                if (card == null) card = player.getGraveyard().get(UUID.fromString(id));
                if (card == null) card = player.getExile().get(UUID.fromString(id));
                if (card == null && player.getTopCard()!=null && player.getTopCard().getId().toString().equals(id)) card=player.getTopCard();
                if (card == null) card = CardsViewUtil.convertCommandObject(player.getCommandObjectList()).get(UUID.fromString(id));
            }
            if (card == null) return false;
            lastAcceptedRevision = revision;
            DefaultActionCallback.instance.mouseClicked(panel.rendererGameId(), card);
            return true;
        }
        if (kind.equals("player")) {
            for (PlayerView player : panel.getLastGameData().game.getPlayers()) if (player.getPlayerId().toString().equals(id)) {
                lastAcceptedRevision = revision;
                SessionHandler.sendPlayerUUID(panel.rendererGameId(), player.getPlayerId()); return true;
            }
        }
        return false;
    }

    static java.nio.file.Path customSound(String filename) {
        if(filename==null||!filename.matches("(?:spawn|buff|debuff|attack|block|damage|death|leave|stack-exit|cast|priority|attention)\\.(?:wav|mp3|ogg)"))return null;
        return java.nio.file.Paths.get("battlefield-sounds",filename);
    }

    static byte[] readLimited(InputStream input, int limit) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream(); byte[] buffer = new byte[8192]; int length;
        while ((length = input.read(buffer)) != -1) { if (output.size() + length > limit) throw new IOException("Request too large"); output.write(buffer, 0, length); }
        return output.toByteArray();
    }

    private void reply(HttpExchange request, int status, String mime, byte[] data) throws IOException {
        request.getResponseHeaders().set("Content-Type", mime + (mime.startsWith("text/") || mime.equals("application/json") ? "; charset=utf-8" : ""));
        request.getResponseHeaders().set("Cache-Control", "no-store");
        request.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        request.getResponseHeaders().set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'");
        request.sendResponseHeaders(status, data.length == 0 ? -1 : data.length);
        if (data.length > 0) request.getResponseBody().write(data);
    }

    @Override public void close() { closed = true; panel.rendererPresence(false); mage.client.util.audio.AudioManager.battlefieldPresence(panel.rendererGameId(),false); if(nativeWindow!=null)nativeWindow.destroy(); timer.stop(); art.close(); commanderPortraits.clear(); server.stop(0); executor.shutdownNow(); imageCards = Collections.emptyMap(); }
}
