"""Generate original, deterministic Battlefield effects. No third-party samples."""
import argparse, math, random, struct, wave
from pathlib import Path
RATE = 48000
rng = random.Random(20261010)

def tone(buf, at, length, start, end=None, gain=.2, harmonics=(1,.16,.04)):
    phase=0.; end=start if end is None else end
    count=int(length*RATE); offset=int(at*RATE)
    for i in range(count):
        if offset+i>=len(buf): break
        u=i/max(1,count-1); phase+=2*math.pi*(start+(end-start)*u)/RATE
        envelope=min(1,u/.025)*(1-u)**2
        buf[offset+i]+=gain*envelope*sum(level*math.sin(phase*(j+1)) for j,level in enumerate(harmonics))

def noise(buf, at, length, gain=.2, cutoff=1800, swell=False):
    offset=int(at*RATE); count=int(length*RATE); low=0.
    alpha=1-math.exp(-2*math.pi*cutoff/RATE)
    for i in range(count):
        if offset+i>=len(buf): break
        u=i/max(1,count-1); low+=alpha*(rng.uniform(-1,1)-low)
        envelope=math.sin(math.pi*u)**1.5 if swell else min(1,u/.015)*(1-u)**3
        buf[offset+i]+=low*gain*envelope

def chime(buf, notes, at=0, step=.055, gain=.15, length=.35):
    for i,note in enumerate(notes):
        tone(buf,at+i*step,length,note,gain=gain,harmonics=(1,.13,.025))
        tone(buf,at+i*step,length*.45,note*2.005,gain=gain*.16,harmonics=(1,))

def air(buf,at,length,gain=.3,brightness=1600):
    noise(buf,at,length,gain,brightness,True)
    noise(buf,at+.015,length*.8,gain*.35,brightness*.35,True)

def impact(buf,at,weight=1):
    tone(buf,at,.15,95,42,.24*weight,harmonics=(1,.05))
    noise(buf,at,.07,.7*weight,2600)
    noise(buf,at,.22,.35*weight,550)

def shimmer(buf,at,length,gain=.035):
    # Inharmonic, scattered resonances: a texture rather than a melodic cue.
    for i in range(9):
        f=rng.uniform(1100,4800)
        tone(buf,at+rng.uniform(0,.12),length*rng.uniform(.45,1),f,f*.97,gain*rng.uniform(.4,1),harmonics=(1,))
    air(buf,at,length,gain*3,3800)

def resonator(buf,at,length,frequency,gain=.18,decay=.12,ratios=(1,2.76,5.4)):
    # Damped physical modes rather than sliding oscillators or long noise bursts.
    offset=int(at*RATE)
    for i in range(int(length*RATE)):
        if offset+i>=len(buf):break
        t=i/RATE;attack=1-math.exp(-t/.0015)
        buf[offset+i]+=gain*attack*sum((.52**j)*math.exp(-t/(decay/(1+j*.7)))*math.sin(2*math.pi*frequency*ratio*t) for j,ratio in enumerate(ratios))

def hit(buf,at,weight=1):
    resonator(buf,at,.24,86,.24*weight,.065,(1,1.61,2.7))
    resonator(buf,at,.13,340,.08*weight,.022,(1,2.8))
    noise(buf,at,.012,.16*weight,3500)

def bell(buf,at,frequency,gain=.12,length=.42):
    resonator(buf,at,length,frequency,gain,.15,(1,2.756,5.404,8.933))

lengths={'cast':.65,'priority':.28,'spawn':.45,'attack':.32,'block':.38,'damage':.30,'death':.55,'buff':.57,'debuff':.44,'leave':.40,'stack-exit':.46}
def make(kind):
    b=[0.] * int(RATE*lengths[kind])
    if kind=='cast':
        resonator(b,0,.20,270,.08,.035,(1,2.7));bell(b,.05,620,.12,.47);bell(b,.09,930,.035,.40)
    elif kind=='priority':
        bell(b,0,980,.11,.25)
    elif kind=='spawn':
        hit(b,0,.6);bell(b,.035,420,.065,.35)
    elif kind=='attack':
        resonator(b,0,.14,230,.12,.032,(1,2.7));hit(b,.045,.95)
    elif kind=='block':
        hit(b,0,.6);resonator(b,0,.34,740,.16,.09,(1,1.47,2.09,3.32))
    elif kind=='damage':
        hit(b,0,1.2)
    elif kind=='death':
        resonator(b,0,.43,110,.19,.10,(1,1.71,2.9));resonator(b,.06,.30,210,.07,.065,(1,2.1));noise(b,0,.016,.09,1400)
    elif kind=='buff':
        bell(b,0,720,.10,.46);bell(b,.055,1080,.045,.46)
    elif kind=='debuff':
        resonator(b,0,.36,310,.13,.08,(1,1.47,2.09));resonator(b,.035,.29,230,.045,.07,(1,2.1))
    elif kind=='leave':
        resonator(b,0,.25,420,.09,.055,(1,2.7));bell(b,.04,840,.025,.32)
    elif kind=='stack-exit':
        resonator(b,0,.14,300,.07,.025,(1,2.7));bell(b,.025,520,.10,.40)
    # Small room reflections make the resonances less dry without a long wash.
    dry=b.copy()
    for delay,gain in [(.019,.14),(.037,.08),(.061,.035)]:
        offset=int(delay*RATE)
        for i in range(offset,len(b)):b[i]+=dry[i-offset]*gain
    # Keep natural relative levels. Fade both ends; peak-limit the whole clip.
    peak=max(abs(v) for v in b); scale=min(1,.65/max(.001,peak))
    fade=int(.008*RATE)
    b=[v*scale*min(1,i/fade,(len(b)-1-i)/fade) for i,v in enumerate(b)]
    return b

parser=argparse.ArgumentParser();parser.add_argument('directory',type=Path);args=parser.parse_args();args.directory.mkdir(parents=True,exist_ok=True)
for name in lengths:
    samples=make(name); path=args.directory/(name+'.wav')
    if path.exists():raise SystemExit(f'Refusing to overwrite {path}')
    with wave.open(str(path),'wb') as output:
        output.setnchannels(1);output.setsampwidth(2);output.setframerate(RATE)
        output.writeframes(struct.pack('<'+'h'*len(samples),*[round(v*32767) for v in samples]))
    print(f'{name}: {len(samples)/RATE:.2f}s, peak {max(abs(v) for v in samples):.3f}')
