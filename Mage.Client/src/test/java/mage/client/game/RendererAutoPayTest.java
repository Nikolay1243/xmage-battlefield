package mage.client.game;
import mage.players.*;
import mage.abilities.mana.BlueManaAbility;
import org.junit.Test;
import java.util.*;
import static org.junit.Assert.*;
public class RendererAutoPayTest {
 @Test public void parsesOnlyOrdinaryResolvedCosts(){
  assertEquals(Arrays.asList("U","generic","generic"),RendererAutoPay.cost("Pay {2}{U} Island"));
  for(String s:Arrays.asList("Pay {U/P} Spell","Pay {2}{W/U} Spell","Pay {X} Spell","Choose {U}","Pay {9999999999} Spell"))assertTrue(RendererAutoPay.cost(s).isEmpty());
 }
 @Test public void recognisesSingleBasicManaAndRejectsAmbiguity(){
  assertEquals("U",RendererAutoPay.landColor(new PlayableObjectStats(Collections.singletonList(new BlueManaAbility()))));
  assertNull(RendererAutoPay.landColor(new PlayableObjectStats(Arrays.asList(new BlueManaAbility(),new BlueManaAbility()))));
 }
 @Test public void plansCompletePaymentWithoutWastingNeededColours(){
  Map<String,String> sources=new LinkedHashMap<>();sources.put("island","U");sources.put("mountain","R");
  assertEquals(Arrays.asList("island","mountain"),RendererAutoPay.plan(RendererAutoPay.cost("Pay {1}{U}"),sources));
  assertTrue(RendererAutoPay.plan(RendererAutoPay.cost("Pay {2}{U}"),sources).isEmpty());
  assertTrue(RendererAutoPay.plan(RendererAutoPay.cost("Pay {B}"),sources).isEmpty());
  assertEquals(2,sources.size());
 }
}
