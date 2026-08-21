// Qo'ng'iroq paytidagi gudok ovozi — tashqi audio fayl kerak emas, Web Audio API bilan
// jonli generatsiya qilinadi (klassik telefon gudogi: 1s tovush, 3s jimlik).
export function createRingback() {
  let ctx = null, osc = null, gain = null, timer = null, running = false;

  function start() {
    if (running) return;
    running = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      osc.frequency.value = 425;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      let on = false;
      const tick = () => {
        if (!running) return;
        on = !on;
        gain.gain.setTargetAtTime(on ? 0.12 : 0, ctx.currentTime, 0.01);
        timer = setTimeout(tick, on ? 1000 : 3000);
      };
      tick();
    } catch { /* AudioContext mavjud emas yoki bloklangan — jim o'tkaziladi */ }
  }

  function stop() {
    running = false;
    clearTimeout(timer);
    try { osc?.stop(); } catch { /* allaqachon to'xtagan */ }
    try { ctx?.close(); } catch { /* allaqachon yopilgan */ }
    osc = null; gain = null; ctx = null;
  }

  return { start, stop };
}
