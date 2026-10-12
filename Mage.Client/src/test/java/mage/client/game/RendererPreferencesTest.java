package mage.client.game;
import com.google.gson.*;
import mage.client.dialog.PickMultiNumberDialog;
import mage.util.MultiAmountMessage;
import org.junit.Test;
import java.util.*;
import static org.junit.Assert.*;
public class RendererPreferencesTest {
 @org.junit.Rule public org.junit.rules.TemporaryFolder temp=new org.junit.rules.TemporaryFolder();
 @Test public void settingsSurviveReloadAndCorruptFilesFallBack() throws Exception {
  java.nio.file.Path file=temp.newFile("settings.json").toPath();assertTrue(RendererPreferences.save(file,"{\"cardSize\":1.25,\"volume\":0,\"preview\":\"right\"}"));
  assertEquals(1.25,RendererPreferences.read(file).get("cardSize"));assertEquals(0.0,RendererPreferences.read(file).get("volume"));assertEquals("right",RendererPreferences.read(file).get("preview"));
  java.nio.file.Files.write(file,"broken".getBytes(java.nio.charset.StandardCharsets.UTF_8));assertEquals(1.0,RendererPreferences.read(file).get("cardSize"));
 }

 @Test public void invalidPreferencesAreClampedAndUnknownFieldsDiscarded(){
  JsonObject input=new JsonObject();input.addProperty("cardSize",99);input.addProperty("animation",-2);input.addProperty("volume","bad");input.addProperty("preview","invalid");input.addProperty("path","ignored");
  Map<String,Object> value=RendererPreferences.sanitize(input);assertEquals(1.5,value.get("cardSize"));assertEquals(0.0,value.get("animation"));assertEquals(.25,value.get("volume"));assertEquals("left",value.get("preview"));assertFalse(value.containsKey("path"));
 }
 @Test public void distributionsEnforceItemBoundsTotalAndCount(){
  List<MultiAmountMessage> messages=Arrays.asList(new MultiAmountMessage("A",0,5),new MultiAmountMessage("B",1,5));
  assertTrue(PickMultiNumberDialog.validAmounts(Arrays.asList(2,3),messages,5,5));
  assertFalse(PickMultiNumberDialog.validAmounts(Arrays.asList(2,2),messages,5,5));
  assertFalse(PickMultiNumberDialog.validAmounts(Arrays.asList(5,0),messages,5,5));
  assertFalse(PickMultiNumberDialog.validAmounts(Collections.singletonList(5),messages,5,5));
 }
 @Test public void distributionTotalCannotOverflow(){
  List<MultiAmountMessage> messages=Arrays.asList(new MultiAmountMessage("A",0,Integer.MAX_VALUE),new MultiAmountMessage("B",0,Integer.MAX_VALUE));
  assertFalse(PickMultiNumberDialog.validAmounts(Arrays.asList(Integer.MAX_VALUE,Integer.MAX_VALUE),messages,0,Integer.MAX_VALUE));
 }
}
