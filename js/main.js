/**
 * AI NIDS - Core UI Application Script
 * Web Audio synthesizer, 1-click clipboard copy, scroll progress ring, scroll spy, and mobile navigation
 */

(function () {
  'use strict';

  // ==========================================
  // 1. Web Audio API Cyber Synthesizer
  // ==========================================
  let audioCtx = null;
  let isAudioEnabled = false;

  function initAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playCyberAudio(type = 'click') {
    if (!isAudioEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    try {
      if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'alert') {
        // Dual-frequency alarm warble
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(650, now);
        osc1.frequency.exponentialRampToValueAtTime(320, now + 0.18);
        osc2.frequency.setValueAtTime(880, now);
        osc2.frequency.exponentialRampToValueAtTime(440, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.22);
        osc2.stop(now + 0.22);
      } else if (type === 'success') {
        // Ascending harmonic triad
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        freqs.forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const startTime = now + idx * 0.07;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, startTime);
          gain.gain.setValueAtTime(0.09, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.15);
        });
      }
    } catch (e) {
      // Audio fallback silent fail
    }
  }

  function toggleAudio(forceState) {
    isAudioEnabled = typeof forceState === 'boolean' ? forceState : !isAudioEnabled;
    localStorage.setItem('cyber_audio_fx', isAudioEnabled);

    if (isAudioEnabled) initAudioContext();

    const btn = document.getElementById('btn-toggle-audio');
    if (btn) {
      btn.innerHTML = isAudioEnabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
      btn.classList.toggle('active', isAudioEnabled);
    }

    if (isAudioEnabled) playCyberAudio('success');
    return isAudioEnabled;
  }

  window.playCyberAudio = playCyberAudio;
  window.toggleAudio = toggleAudio;

  // ==========================================
  // 2. Click to Copy on Roadmap Code Boxes
  // ==========================================
  function setupCodeCopy() {
    const codeBoxes = document.querySelectorAll('.code-box');

    codeBoxes.forEach(box => {
      box.style.cursor = 'pointer';
      box.title = 'Click to copy command';

      box.addEventListener('click', async () => {
        const textSpan = box.querySelector('span:first-child') || box;
        const iconSpan = box.querySelector('span:last-child');
        const textToCopy = textSpan.innerText.trim();

        try {
          await navigator.clipboard.writeText(textToCopy);
          playCyberAudio('success');

          if (iconSpan) {
            const originalIcon = iconSpan.innerHTML;
            iconSpan.innerHTML = '<span style="color:#34d399; font-weight:700;">✓ Copied!</span>';
            box.style.borderColor = 'rgba(16, 185, 129, 0.6)';
            box.style.background = 'rgba(16, 185, 129, 0.1)';

            setTimeout(() => {
              iconSpan.innerHTML = originalIcon;
              box.style.borderColor = '';
              box.style.background = '';
            }, 1800);
          }
        } catch (err) {
          // Fallback selection
          const textarea = document.createElement('textarea');
          textarea.value = textToCopy;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      });
    });
  }

  // ==========================================
  // 3. Scroll Progress Ring & Scroll-To-Top
  // ==========================================
  function setupScrollProgress() {
    let scrollBtn = document.getElementById('scroll-top-btn');
    if (!scrollBtn) {
      scrollBtn = document.createElement('button');
      scrollBtn.id = 'scroll-top-btn';
      scrollBtn.className = 'scroll-top-btn';
      scrollBtn.setAttribute('aria-label', 'Scroll to top');
      scrollBtn.innerHTML = `
        <svg class="progress-ring" width="48" height="48" viewBox="0 0 48 48">
          <circle class="progress-ring-bg" cx="24" cy="24" r="20"></circle>
          <circle class="progress-ring-circle" cx="24" cy="24" r="20" id="scroll-ring-circle"></circle>
        </svg>
        <span class="scroll-arrow">↑</span>
      `;
      document.body.appendChild(scrollBtn);
    }

    const circle = document.getElementById('scroll-ring-circle');
    const radius = 20;
    const circumference = 2 * Math.PI * radius;

    if (circle) {
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      circle.style.strokeDashoffset = circumference;
    }

    function updateProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;

      if (circle) {
        const offset = circumference - (progress * circumference);
        circle.style.strokeDashoffset = offset;
      }

      if (scrollTop > 260) {
        scrollBtn.classList.add('visible');
      } else {
        scrollBtn.classList.remove('visible');
      }
    }

    window.addEventListener('scroll', updateProgress, { passive: true });

    scrollBtn.addEventListener('click', () => {
      playCyberAudio('click');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ==========================================
  // 4. Scroll-Spy & Smooth Navigation
  // ==========================================
  function setupScrollSpy() {
    const sections = document.querySelectorAll('section[id], .hero');
    const navLinks = document.querySelectorAll('.nav-links a');

    function onScroll() {
      const scrollPos = window.scrollY + 160;

      sections.forEach(sec => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        const id = sec.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active-nav');
            } else {
              link.classList.remove('active-nav');
            }
          });
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Smooth scroll for nav anchor clicks
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
          e.preventDefault();
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            playCyberAudio('click');
            const offsetTop = targetEl.offsetTop - 80;
            window.scrollTo({ top: offsetTop, behavior: 'smooth' });

            // Close mobile menu if open
            const navLinksContainer = document.querySelector('.nav-links');
            if (navLinksContainer && navLinksContainer.classList.contains('mobile-open')) {
              navLinksContainer.classList.remove('mobile-open');
            }
          }
        }
      });
    });
  }

  // ==========================================
  // 5. Mobile Hamburger Drawer
  // ==========================================
  function setupMobileMenu() {
    const header = document.querySelector('header .nav-inner');
    if (!header) return;

    let hamburger = document.getElementById('mobile-menu-btn');
    if (!hamburger) {
      hamburger = document.createElement('button');
      hamburger.id = 'mobile-menu-btn';
      hamburger.className = 'mobile-menu-btn';
      hamburger.setAttribute('aria-label', 'Toggle navigation menu');
      hamburger.innerHTML = '<span></span><span></span><span></span>';
      
      const brand = document.querySelector('.brand');
      if (brand) brand.after(hamburger);
    }

    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        playCyberAudio('click');
        hamburger.classList.toggle('open');
        navLinks.classList.toggle('mobile-open');
      });
    }
  }

  // ==========================================
  // 6. Header Cyber Toolbar Controls
  // ==========================================
  function setupHeaderToolbar() {
    // Check saved audio preference
    const savedAudio = localStorage.getItem('cyber_audio_fx');
    isAudioEnabled = savedAudio === 'true';

    const btnAudio = document.getElementById('btn-toggle-audio');
    if (btnAudio) {
      btnAudio.innerHTML = isAudioEnabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
      btnAudio.classList.toggle('active', isAudioEnabled);
      btnAudio.addEventListener('click', () => toggleAudio());
    }

    const btnGrid = document.getElementById('btn-toggle-grid');
    if (btnGrid) {
      const isGridOn = window.isCyberMatrixEnabled ? window.isCyberMatrixEnabled() : true;
      btnGrid.innerHTML = isGridOn ? '✨ Grid: ON' : '✨ Grid: OFF';
      btnGrid.classList.toggle('active', isGridOn);

      btnGrid.addEventListener('click', () => {
        if (window.toggleCyberMatrix) {
          const newState = window.toggleCyberMatrix();
          btnGrid.innerHTML = newState ? '✨ Grid: ON' : '✨ Grid: OFF';
          btnGrid.classList.toggle('active', newState);
          playCyberAudio('click');
        }
      });
    }

    // Audio unlock on first user click anywhere
    document.addEventListener('click', function unlock() {
      if (isAudioEnabled) initAudioContext();
      document.removeEventListener('click', unlock);
    }, { once: true });
  }

  function init() {
    setupHeaderToolbar();
    setupCodeCopy();
    setupScrollProgress();
    setupScrollSpy();
    setupMobileMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

