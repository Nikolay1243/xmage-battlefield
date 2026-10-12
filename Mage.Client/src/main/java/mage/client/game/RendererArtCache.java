package mage.client.game;

import com.google.gson.*;
import mage.view.CardView;
import org.mage.plugins.card.images.ImageCache;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;

/** On-demand art only; HTTP/game input never waits for a download. */
final class RendererArtCache implements AutoCloseable {
    private final ExecutorService downloads = Executors.newSingleThreadExecutor(r -> {Thread t=new Thread(r,"xmage-renderer-art");t.setDaemon(true);return t;});
    private final Map<String, Future<byte[]>> pending = new ConcurrentHashMap<>();
    private final Path directory = Paths.get("renderer-art");
    private long lastRequest;
    private final Map<String, Long> failures = new ConcurrentHashMap<>();
    byte[] get(CardView card) throws IOException {
        if(card.isFaceDown()) return null;
        BufferedImage local=ImageCache.getCardImageOriginal(card).getImage();
        if(local!=null){ByteArrayOutputStream out=new ByteArrayOutputStream();ImageIO.write(local,"png",out);return out.toByteArray();}
        String identity=card.getName()+"|"+card.getExpansionSetCode()+"|"+card.getCardNumber();
        Long failed=failures.get(identity);if(failed!=null&&System.currentTimeMillis()-failed>60000){pending.remove(identity);failures.remove(identity);}
        Future<byte[]> task=pending.computeIfAbsent(identity,key->downloads.submit(()->download(card,key)));
        if(!task.isDone())return null;
        try{return task.get();}catch(Exception error){failures.put(identity,System.currentTimeMillis());return null;}
    }
    private byte[] download(CardView card,String identity){
        try{
            StringBuilder hash=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(identity.getBytes("UTF-8")))hash.append(String.format("%02x",b&255));
            Path file=directory.resolve(hash+".png");if(Files.exists(file))return Files.readAllBytes(file);
            String exact=URLEncoder.encode(card.getName(),"UTF-8");
            JsonObject metadata;
            try{metadata=metadata("https://api.scryfall.com/cards/named?exact="+exact+"&set="+URLEncoder.encode(card.getExpansionSetCode(),"UTF-8"));}
            catch(IOException unavailable){metadata=metadata("https://api.scryfall.com/cards/named?exact="+exact);}
            String url=imageUrl(metadata,card.getName());if(url==null){failures.put(identity,System.currentTimeMillis());return null;}
            URL imageUrl=new URL(url);if(!imageUrl.getProtocol().equals("https")||!imageUrl.getHost().endsWith(".scryfall.io"))return null;
            byte[] bytes=fetch(url,"image/*",8*1024*1024);
            BufferedImage image=ImageIO.read(new ByteArrayInputStream(bytes));if(image==null)return null;
            ByteArrayOutputStream out=new ByteArrayOutputStream();ImageIO.write(image,"png",out);byte[] png=out.toByteArray();
            Files.createDirectories(directory);Files.write(file,png);return png;
        }catch(Exception error){failures.put(identity,System.currentTimeMillis());return null;}
    }
    private JsonObject metadata(String url)throws Exception{
        long wait=300-(System.currentTimeMillis()-lastRequest);if(wait>0)Thread.sleep(wait);lastRequest=System.currentTimeMillis();
        return new Gson().fromJson(new String(fetch(url,"application/json",1024*1024),"UTF-8"),JsonObject.class);
    }
    static String imageUrl(JsonObject metadata,String faceName){
        if(metadata.has("card_faces"))for(JsonElement element:metadata.getAsJsonArray("card_faces")){
            JsonObject face=element.getAsJsonObject();
            if(face.has("name")&&face.get("name").getAsString().equalsIgnoreCase(faceName)&&face.has("image_uris"))return face.getAsJsonObject("image_uris").get("normal").getAsString();
        }
        return metadata.has("image_uris")?metadata.getAsJsonObject("image_uris").get("normal").getAsString():null;
    }
    private byte[] fetch(String url,String accept,int limit)throws IOException{
        HttpURLConnection connection=(HttpURLConnection)new URL(url).openConnection();connection.setConnectTimeout(5000);connection.setReadTimeout(8000);
        connection.setRequestProperty("User-Agent","XMage-GameplayRenderer/0.1 (https://github.com/Nikolay1243/xmage-battlefield)");connection.setRequestProperty("Accept",accept);
        try(InputStream input=connection.getInputStream()){return BrowserGameRenderer.readLimited(input,limit);}finally{connection.disconnect();}
    }
    @Override public void close(){downloads.shutdownNow();pending.clear();}
}
