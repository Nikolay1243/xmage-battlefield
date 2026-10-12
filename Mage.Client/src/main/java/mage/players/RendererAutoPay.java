package mage.players;

import java.util.*;
import java.util.regex.*;
import mage.constants.CardType;
import mage.view.*;

/** Client-only planner: ordinary one-mana lands, never ambiguous or additional costs. */
public final class RendererAutoPay {
    private RendererAutoPay() {}
    public static List<String> cost(String prompt) {
        Matcher m=Pattern.compile("^Pay ((?:\\{(?:[0-9]+|[WUBRGC])\\})+)(?:\\s|<|$)").matcher(prompt);
        if(!m.find())return Collections.emptyList();
        List<String> result=new ArrayList<>();Matcher tokens=Pattern.compile("\\{([^}]+)\\}").matcher(m.group(1));
        while(tokens.find()){String t=tokens.group(1);if(t.matches("[0-9]+")){int n;try{n=Integer.parseInt(t);}catch(NumberFormatException ex){return Collections.emptyList();}if(n>100)return Collections.emptyList();for(int i=0;i<n;i++)result.add("generic");}else result.add(t);}
        result.sort(Comparator.comparing(t->t.equals("generic")));return result;
    }
    public static String landColor(PlayableObjectStats stats) {
        if(stats==null||stats.basicManaAbilities.size()!=1||!stats.other.isEmpty())return null;
        String text=stats.basicManaAbilities.get(0).getValue();
        Matcher m=Pattern.compile("^\\{T\\}: Add \\{([WUBRGC])\\}\\.?$").matcher(text);
        return m.matches()?m.group(1):null;
    }
    /** Returns a complete affordable plan, coloured requirements first. */
    public static List<String> plan(List<String> cost,Map<String,String> sources) {
        if(cost.isEmpty())return Collections.emptyList();
        Map<String,String> available=new LinkedHashMap<>(sources);List<String> result=new ArrayList<>();
        for(String symbol:cost){String id=available.entrySet().stream().filter(e->symbol.equals("generic")||symbol.equals(e.getValue())).map(Map.Entry::getKey).findFirst().orElse(null);if(id==null)return Collections.emptyList();result.add(id);available.remove(id);}
        return result;
    }
    public static String next(GameView game,UUID local,String prompt) {
        if(game==null||local==null||game.getCanPlayObjects()==null||game.getSpecial())return null;
        PlayerView me=game.getPlayers().stream().filter(p->p.getPlayerId().equals(local)).findFirst().orElse(null);if(me==null)return null;
        Map<String,String> sources=new LinkedHashMap<>();
        ManaPoolView pool=me.getManaPool();String[] colors={"W","U","B","R","G","C"};int[] counts={pool.getWhite(),pool.getBlue(),pool.getBlack(),pool.getRed(),pool.getGreen(),pool.getColorless()};
        for(int i=0;i<colors.length;i++)for(int n=0;n<Math.min(100,counts[i]);n++)sources.put("pool:"+colors[i]+":"+n,colors[i]);
        for(CardView card:me.getBattlefield().values()) {
            if(!(card instanceof PermanentView)||((PermanentView)card).isTapped()||card.isFaceDown()||!card.getCardTypes().contains(CardType.LAND)||card.getCardTypes().contains(CardType.CREATURE))continue;
            String color=landColor(game.getCanPlayObjects().getStats(card.getId()));if(color!=null)sources.put(card.getId().toString(),color);
        }
        List<String> plan=plan(cost(prompt),sources);return plan.isEmpty()?null:plan.get(0);
    }
}
