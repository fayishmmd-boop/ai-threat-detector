/**
 * AI NIDS - Cyber Matrix Particle Grid Background
 * High-performance interactive neural/network mesh canvas
 */

(function () {
  'use strict';

  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animId = null;
  let isEnabled = true;

  const particles = [];
  const pulses = [];
  const mouse = { x: -1000, y: -1000, radius: 140, active: false };

  // Responsive particle counts
  function getTargetCount() {
    return window.innerWidth < 768 ? 32 : 70;
  }

  function getConnectDistance() {
    return window.innerWidth < 768 ? 100 : 135;
  }

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = initial ? Math.random() * width : (Math.random() > 0.5 ? 0 : width);
      this.y = initial ? Math.random() * height : Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.radius = Math.random() * 1.5 + 1.2;
      
      // Cyber neon color palette (cyan, emerald, purple)
      const colors = [
        'rgba(6, 182, 212, ',   // cyan
        'rgba(16, 185, 129, ',  // emerald
        'rgba(168, 85, 247, '   // purple
      ];
      this.baseColor = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = Math.random() * 0.5 + 0.3;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Screen wrap
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;

      // Mouse gentle deflection
      if (mouse.active) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouse.radius && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius;
          const fx = (dx / dist) * force * 1.8;
          const fy = (dy / dist) * force * 1.8;
          this.x -= fx;
          this.y -= fy;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.baseColor + this.alpha + ')';
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.baseColor + '0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class Pulse {
    constructor(p1, p2) {
      this.p1 = p1;
      this.p2 = p2;
      this.progress = 0;
      this.speed = Math.random() * 0.02 + 0.015;
      this.color = Math.random() > 0.5 ? '#06b6d4' : '#10b981';
      this.size = Math.random() * 2 + 2;
    }

    update() {
      this.progress += this.speed;
      return this.progress <= 1;
    }

    draw() {
      const x = this.p1.x + (this.p2.x - this.p1.x) * this.progress;
      const y = this.p1.y + (this.p2.y - this.p1.y) * this.progress;
      ctx.beginPath();
      ctx.arc(x, y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const targetCount = getTargetCount();
    while (particles.length < targetCount) particles.push(new Particle());
    while (particles.length > targetCount) particles.pop();
  }

  function animate() {
    if (!isEnabled) return;

    ctx.clearRect(0, 0, width, height);

    const maxDist = getConnectDistance();

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      // Connect lines
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.28;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Occasionally spawn packet pulse between close nodes
          if (Math.random() < 0.0006 && pulses.length < 8) {
            pulses.push(new Pulse(particles[i], particles[j]));
          }
        }
      }

      // Connect to mouse if nearby
      if (mouse.active) {
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.45;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    // Update & draw pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const alive = pulses[i].update();
      if (alive) {
        pulses[i].draw();
      } else {
        pulses.splice(i, 1);
      }
    }

    animId = requestAnimationFrame(animate);
  }

  function init() {
    canvas = document.getElementById('cyber-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'cyber-canvas';
      document.body.prepend(canvas);
    }

    ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check stored preference
    const stored = localStorage.getItem('cyber_matrix_fx');
    isEnabled = stored !== 'false';

    resize();

    window.addEventListener('resize', debounce(resize, 150));

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    // Pause when tab hidden to save CPU/battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
      } else if (isEnabled) {
        animId = requestAnimationFrame(animate);
      }
    });

    if (isEnabled) {
      animId = requestAnimationFrame(animate);
    }
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  window.toggleCyberMatrix = function (forceState) {
    isEnabled = typeof forceState === 'boolean' ? forceState : !isEnabled;
    localStorage.setItem('cyber_matrix_fx', isEnabled);

    if (isEnabled) {
      if (canvas) canvas.style.display = 'block';
      if (!animId) animId = requestAnimationFrame(animate);
    } else {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (canvas && ctx) {
        ctx.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
      }
    }

    // Trigger custom event for UI buttons
    window.dispatchEvent(new CustomEvent('cyber-matrix-toggled', { detail: { enabled: isEnabled } }));
    return isEnabled;
  };

  window.isCyberMatrixEnabled = () => isEnabled;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

