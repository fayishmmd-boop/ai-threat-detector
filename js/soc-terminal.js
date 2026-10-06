/**
 * AI NIDS - Live SOC Packet Telemetry Terminal & Inspector
 * Real-time packet stream simulation, attack wave injection, and feature flow inspection
 */

(function () {
  'use strict';

  let isPlaying = true;
  let speedMultiplier = 1;
  let activeFilter = 'all'; // 'all' | 'tcp' | 'udp' | 'threats'
  let streamTimer = null;
  let packetHistory = [];
  const maxPackets = 40;

  // Live SOC counters
  let totalCount = 0;
  let normalCount = 0;
  let threatCount = 0;

  const normalIps = [
    { ip: '192.168.1.105', name: 'Workstation-A' },
    { ip: '192.168.1.112', name: 'Dev-Laptop' },
    { ip: '192.168.1.200', name: 'Office-Printer' },
    { ip: '10.0.0.15', name: 'Internal-API' },
    { ip: '142.250.190.46', name: 'Google-Cloud' },
    { ip: '151.101.65.140', name: 'CDN-Edge' },
    { ip: '1.1.1.1', name: 'Cloudflare-DNS' }
  ];

  const attackerIps = [
    '198.51.100.24',
    '203.0.113.88',
    '45.33.32.156',
    '185.220.101.5'
  ];

  function formatTime(d = new Date()) {
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }

  function generateRandomPacket(forceAttackType = null) {
    const isThreat = forceAttackType !== null || Math.random() < 0.12;
    const now = new Date();

    if (isThreat) {
      const type = forceAttackType || (Math.random() > 0.5 ? 'syn_flood' : 'port_scan');
      const srcIp = attackerIps[Math.floor(Math.random() * attackerIps.length)];
      const targetPort = type === 'syn_flood' ? 80 : Math.floor(Math.random() * 1024) + 1;
      
      let badge = '🚨 [SYN FLOOD]';
      let info = `TCP [SYN] seq=${Math.floor(Math.random()*900000)} win=1024`;
      let threatLabel = 'SYN Flood DoS Attack';
      let features = {
        duration: 0.2,
        src_bytes: 48000,
        dst_bytes: 0,
        packet_count: 850,
        connection_rate: 140,
        failed_conns: 28,
        unique_ports: 3,
        syn_packets: 450,
        confidence: '99.7%'
      };

      if (type === 'port_scan') {
        badge = '🟠 [PORT SCAN]';
        info = `TCP [SYN] probe port=${targetPort} (Nmap stealth)`;
        threatLabel = 'Reconnaissance Port Scan';
        features = {
          duration: 1.2,
          src_bytes: 14500,
          dst_bytes: 120,
          packet_count: 520,
          connection_rate: 90,
          failed_conns: 42,
          unique_ports: 95,
          syn_packets: 210,
          confidence: '97.2%'
        };
      } else if (type === 'data_exfil') {
        badge = '🟣 [DATA EXFIL]';
        info = `TCP [PSH, ACK] outbound high-volume payload chunk`;
        threatLabel = 'Data Exfiltration Anomaly';
        features = {
          duration: 15.0,
          src_bytes: 75000,
          dst_bytes: 400,
          packet_count: 1100,
          connection_rate: 18,
          failed_conns: 1,
          unique_ports: 1,
          syn_packets: 6,
          confidence: '94.8%'
        };
      }

      threatCount++;
      totalCount++;

      return {
        id: totalCount,
        time: formatTime(now),
        protocol: 'TCP',
        src: `${srcIp}:${Math.floor(Math.random() * 50000) + 1024}`,
        dst: `192.168.1.50:${targetPort}`,
        length: Math.floor(Math.random() * 500) + 64,
        info: info,
        status: 'threat',
        badge: badge,
        threatLabel: threatLabel,
        features: features
      };
    } else {
      // Normal safe packet
      const protocols = ['TCP', 'TCP', 'UDP', 'DNS', 'TLS'];
      const proto = protocols[Math.floor(Math.random() * protocols.length)];
      const srcObj = normalIps[Math.floor(Math.random() * 3)];
      const dstObj = normalIps[Math.floor(Math.random() * (normalIps.length - 3)) + 3];

      let info = '';
      let length = 64;
      let dstPort = 443;

      if (proto === 'TCP') {
        info = `TCP [ACK] seq=${Math.floor(Math.random()*80000)} ack=${Math.floor(Math.random()*80000)}`;
        length = Math.floor(Math.random() * 800) + 128;
      } else if (proto === 'TLS') {
        info = 'TLSv1.3 Application Data / HTTPS Encrypted';
        length = Math.floor(Math.random() * 1400) + 300;
      } else if (proto === 'DNS') {
        info = 'Standard query 0x1a4b A api.github.com';
        length = 78;
        dstPort = 53;
      } else {
        info = 'UDP Datagram payload transmission';
        length = 240;
        dstPort = 514;
      }

      normalCount++;
      totalCount++;

      return {
        id: totalCount,
        time: formatTime(now),
        protocol: proto,
        src: `${srcObj.ip}:${Math.floor(Math.random() * 40000) + 10000}`,
        dst: `${dstObj.ip}:${dstPort}`,
        length: length,
        info: info,
        status: 'normal',
        badge: '✅ [SAFE]',
        threatLabel: 'Normal Operational Flow',
        features: {
          duration: 4.8,
          src_bytes: 1200,
          dst_bytes: 2400,
          packet_count: 28,
          connection_rate: 3,
          failed_conns: 0,
          unique_ports: 2,
          syn_packets: 4,
          confidence: '99.9% Clean'
        }
      };
    }
  }

  function renderPacketRow(pkt) {
    const tr = document.createElement('tr');
    tr.className = `pkt-row pkt-${pkt.status}`;
    tr.dataset.packetId = pkt.id;

    // Filter check
    if (activeFilter === 'threats' && pkt.status !== 'threat') {
      tr.style.display = 'none';
    } else if (activeFilter === 'tcp' && pkt.protocol !== 'TCP') {
      tr.style.display = 'none';
    } else if (activeFilter === 'udp' && (pkt.protocol !== 'UDP' && pkt.protocol !== 'DNS')) {
      tr.style.display = 'none';
    }

    const protoClass = pkt.status === 'threat' ? 'tag-threat' : `tag-${pkt.protocol.toLowerCase()}`;
    const badgeClass = pkt.status === 'threat' ? 'status-threat' : 'status-safe';

    tr.innerHTML = `
      <td class="col-time">${pkt.time}</td>
      <td class="col-proto"><span class="proto-tag ${protoClass}">${pkt.protocol}</span></td>
      <td class="col-src">${pkt.src}</td>
      <td class="col-arrow">→</td>
      <td class="col-dst">${pkt.dst}</td>
      <td class="col-len">${pkt.length} B</td>
      <td class="col-info">${pkt.info}</td>
      <td class="col-badge"><span class="badge-pill ${badgeClass}">${pkt.badge}</span></td>
    `;

    tr.addEventListener('click', () => openPacketModal(pkt));
    return tr;
  }

  function appendPacket(pkt) {
    packetHistory.push(pkt);
    if (packetHistory.length > maxPackets) packetHistory.shift();

    const tbody = document.getElementById('soc-packet-body');
    if (!tbody) return;

    const row = renderPacketRow(pkt);
    tbody.appendChild(row);

    // Keep tbody pruned
    while (tbody.children.length > maxPackets) {
      tbody.removeChild(tbody.firstChild);
    }

    // Auto-scroll to bottom of terminal if user hasn't scrolled up
    const container = document.getElementById('soc-terminal-scroll');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }

    updateCounters();
  }

  function updateCounters() {
    const elTotal = document.getElementById('cnt-total');
    const elNormal = document.getElementById('cnt-normal');
    const elThreat = document.getElementById('cnt-threats');
    const elPps = document.getElementById('cnt-pps');

    if (elTotal) elTotal.innerText = totalCount.toLocaleString();
    if (elNormal) elNormal.innerText = normalCount.toLocaleString();
    if (elThreat) elThreat.innerText = threatCount.toLocaleString();
    if (elPps) elPps.innerText = Math.round(18 * speedMultiplier);
  }

  function tickStream() {
    if (!isPlaying) return;

    const pkt = generateRandomPacket();
    appendPacket(pkt);

    const baseDelay = 850 / speedMultiplier;
    const jitter = (Math.random() - 0.5) * 300;
    streamTimer = setTimeout(tickStream, Math.max(120, baseDelay + jitter));
  }

  function openPacketModal(pkt) {
    const modal = document.getElementById('packet-modal');
    if (!modal) return;

    const modalBody = document.getElementById('packet-modal-body');
    if (!modalBody) return;

    const isThreat = pkt.status === 'threat';
    const alertTheme = isThreat ? 'border-color: #ef4444;' : 'border-color: #10b981;';

    modalBody.innerHTML = `
      <div class="modal-header-banner" style="${alertTheme}">
        <div style="font-size:1.8rem;">${isThreat ? '🚨' : '🛡️'}</div>
        <div>
          <h3 style="color:${isThreat ? '#f87171' : '#34d399'}; font-size:1.25rem; font-family:'Outfit', sans-serif;">
            ${pkt.threatLabel}
          </h3>
          <p style="color:var(--text-muted); font-size:0.85rem; margin:0;">
            Flow: <code>${pkt.src}</code> ➔ <code>${pkt.dst}</code> &nbsp;|&nbsp; Captured at ${pkt.time}
          </p>
        </div>
      </div>

      <div class="modal-feature-grid">
        <h4 style="grid-column: 1 / -1; color:var(--accent-cyan); font-size:0.95rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
          📊 Extracted 8-Feature Telemetry Vector for this Flow:
        </h4>
        <div class="m-feat-item">
          <span class="m-label">duration:</span>
          <span class="m-val">${pkt.features.duration}s</span>
        </div>
        <div class="m-feat-item">
          <span class="m-label">src_bytes:</span>
          <span class="m-val">${pkt.features.src_bytes.toLocaleString()} B</span>
        </div>
        <div class="m-feat-item">
          <span class="m-label">dst_bytes:</span>
          <span class="m-val">${pkt.features.dst_bytes.toLocaleString()} B</span>
        </div>
        <div class="m-feat-item">
          <span class="m-label">packet_count:</span>
          <span class="m-val">${pkt.features.packet_count}</span>
        </div>
        <div class="m-feat-item">
          <span class="m-label">conn_rate:</span>
          <span class="m-val">${pkt.features.connection_rate}/s</span>
        </div>
        <div class="m-feat-item">
          <span class="m-label">failed_conns:</span>
          <span class="m-val">${pkt.features.failed_conns}</span>
        </div>
        <div class="m-feat-item">
          <span class="m-label">unique_ports:</span>
          <span class="m-val">${pkt.features.unique_ports}</span>
        </div>
        <div class="m-feat-item">
          <span class="m-label">syn_packets:</span>
          <span class="m-val">${pkt.features.syn_packets}</span>
        </div>
      </div>

      <div class="modal-ai-verdict" style="background:${isThreat ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; border:1px solid ${isThreat ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'};">
        <div style="font-weight:700; color:${isThreat ? '#f87171' : '#34d399'};">
          🧠 Random Forest Classifier Verdict:
        </div>
        <div style="font-size:0.9rem; margin-top:4px; color:var(--text);">
          Status: <strong>${pkt.badge}</strong> &nbsp;•&nbsp; Model Confidence: <strong>${pkt.features.confidence}</strong>
        </div>
        <div style="font-size:0.82rem; color:var(--text-muted); margin-top:6px;">
          ${isThreat ? 'Rule triggered: High SYN density & connection anomalies outside baseline.' : 'All 8 features correspond to benign HTTP/TLS user browsing behavior.'}
        </div>
      </div>

      <div class="modal-raw-hex">
        <div style="font-size:0.75rem; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Raw Scapy Decoded Packet Header</div>
        <code>0000  00 1a 2b 3c 4d 5e 00 11 22 33 44 55 08 00 45 00  ..+&lt;M^.."3DU..E.<br>
0010  00 3c 1a 2b 40 00 40 06 b8 61 c0 a8 01 69 c6 33  .&lt;+@.@..a...i.3<br>
0020  18 18 d4 31 00 50 72 3a 00 00 00 00 a0 02 72 10  ...1.Pr:......r.</code>
      </div>
    `;

    modal.classList.add('active');
  }

  function closeModal() {
    const modal = document.getElementById('packet-modal');
    if (modal) modal.classList.remove('active');
  }

  function injectAttackWave(type = 'syn_flood') {
    // Generate burst of 12 attack packets quickly
    let burstCount = 0;
    const burstTotal = 10;
    
    // Play cyber alert sound if available
    if (window.playCyberAudio) {
      window.playCyberAudio('alert');
    }

    // Flash terminal header
    const termHeader = document.querySelector('.soc-terminal-header');
    if (termHeader) {
      termHeader.classList.add('alarm-flash');
      setTimeout(() => termHeader.classList.remove('alarm-flash'), 1600);
    }

    // Add to Radar HUD as well
    if (window.injectRadarThreat) {
      const typeLabel = type === 'syn_flood' ? 'SYN Flood DoS Burst' : 'Massive Port Scan';
      window.injectRadarThreat('198.51.100.24', typeLabel);
    }

    function sendBurstPkt() {
      if (burstCount < burstTotal) {
        const p = generateRandomPacket(type);
        appendPacket(p);
        burstCount++;
        setTimeout(sendBurstPkt, 110);
      }
    }

    sendBurstPkt();
  }

  function init() {
    const btnPause = document.getElementById('btn-soc-pause');
    const btnAttackSyn = document.getElementById('btn-soc-attack-syn');
    const btnAttackScan = document.getElementById('btn-soc-attack-scan');
    const btnClear = document.getElementById('btn-soc-clear');
    const modalClose = document.getElementById('packet-modal-close');
    const modalBackdrop = document.getElementById('packet-modal-backdrop');

    if (btnPause) {
      btnPause.addEventListener('click', () => {
        isPlaying = !isPlaying;
        btnPause.innerHTML = isPlaying ? '⏸️ Pause Stream' : '▶️ Resume Stream';
        btnPause.classList.toggle('btn-paused', !isPlaying);
        if (isPlaying) tickStream();
        else if (streamTimer) clearTimeout(streamTimer);
      });
    }

    if (btnAttackSyn) {
      btnAttackSyn.addEventListener('click', () => injectAttackWave('syn_flood'));
    }

    if (btnAttackScan) {
      btnAttackScan.addEventListener('click', () => injectAttackWave('port_scan'));
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        const tbody = document.getElementById('soc-packet-body');
        if (tbody) tbody.innerHTML = '';
        packetHistory = [];
      });
    }

    // Speed buttons
    document.querySelectorAll('.soc-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.soc-speed-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        speedMultiplier = parseFloat(e.currentTarget.getAttribute('data-speed') || 1);
        updateCounters();
      });
    });

    // Filter buttons
    document.querySelectorAll('.soc-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.soc-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeFilter = e.currentTarget.getAttribute('data-filter') || 'all';

        // Re-filter visible rows
        document.querySelectorAll('.pkt-row').forEach(row => {
          const isThreat = row.classList.contains('pkt-threat');
          const isTcp = row.querySelector('.tag-tcp') !== null;
          const isUdp = row.querySelector('.tag-udp') !== null || row.querySelector('.tag-dns') !== null;

          if (activeFilter === 'threats') {
            row.style.display = isThreat ? '' : 'none';
          } else if (activeFilter === 'tcp') {
            row.style.display = isTcp ? '' : 'none';
          } else if (activeFilter === 'udp') {
            row.style.display = isUdp ? '' : 'none';
          } else {
            row.style.display = '';
          }
        });
      });
    });

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    // Initial packet history seed (5 packets)
    for (let i = 0; i < 6; i++) {
      const p = generateRandomPacket();
      appendPacket(p);
    }

    // Start streaming loop
    tickStream();
  }

  window.injectSocAttack = injectAttackWave;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

