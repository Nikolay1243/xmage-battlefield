package mage.client.game;

import mage.view.CardView;
import org.junit.Test;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.Assert.*;

public class BrowserGameRendererTest {
    @Test public void customSoundPathsRejectTraversalAndUnknownFiles() {
        assertNotNull(BrowserGameRenderer.customSound("attack.wav"));
        assertNotNull(BrowserGameRenderer.customSound("priority.mp3"));
        for(String filename:Arrays.asList("../attack.wav","/tmp/attack.wav","attack.wav/../../secret","unknown.wav","attack.js"))assertNull(BrowserGameRenderer.customSound(filename));
    }
    @Test public void battlefieldAudioLeasesRestoreAndSupportMultipleGames() {
        UUID first=UUID.randomUUID(),second=UUID.randomUUID();
        try {
            mage.client.util.audio.AudioManager.battlefieldPresence(first,true);
            mage.client.util.audio.AudioManager.battlefieldPresence(second,true);
            assertTrue(mage.client.util.audio.AudioManager.battlefieldMuted());
            mage.client.util.audio.AudioManager.battlefieldPresence(first,false);
            assertTrue(mage.client.util.audio.AudioManager.battlefieldMuted());
            mage.client.util.audio.AudioManager.battlefieldPresence(second,false);
            assertFalse(mage.client.util.audio.AudioManager.battlefieldMuted());
        }finally{mage.client.util.audio.AudioManager.battlefieldPresence(first,false);mage.client.util.audio.AudioManager.battlefieldPresence(second,false);}
    }
    @Test public void smartSkipIgnoresBasicManaButStopsForRealActions() {
        mage.players.PlayableObjectStats mana=new mage.players.PlayableObjectStats(Collections.singletonList(new mage.abilities.mana.BlueManaAbility()));
        assertFalse(mage.players.SmartSkipActions.hasNonManaAction(mana));
        mage.players.PlayableObjectStats land=new mage.players.PlayableObjectStats(Arrays.asList(new mage.abilities.mana.BlueManaAbility(),new mage.abilities.PlayLandAbility("Island")));
        assertTrue(mage.players.SmartSkipActions.hasNonManaAction(land));
        assertFalse(mage.players.SmartSkipActions.hasNonManaAction(new mage.players.PlayableObjectStats()));
    }
    @Test public void hiddenCardFacesNeverReachTheBrowserOrImageIndex() {
        CardView hidden = new CardView(true) {
            @Override public UUID getId() { return UUID.fromString("00000000-0000-0000-0000-000000000001"); }
            @Override public boolean isFaceDown() { return true; }
            @Override public String getDisplayName() { throw new AssertionError("Hidden name was read"); }
            @Override public List<String> getRules() { throw new AssertionError("Hidden rules were read"); }
            @Override public String getRenderSignature() { throw new AssertionError("Hidden image signature was read"); }
        };
        Map<String, CardView> images = new HashMap<>();
        Map<String, Object> row = BrowserGameRenderer.cards(Collections.singleton(hidden), images).get(0);
        assertEquals("Face-down card", row.get("name"));
        assertEquals(Collections.emptyList(), row.get("rules"));
        assertFalse(row.containsKey("image"));
        assertTrue(images.isEmpty());
    }
    @Test public void legalTargetsAreSeparateFromPlayableCards() {
        CardView card=new CardView(true) {
            @Override public UUID getId(){return UUID.randomUUID();}
            @Override public boolean isFaceDown(){return true;}
            @Override public boolean isChoosable(){return true;}
            @Override public boolean isPlayable(){return false;}
            @Override public boolean isSelected(){return true;}
        };
        Map<String,Object> row=BrowserGameRenderer.cards(Collections.singleton(card),new HashMap<>()).get(0);
        assertEquals(true,row.get("targetable"));assertEquals(false,row.get("playable"));assertEquals(true,row.get("selected"));
    }
    @Test public void boundedRequestReaderPreservesBytes() throws Exception {
        byte[] bytes = "{\"id\":\"right\"}".getBytes(StandardCharsets.UTF_8);
        assertArrayEquals(bytes, BrowserGameRenderer.readLimited(new ByteArrayInputStream(bytes), bytes.length));
    }
    @Test(expected = IOException.class) public void oversizedRequestsAreRejected() throws Exception {
        BrowserGameRenderer.readLimited(new ByteArrayInputStream(new byte[4097]), 4096);
    }
}
