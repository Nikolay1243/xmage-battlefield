package mage.client.game;

import com.google.gson.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.io.IOException;
import java.util.*;

/** Client-wide renderer settings, independent of per-game HTTP ports. */
final class RendererPreferences {
    private static final Path FILE=Paths.get("renderer-preferences.json");
    private static Map<String,Object> current=read();
    static Map<String,Object> sanitize(JsonObject json){
        Map<String,Object> values=new LinkedHashMap<>();
        values.put("cardSize",number(json,"cardSize",1,.75,1.5));
        values.put("animation",number(json,"animation",1,0,1));
        values.put("volume",number(json,"volume",.25,0,1));
        String preview=json.has("preview")&&json.get("preview").isJsonPrimitive()?json.get("preview").getAsString():"left";
        values.put("preview",preview.equals("right")?"right":"left");return values;
    }
    private static double number(JsonObject json,String key,double fallback,double min,double max){
        try{double value=json.has(key)?json.get(key).getAsDouble():fallback;return Double.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;}catch(RuntimeException error){return fallback;}
    }
    private static Map<String,Object> read(){return read(FILE);}
    static Map<String,Object> read(Path file){try{return sanitize(JsonParser.parseString(new String(Files.readAllBytes(file),StandardCharsets.UTF_8)).getAsJsonObject());}catch(Exception error){return sanitize(new JsonObject());}}
    static synchronized Map<String,Object> get(){return new LinkedHashMap<>(current);}
    static synchronized boolean save(String value){return save(FILE,value);}
    static synchronized boolean save(Path file,String value){
        try{Map<String,Object> next=sanitize(JsonParser.parseString(value).getAsJsonObject());Path temp=file.resolveSibling(file.getFileName()+".tmp");Files.write(temp,new Gson().toJson(next).getBytes(StandardCharsets.UTF_8));Files.move(temp,file,StandardCopyOption.REPLACE_EXISTING);current=next;return true;}catch(IOException|RuntimeException error){return false;}
    }
}
