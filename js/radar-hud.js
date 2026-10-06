/**
 * AI NIDS - Interactive Cyber Radar HUD Canvas
 * Real-time 360-degree rotating sonar/radar sweep with dynamic threat blips
 */

(function () {
  'use strict';

  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let centerX = 0;
  let centerY = 0;
  let radius = 0;
  let angle = 0; // Current sweep angle in radians
  let animId = null;
  let activeTooltip = null;
  let hoveredBlip = null;
  let activeFilter = 'all'; // 'all' | 'threats' | 'clean'

  // Pre-configured nodes on the network radar
  const targets = [
    {
      id: 1,
      ip: '192.168.1.105',
      name: 'Dev-Workstation',
      rFraction: 0.38,
      angle: 0.85,
      type: 'normal',
      ports: '80, 443',
      rate: '12 pkt/s',
      risk: '2.4%',
      lastPingTime: 0,
      pingRadius: 0
    },
    {
      id: 2,
      ip: '192.168.1.1',
      name: 'Default Gateway Router',
      rFraction: 0.22,
      angle: 2.1,
      type: 'normal',
      ports: '53 (DNS), 67 (DHCP)',
      rate: '45 pkt/s',
      risk: '1.1%',
      lastPingTime: 0,
      pingRadius: 0
    },
    {
      id: 3,
      ip: '10.0.0.42',
      name: 'Internal File Storage',
      rFraction: 0.55,
      angle: 3.7,
      type: 'normal',
      ports: '445 (SMB), 2049 (NFS)',
      rate: '88 pkt/s',
      risk: '4.8%',
      lastPingTime: 0,
      pingRadius: 0
    },
    {
      id: 4,
      ip: '45.33.32.156',
      name: 'External Botnet Node',
      rFraction: 0.78,
      angle: 5.15,
      type: 'threat',
      threatName: 'SYN Flood DoS',
      ports: 'Multiple spoofed ports',
      rate: '1,420 pkt/s',
      risk: '99.4%',
      lastPingTime: 0,
      pingRadius: 0
    },
    {
      id: 5,
      ip: '185.220.101.5',
      name: 'Tor Exit / Recon Probe',
      rFraction: 0.86,
      angle: 1.45,
      type: 'threat',
      threatName: 'Rapid Port Scan',
      ports: 'Scanning ports 1-1024',
      rate: '640 pkt/s',
      risk: '96.2%',
      lastPingTime: 0,
      pingRadius: 0
    },
    {
      id: 6,
      ip: '172.16.4.88',
      name: 'IoT Security Camera',
      rFraction: 0.65,
      angle: 4.25,
      type: 'warning',
      threatName: 'Unusual Beaconing',
      ports: '554 (RTSP)',
      rate: '120 pkt/s',
      risk: '42.0%',
      lastPingTime: 0,
      pingRadius: 0
    }
  ];

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height || width; // Maintain square or proportional
    if (height === 0) height = 400;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    centerX = width / 2;
    centerY = height / 2;
    radius = Math.min(centerX, centerY) - 24;
  }

  function drawGrid() {
    // Background glow circle
    const bgGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
    bgGrad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
    bgGrad.addColorStop(0.7, 'rgba(7, 11, 20, 0.7)');
    bgGrad.addColorStop(1, 'rgba(6, 182, 212, 0.18)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Concentric range circles
    const rings = [0.25, 0.5, 0.75, 1.0];
    rings.forEach((pct, idx) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * pct, 0, Math.PI * 2);
      ctx.strokeStyle = pct === 1.0 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(6, 182, 212, 0.18)';
      ctx.lineWidth = pct === 1.0 ? 2 : 1;
      if (pct < 1.0) ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);
      ctx.stroke();

      // Range text
      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${Math.round(pct * 100)}% DIST`, centerX + 6, centerY - radius * pct + 12);
    });
    ctx.setLineDash([]);

    // Crosshairs
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.lineWidth = 1;
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();
    // Vertical
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Degree markers & Ticks (0°, 90°, 180°, 270°)
    const labels = [
      { text: '000° [N]', x: centerX, y: centerY - radius - 8, align: 'center' },
      { text: '090° [E]', x: centerX + radius + 8, y: centerY + 4, align: 'left' },
      { text: '180° [S]', x: centerX, y: centerY + radius + 16, align: 'center' },
      { text: '270° [W]', x: centerX - radius - 8, y: centerY + 4, align: 'right' }
    ];
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#06b6d4';
    labels.forEach(l => {
      ctx.textAlign = l.align;
      ctx.fillText(l.text, l.x, l.y);
    });

    // Outer degree ticks
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const isMajor = deg % 90 === 0;
      const tickLen = isMajor ? 10 : 5;
      const x1 = centerX + Math.cos(rad) * radius;
      const y1 = centerY + Math.sin(rad) * radius;
      const x2 = centerX + Math.cos(rad) * (radius - tickLen);
      const y2 = centerY + Math.sin(rad) * (radius - tickLen);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isMajor ? 'rgba(6, 182, 212, 0.8)' : 'rgba(6, 182, 212, 0.3)';
      ctx.stroke();
    }
  }

  function drawSweep() {
    ctx.save();
    ctx.translate(centerX, centerY);

    // Trailing phosphor sweep cone (arc sector)
    const sweepAngle = 0.55; // ~31 degrees trail
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, angle - sweepAngle, angle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Bright leading edge line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const leadX = Math.cos(angle) * radius;
    const leadY = Math.sin(angle) * radius;
    ctx.lineTo(leadX, leadY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function drawTargets() {
    const now = performance.now();

    targets.forEach(target => {
      // Filter logic
      if (activeFilter === 'threats' && target.type === 'normal') return;
      if (activeFilter === 'clean' && target.type !== 'normal') return;

      const tDist = radius * target.rFraction;
      const tX = centerX + Math.cos(target.angle) * tDist;
      const tY = centerY + Math.sin(target.angle) * tDist;

      // Check if radar sweep just swept over this target
      const angleDiff = ((angle - target.angle + Math.PI * 4) % (Math.PI * 2));
      if (angleDiff < 0.08) {
        target.lastPingTime = now;
        target.pingRadius = 4;
      }

      // Calculate ping glow decay
      const elapsed = now - target.lastPingTime;
      const isPingActive = elapsed < 1200;
      let alpha = 0.65;
      if (isPingActive) {
        alpha = 1.0 - (elapsed / 1200) * 0.35;
      }

      let color = '#10b981'; // Green normal
      let glowColor = 'rgba(16, 185, 129, 0.6)';
      if (target.type === 'threat') {
        color = '#ef4444'; // Red threat
        glowColor = 'rgba(239, 68, 68, 0.8)';
      } else if (target.type === 'warning') {
        color = '#f59e0b'; // Amber warning
        glowColor = 'rgba(245, 158, 11, 0.8)';
      }

      // Draw ping expanding ring ripple
      if (isPingActive) {
        const ringProgress = elapsed / 1200;
        const currentRingR = 6 + ringProgress * 24;
        const ringAlpha = (1 - ringProgress) * 0.8;

        ctx.beginPath();
        ctx.arc(tX, tY, currentRingR, 0, Math.PI * 2);
        ctx.strokeStyle = color.replace(')', `, ${ringAlpha})`).replace('rgb', 'rgba').replace('#ef4444', `rgba(239,68,68,${ringAlpha})`).replace('#10b981', `rgba(16,185,129,${ringAlpha})`).replace('#f59e0b', `rgba(245,158,11,${ringAlpha})`);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw blip core
      ctx.beginPath();
      ctx.arc(tX, tY, target.type === 'threat' ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = target === hoveredBlip ? 16 : (isPingActive ? 12 : 4);
      ctx.shadowColor = glowColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw subtle label beside target
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = target === hoveredBlip ? '#fff' : (target.type === 'threat' ? 'rgba(248, 113, 113, 0.85)' : 'rgba(148, 163, 184, 0.7)');
      ctx.fillText(target.ip, tX + 8, tY - 4);

      if (target.type === 'threat') {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(`🚨 ${target.threatName}`, tX + 8, tY + 8);
      }
    });
  }

  function renderTooltip() {
    if (!hoveredBlip || !activeTooltip) return;

    const tDist = radius * hoveredBlip.rFraction;
    const tX = centerX + Math.cos(hoveredBlip.angle) * tDist;
    const tY = centerY + Math.sin(hoveredBlip.angle) * tDist;

    activeTooltip.style.display = 'block';
    activeTooltip.style.left = `${tX + 16}px`;
    activeTooltip.style.top = `${tY - 20}px`;

    const badgeClass = hoveredBlip.type === 'threat' ? 'badge-danger' : (hoveredBlip.type === 'warning' ? 'badge-warn' : 'badge-safe');
    const badgeText = hoveredBlip.type === 'threat' ? '🚨 INTRUSION DETECTED' : (hoveredBlip.type === 'warning' ? '⚠️ ANOMALY WATCH' : '✅ CLEAN NODE');

    activeTooltip.innerHTML = `
      <div class="radar-tip-header">
        <span class="radar-tip-badge ${badgeClass}">${badgeText}</span>
        <strong>${hoveredBlip.ip}</strong>
      </div>
      <div class="radar-tip-body">
        <div><span>Host:</span> ${hoveredBlip.name}</div>
        <div><span>Ports:</span> ${hoveredBlip.ports}</div>
        <div><span>Flow Rate:</span> ${hoveredBlip.rate}</div>
        <div><span>AI Threat Risk:</span> <strong style="color:${hoveredBlip.type === 'threat' ? '#f87171' : '#34d399'}">${hoveredBlip.risk}</strong></div>
      </div>
    `;
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found = null;
    targets.forEach(target => {
      const tDist = radius * target.rFraction;
      const tX = centerX + Math.cos(target.angle) * tDist;
      const tY = centerY + Math.sin(target.angle) * tDist;
      const dist = Math.hypot(mouseX - tX, mouseY - tY);

      if (dist < 18) {
        found = target;
      }
    });

    hoveredBlip = found;
    if (!hoveredBlip && activeTooltip) {
      activeTooltip.style.display = 'none';
    } else if (hoveredBlip) {
      renderTooltip();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    drawGrid();
    drawSweep();
    drawTargets();

    // Advance sweep angle (~1.3 radians / sec)
    angle += 0.022;
    if (angle >= Math.PI * 2) angle -= Math.PI * 2;

    animId = requestAnimationFrame(animate);
  }

  function init() {
    canvas = document.getElementById('radar-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    if (!ctx) return;

    activeTooltip = document.getElementById('radar-tooltip');
    if (!activeTooltip) {
      activeTooltip = document.createElement('div');
      activeTooltip.id = 'radar-tooltip';
      activeTooltip.className = 'radar-tooltip';
      canvas.parentElement.style.position = 'relative';
      canvas.parentElement.appendChild(activeTooltip);
    }

    resize();
    window.addEventListener('resize', debounce(resize, 150));
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', () => {
      hoveredBlip = null;
      if (activeTooltip) activeTooltip.style.display = 'none';
    });

    // Filter controls
    document.querySelectorAll('.radar-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.radar-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeFilter = e.currentTarget.getAttribute('data-filter') || 'all';
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(animate);
      }
    });

    animId = requestAnimationFrame(animate);
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  window.injectRadarThreat = function (ip, threatName) {
    const newTarget = {
      id: Date.now(),
      ip: ip || '198.51.100.77',
      name: 'Dynamic Hacker Ingress',
      rFraction: 0.72 + Math.random() * 0.18,
      angle: (angle + Math.PI * 0.7) % (Math.PI * 2),
      type: 'threat',
      threatName: threatName || 'SYN Flood & Port Scan',
      ports: '400 SYNs on Port 80, 443',
      rate: '1,890 pkt/s',
      risk: '99.8%',
      lastPingTime: 0,
      pingRadius: 0
    };
    targets.push(newTarget);
    if (targets.length > 12) targets.splice(3, 1); // Maintain reasonable blip count
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

