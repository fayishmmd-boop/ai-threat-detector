/**
 * AI NIDS - Advanced Threat Detection Simulator
 * Interactive sliders, 5 attack presets, feature weight breakdown, and live attack burst simulation
 */

(function () {
  'use strict';

  let isSimRunning = false;
  let simAnimFrame = null;

  // Preset definitions
  const presets = {
    normal: {
      duration: 5.0,
      src_bytes: 1000,
      dst_bytes: 2000,
      packet_count: 30,
      conn_rate: 3,
      failed_conns: 0,
      ports: 2,
      syn: 5,
      name: 'Normal Web Browsing',
      desc: 'Typical HTTP/HTTPS web session with clean two-way handshake.'
    },
    attack: {
      duration: 0.8,
      src_bytes: 52000,
      dst_bytes: 60,
      packet_count: 750,
      conn_rate: 110,
      failed_conns: 32,
      ports: 85,
      syn: 420,
      name: 'SYN Flood & Port Scan',
      desc: 'High-intensity multi-vector attack knocking on 85 doors.'
    },
    syn_flood: {
      duration: 0.5,
      src_bytes: 45000,
      dst_bytes: 0,
      packet_count: 980,
      conn_rate: 150,
      failed_conns: 25,
      ports: 2,
      syn: 600,
      name: 'Pure TCP SYN Flood DoS',
      desc: 'Hundreds of unacknowledged SYN packets suffocating connection table.'
    },
    port_scan: {
      duration: 2.0,
      src_bytes: 12500,
      dst_bytes: 150,
      packet_count: 420,
      conn_rate: 80,
      failed_conns: 40,
      ports: 120,
      syn: 160,
      name: 'Nmap Horizontal Port Scan',
      desc: 'Rapid reconnaissance probing 120 distinct service ports.'
    },
    data_exfil: {
      duration: 18.0,
      src_bytes: 75000,
      dst_bytes: 350,
      packet_count: 1250,
      conn_rate: 15,
      failed_conns: 1,
      ports: 1,
      syn: 6,
      name: 'Data Exfiltration Spike',
      desc: 'Abnormal unidirectional outbound data transfer anomaly.'
    },
    slowloris: {
      duration: 28.0,
      src_bytes: 3200,
      dst_bytes: 500,
      packet_count: 160,
      conn_rate: 35,
      failed_conns: 18,
      ports: 15,
      syn: 70,
      name: 'Slowloris / Low & Slow DoS',
      desc: 'Long duration, persistent connection starvation.'
    }
  };

  function getSliderValues() {
    return {
      duration: parseFloat(document.getElementById('sl-duration')?.value || 5),
      src_bytes: parseInt(document.getElementById('sl-src_bytes')?.value || 1000, 10),
      dst_bytes: parseInt(document.getElementById('sl-dst_bytes')?.value || 2000, 10),
      packet_count: parseInt(document.getElementById('sl-packet_count')?.value || 30, 10),
      conn_rate: parseInt(document.getElementById('sl-conn_rate')?.value || 3, 10),
      failed_conns: parseInt(document.getElementById('sl-failed_conns')?.value || 0, 10),
      ports: parseInt(document.getElementById('sl-ports')?.value || 2, 10),
      syn: parseInt(document.getElementById('sl-syn')?.value || 5, 10)
    };
  }

  function setSliderValues(vals) {
    if (vals.duration !== undefined && document.getElementById('sl-duration'))
      document.getElementById('sl-duration').value = vals.duration;
    if (vals.src_bytes !== undefined && document.getElementById('sl-src_bytes'))
      document.getElementById('sl-src_bytes').value = vals.src_bytes;
    if (vals.dst_bytes !== undefined && document.getElementById('sl-dst_bytes'))
      document.getElementById('sl-dst_bytes').value = vals.dst_bytes;
    if (vals.packet_count !== undefined && document.getElementById('sl-packet_count'))
      document.getElementById('sl-packet_count').value = vals.packet_count;
    if (vals.conn_rate !== undefined && document.getElementById('sl-conn_rate'))
      document.getElementById('sl-conn_rate').value = vals.conn_rate;
    if (vals.failed_conns !== undefined && document.getElementById('sl-failed_conns'))
      document.getElementById('sl-failed_conns').value = vals.failed_conns;
    if (vals.ports !== undefined && document.getElementById('sl-ports'))
      document.getElementById('sl-ports').value = vals.ports;
    if (vals.syn !== undefined && document.getElementById('sl-syn'))
      document.getElementById('sl-syn').value = vals.syn;
  }

  function updateSim() {
    const vals = getSliderValues();

    // Update numeric labels
    const setLabel = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.innerText = txt;
    };

    setLabel('val-duration', vals.duration);
    setLabel('val-src_bytes', vals.src_bytes.toLocaleString());
    setLabel('val-dst_bytes', vals.dst_bytes.toLocaleString());
    setLabel('val-packet_count', vals.packet_count.toLocaleString());
    setLabel('val-conn_rate', vals.conn_rate);
    setLabel('val-failed_conns', vals.failed_conns);
    setLabel('val-ports', vals.ports);
    setLabel('val-syn', vals.syn);

    // Realistic Multi-Feature AI Classifier Scoring
    let threatScore = 0;
    const contributions = [];

    // SYN Packet analysis
    if (vals.syn > 200) {
      threatScore += 35;
      contributions.push({ name: 'SYN Packet Density', pts: 35, alert: true });
    } else if (vals.syn > 50) {
      threatScore += 18;
      contributions.push({ name: 'SYN Packet Volume', pts: 18, alert: false });
    }

    // Unique Ports (Reconnaissance)
    if (vals.ports > 40) {
      threatScore += 30;
      contributions.push({ name: 'Port Scan Breadth', pts: 30, alert: true });
    } else if (vals.ports > 10) {
      threatScore += 15;
      contributions.push({ name: 'Multi-port Probing', pts: 15, alert: false });
    }

    // Failed connections
    if (vals.failed_conns > 15) {
      threatScore += 20;
      contributions.push({ name: 'Connection Rejections', pts: 20, alert: true });
    } else if (vals.failed_conns > 3) {
      threatScore += 10;
      contributions.push({ name: 'Handshake Failures', pts: 10, alert: false });
    }

    // Connection rate
    if (vals.conn_rate > 60) {
      threatScore += 18;
      contributions.push({ name: 'Connection Velocity', pts: 18, alert: true });
    } else if (vals.conn_rate > 20) {
      threatScore += 8;
      contributions.push({ name: 'Elevated Conn Rate', pts: 8, alert: false });
    }

    // Unbalanced payload (Exfiltration or Flood)
    if (vals.src_bytes > 35000 && vals.dst_bytes < 600) {
      threatScore += 25;
      contributions.push({ name: 'Asymmetric Byte Ratio', pts: 25, alert: true });
    } else if (vals.src_bytes > 50000) {
      threatScore += 15;
      contributions.push({ name: 'Heavy Outbound Payload', pts: 15, alert: false });
    }

    // Fast burst packet density
    if (vals.duration < 1.5 && vals.packet_count > 300) {
      threatScore += 22;
      contributions.push({ name: 'Microburst Velocity', pts: 22, alert: true });
    }

    // Clamp 0 - 100
    threatScore = Math.min(100, Math.max(0, threatScore));

    const attackProb = threatScore;
    const normalProb = 100 - threatScore;

    // Update gauge elements
    const lblAtt = document.getElementById('lbl-prob-att');
    const lblNorm = document.getElementById('lbl-prob-norm');
    const gaugeFill = document.getElementById('gauge-fill');
    const box = document.getElementById('gauge-box');
    const icon = document.getElementById('gauge-icon');
    const verdict = document.getElementById('gauge-verdict');
    const sub = document.getElementById('gauge-sub');

    if (lblAtt) lblAtt.innerText = attackProb.toFixed(1) + '%';
    if (lblNorm) lblNorm.innerText = normalProb.toFixed(1) + '%';
    if (gaugeFill) gaugeFill.style.width = attackProb + '%';

    if (box && icon && verdict && sub) {
      if (attackProb >= 50) {
        box.className = 'gauge-card attack';
        icon.innerText = '🚨';
        verdict.innerText = 'ALERT: INTRUSION DETECTED!';
        sub.innerText = 'High risk: SYN flood, port scan or rapid anomaly suspected!';
      } else {
        box.className = 'gauge-card normal';
        icon.innerText = '🛡️';
        verdict.innerText = 'TRAFFIC IS NORMAL';
        sub.innerText = 'All network telemetry metrics are within safe operational baselines.';
      }
    }

    // Render Feature Contribution Breakdown Bars
    renderFeatureBreakdown(contributions, attackProb);
  }

  function renderFeatureBreakdown(contributions, totalScore) {
    let container = document.getElementById('sim-feature-breakdown');
    if (!container) {
      // Create dynamically under simulator controls if not in HTML yet
      const simGrid = document.querySelector('.sim-grid');
      if (!simGrid) return;

      const breakdownCard = document.createElement('div');
      breakdownCard.id = 'sim-breakdown-card';
      breakdownCard.className = 'sim-breakdown-card';
      breakdownCard.innerHTML = `
        <h4 style="font-family:'Outfit'; font-size:1.1rem; color:#fff; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <span>🔍 AI Feature Impact Breakdown</span>
          <span style="font-size:0.8rem; color:var(--text-muted); font-weight:400;">Decision Trees Weight</span>
        </h4>
        <div id="sim-feature-breakdown" class="breakdown-list"></div>
      `;
      simGrid.parentElement.appendChild(breakdownCard);
      container = document.getElementById('sim-feature-breakdown');
    }

    if (!container) return;

    if (contributions.length === 0) {
      container.innerHTML = `
        <div style="font-size:0.88rem; color:var(--accent-green); padding:8px 0;">
          ✅ All 8 network features are aligned with normal benign traffic. 0 anomaly flags raised.
        </div>
      `;
      return;
    }

    container.innerHTML = contributions.map(c => `
      <div class="breakdown-item">
        <div class="breakdown-meta">
          <span class="breakdown-name">${c.alert ? '🚨' : '⚡'} ${c.name}</span>
          <span class="breakdown-val" style="color:${c.alert ? '#f87171' : '#fbbf24'}">+${c.pts}% risk</span>
        </div>
        <div class="breakdown-bar-bg">
          <div class="breakdown-bar-fill" style="width:${(c.pts / 35) * 100}%; background:${c.alert ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #06b6d4, #10b981)'};"></div>
        </div>
      </div>
    `).join('');
  }

  function loadPreset(type) {
    if (isSimRunning) stopLiveAttackSim();

    const p = presets[type];
    if (!p) return;

    setSliderValues(p);
    updateSim();

    // Sound effect
    if (window.playCyberAudio) {
      window.playCyberAudio(type === 'normal' ? 'success' : 'alert');
    }

    // Active button styling
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === type);
    });
  }

  /**
   * Smoothly animates sliders from current state to target state over duration ms
   */
  function animateSlidersTo(targetVals, durationMs, onComplete) {
    const startVals = getSliderValues();
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease in-out cubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const current = {};
      for (const key in targetVals) {
        current[key] = startVals[key] + (targetVals[key] - startVals[key]) * ease;
      }

      setSliderValues(current);
      updateSim();

      if (progress < 1) {
        simAnimFrame = requestAnimationFrame(step);
      } else {
        simAnimFrame = null;
        if (onComplete) onComplete();
      }
    }

    simAnimFrame = requestAnimationFrame(step);
  }

  function runLiveAttackSim() {
    if (isSimRunning) {
      stopLiveAttackSim();
      return;
    }

    isSimRunning = true;
    const btn = document.getElementById('btn-run-live-attack');
    if (btn) {
      btn.innerHTML = '⏹️ Cancel Attack Sim';
      btn.classList.add('sim-active');
    }

    // 1. Reset to normal first
    setSliderValues(presets.normal);
    updateSim();

    // 2. Animate to SYN Flood Attack in 2.2 seconds
    setTimeout(() => {
      if (!isSimRunning) return;
      if (window.playCyberAudio) window.playCyberAudio('alert');

      animateSlidersTo(presets.attack, 2200, () => {
        // Hold attack for 2.5 seconds, then AI automatically activates mitigation!
        setTimeout(() => {
          if (!isSimRunning) return;

          // Flash mitigation notice
          const verdict = document.getElementById('gauge-verdict');
          if (verdict) {
            verdict.innerText = '🛡️ MITIGATION ACTIVE: DROPPING PACKETS...';
          }

          // 4. Smoothly recover back to normal safe baseline in 2.5 seconds
          animateSlidersTo(presets.normal, 2500, () => {
            stopLiveAttackSim();
            if (window.playCyberAudio) window.playCyberAudio('success');
          });
        }, 2200);
      });
    }, 400);
  }

  function stopLiveAttackSim() {
    isSimRunning = false;
    if (simAnimFrame) {
      cancelAnimationFrame(simAnimFrame);
      simAnimFrame = null;
    }
    const btn = document.getElementById('btn-run-live-attack');
    if (btn) {
      btn.innerHTML = '⚡ Run Live Attack & Defense Sim (8s)';
      btn.classList.remove('sim-active');
    }
  }

  function init() {
    // Attach listener to all sliders
    const sliderIds = [
      'sl-duration', 'sl-src_bytes', 'sl-dst_bytes', 'sl-packet_count',
      'sl-conn_rate', 'sl-failed_conns', 'sl-ports', 'sl-syn'
    ];

    sliderIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (isSimRunning) stopLiveAttackSim();
          updateSim();
        });
      }
    });

    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-preset');
        loadPreset(type);
      });
    });

    const btnLive = document.getElementById('btn-run-live-attack');
    if (btnLive) {
      btnLive.addEventListener('click', runLiveAttackSim);
    }

    // Expose global functions for backward compatibility with existing onclick handlers
    window.updateSim = updateSim;
    window.loadPreset = loadPreset;
    window.runLiveAttackSim = runLiveAttackSim;

    // Run initial calculate
    updateSim();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

