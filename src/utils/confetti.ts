import confetti from 'canvas-confetti';

export function fireVictoryConfetti(): void {
  try {
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#ff0055', '#ffaa00', '#00e5ff', '#ffeb3b', '#76ff03'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#ff0055', '#ffaa00', '#00e5ff', '#ffeb3b', '#76ff03'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } catch (err) {
    console.warn('Confetti effect error:', err);
  }
}
