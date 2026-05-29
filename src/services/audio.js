let audioCtx = null;

function getACtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Warm up audio context on touch/pointer down
export function warmUpAudio() {
  const c = getACtx();
  if (c.state === 'suspended') c.resume();
}

export function playTick() {
  const c = getACtx();
  const play = () => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = 1100;
    g.gain.setValueAtTime(.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .08);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + .09);
  };
  c.state === 'suspended' ? c.resume().then(play) : play();
}

export function playDoneSound() {
  const c = getACtx();
  const play = () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = c.currentTime + i * .2;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.35, t + .05);
      g.gain.exponentialRampToValueAtTime(.001, t + 1.0);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 1.0);
    });
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.type = 'sine'; o2.frequency.value = 1568;
    const t2 = c.currentTime + .75;
    g2.gain.setValueAtTime(0, t2); g2.gain.linearRampToValueAtTime(.2, t2+.05);
    g2.gain.exponentialRampToValueAtTime(.001, t2+1.2);
    o2.connect(g2); g2.connect(c.destination);
    o2.start(t2); o2.stop(t2+1.2);
  };
  c.state === 'suspended' ? c.resume().then(play) : play();
}
