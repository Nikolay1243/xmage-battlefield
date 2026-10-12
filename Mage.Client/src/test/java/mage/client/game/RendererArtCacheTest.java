package mage.client.game;
import com.google.gson.*;import org.junit.Test;import static org.junit.Assert.*;
public class RendererArtCacheTest {
 @Test public void usesTheVisibleFaceOfDoubleFacedCards(){JsonObject data=new Gson().fromJson("{\"card_faces\":[{\"name\":\"Front\",\"image_uris\":{\"normal\":\"front.png\"}},{\"name\":\"Back\",\"image_uris\":{\"normal\":\"back.png\"}}]}",JsonObject.class);assertEquals("back.png",RendererArtCache.imageUrl(data,"Back"));assertNull(RendererArtCache.imageUrl(data,"Unknown"));}
 @Test public void handlesNormalCardsAndMissingImages(){JsonObject data=new Gson().fromJson("{\"image_uris\":{\"normal\":\"card.png\"}}",JsonObject.class);assertEquals("card.png",RendererArtCache.imageUrl(data,"Any"));assertNull(RendererArtCache.imageUrl(new JsonObject(),"Any"));}
}
