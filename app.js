/* ================================================================
   TITANIUM HARDWARE SHOWCASE — 4-PRODUCT 3D CANVAS ENGINES
   ================================================================ */

(() => {
  'use strict';

  /* --------------------------------------------------------
     CONFIGURATION & CONSTANTS
     -------------------------------------------------------- */
  const FRAME_COUNT = 192;
  const PHONE_NAT_W = 1280, PHONE_NAT_H = 720;
  const TAB_NAT_W = 1920, TAB_NAT_H = 1080;
  const WATCH_NAT_W = 1920, WATCH_NAT_H = 1080;
  const BUDS_NAT_W = 1920, BUDS_NAT_H = 1080;

  function pad3(n) {
    return String(n).padStart(3, '0');
  }

  /* --------------------------------------------------------
     DOM ELEMENTS
     -------------------------------------------------------- */
  // Canvases
  const canvasPhone = document.getElementById('canvasPhone');
  const ctxPhone = canvasPhone ? canvasPhone.getContext('2d') : null;
  const wrapPhone = document.getElementById('canvasWrapPhone');

  const canvasTab = document.getElementById('canvasTab');
  const ctxTab = canvasTab ? canvasTab.getContext('2d') : null;
  const wrapTab = document.getElementById('canvasWrapTab');

  const canvasWatch = document.getElementById('canvasWatch');
  const ctxWatch = canvasWatch ? canvasWatch.getContext('2d') : null;
  const wrapWatch = document.getElementById('canvasWrapWatch');

  const canvasBuds = document.getElementById('canvasBuds');
  const ctxBuds = canvasBuds ? canvasBuds.getContext('2d') : null;
  const wrapBuds = document.getElementById('canvasWrapBuds');

  // Hotspots
  const pinsPhone = document.querySelectorAll('#hotspotsPhone .hotspot-pin');
  const pinsTab = document.querySelectorAll('#hotspotsTab .hotspot-pin');
  const pinsWatch = document.querySelectorAll('#hotspotsWatch .hotspot-pin');
  const pinsBuds = document.querySelectorAll('#hotspotsBuds .hotspot-pin');

  // Switcher Buttons
  const btnSwitchPhone = document.getElementById('btnSwitchPhone');
  const btnSwitchTab = document.getElementById('btnSwitchTab');
  const btnSwitchWatch = document.getElementById('btnSwitchWatch');
  const btnSwitchBuds = document.getElementById('btnSwitchBuds');

  /* --------------------------------------------------------
     PRELOADING QUAD PIPELINES (SMART TIERED STREAMING)
     -------------------------------------------------------- */
  const imgsPhone = new Array(FRAME_COUNT);
  const imgsTab = new Array(FRAME_COUNT);
  const imgsWatch = new Array(FRAME_COUNT);
  const imgsBuds = new Array(FRAME_COUNT);

  function getLoadedFrame(targetArray, idx) {
    if (targetArray[idx] && targetArray[idx].complete && targetArray[idx].naturalWidth > 0) {
      return targetArray[idx];
    }
    // Search outwards for nearest loaded frame
    for (let delta = 1; delta < FRAME_COUNT; delta++) {
      const prev = idx - delta;
      if (prev >= 0 && targetArray[prev] && targetArray[prev].complete && targetArray[prev].naturalWidth > 0) {
        return targetArray[prev];
      }
      const next = idx + delta;
      if (next < FRAME_COUNT && targetArray[next] && targetArray[next].complete && targetArray[next].naturalWidth > 0) {
        return targetArray[next];
      }
    }
    return targetArray[0] && targetArray[0].complete ? targetArray[0] : null;
  }

  function preloadPipelineSmart(folder, targetArray, drawFirstFrame) {
    // Tier 1: Hero Frame 1 (Instant Render < 100ms)
    const img1 = new Image();
    img1.src = `${folder}/ezgif-frame-001.jpg`;
    img1.onload = () => { if (drawFirstFrame) drawFirstFrame(); };
    targetArray[0] = img1;

    // Tier 2: Keyframes (Every 4th frame for instant scrub responsiveness)
    const keyframes = [];
    const inBetween = [];
    for (let i = 1; i < FRAME_COUNT; i++) {
      if (i % 4 === 0 || i === FRAME_COUNT - 1) {
        keyframes.push(i);
      } else {
        inBetween.push(i);
      }
    }

    keyframes.forEach((i) => {
      const img = new Image();
      img.src = `${folder}/ezgif-frame-${pad3(i + 1)}.jpg`;
      targetArray[i] = img;
    });

    // Tier 3: Staggered micro-batches for in-between frames during browser idle time
    setTimeout(() => {
      let bIdx = 0;
      function loadBatch() {
        const end = Math.min(inBetween.length, bIdx + 8);
        for (let j = bIdx; j < end; j++) {
          const i = inBetween[j];
          if (!targetArray[i]) {
            const img = new Image();
            img.src = `${folder}/ezgif-frame-${pad3(i + 1)}.jpg`;
            targetArray[i] = img;
          }
        }
        bIdx = end;
        if (bIdx < inBetween.length) {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadBatch);
          } else {
            setTimeout(loadBatch, 40);
          }
        }
      }
      loadBatch();
    }, 120);
  }

  // Start smart tiered streaming across all 4 products
  preloadPipelineSmart('frame', imgsPhone, () => { if (typeof redrawPhone === 'function') redrawPhone(); });
  preloadPipelineSmart('frame_tab', imgsTab, () => { if (typeof redrawTab === 'function') redrawTab(); });
  preloadPipelineSmart('frame_watch', imgsWatch, () => { if (typeof redrawWatch === 'function') redrawWatch(); });
  preloadPipelineSmart('frame_buds', imgsBuds, () => { if (typeof redrawBuds === 'function') redrawBuds(); });

  let redrawPhone, redrawTab, redrawWatch, redrawBuds;

  // Initialize Showcase Engine Immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllEngines);
  } else {
    initAllEngines();
  }

  /* --------------------------------------------------------
     CORE ENGINE INITIALIZATION
     -------------------------------------------------------- */
  function initAllEngines() {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    let targetF_Phone = 0, currentF_Phone = 0, lastDrawn_Phone = -1;
    let targetF_Tab = 0, currentF_Tab = 0, lastDrawn_Tab = -1;
    let targetF_Watch = 0, currentF_Watch = 0, lastDrawn_Watch = -1;
    let targetF_Buds = 0, currentF_Buds = 0, lastDrawn_Buds = -1;

    let logW_P = 0, logH_P = 0;
    let logW_T = 0, logH_T = 0;
    let logW_W = 0, logH_W = 0;
    let logW_B = 0, logH_B = 0;

    /* --------------------------------------------------------
       CANVAS RESIZING (HiDPI)
       -------------------------------------------------------- */
    function sizeCanvases() {
      const dpr = Math.min(devicePixelRatio || 1, 2);

      // Phone
      if (canvasPhone) {
        const rP = canvasPhone.getBoundingClientRect();
        logW_P = rP.width || innerWidth;
        logH_P = rP.height || innerHeight;
        canvasPhone.width = Math.round(logW_P * dpr);
        canvasPhone.height = Math.round(logH_P * dpr);
        ctxPhone.setTransform(1, 0, 0, 1, 0, 0);
        ctxPhone.scale(dpr, dpr);
        drawPhone(Math.round(currentF_Phone), true);
      }

      // Tab
      if (canvasTab) {
        const rT = canvasTab.getBoundingClientRect();
        logW_T = rT.width || innerWidth;
        logH_T = rT.height || innerHeight;
        canvasTab.width = Math.round(logW_T * dpr);
        canvasTab.height = Math.round(logH_T * dpr);
        ctxTab.setTransform(1, 0, 0, 1, 0, 0);
        ctxTab.scale(dpr, dpr);
        drawTab(Math.round(currentF_Tab), true);
      }

      // Watch
      if (canvasWatch) {
        const rW = canvasWatch.getBoundingClientRect();
        logW_W = rW.width || innerWidth;
        logH_W = rW.height || innerHeight;
        canvasWatch.width = Math.round(logW_W * dpr);
        canvasWatch.height = Math.round(logH_W * dpr);
        ctxWatch.setTransform(1, 0, 0, 1, 0, 0);
        ctxWatch.scale(dpr, dpr);
        drawWatch(Math.round(currentF_Watch), true);
      }

      // Buds
      if (canvasBuds) {
        const rB = canvasBuds.getBoundingClientRect();
        logW_B = rB.width || innerWidth;
        logH_B = rB.height || innerHeight;
        canvasBuds.width = Math.round(logW_B * dpr);
        canvasBuds.height = Math.round(logH_B * dpr);
        ctxBuds.setTransform(1, 0, 0, 1, 0, 0);
        ctxBuds.scale(dpr, dpr);
        drawBuds(Math.round(currentF_Buds), true);
      }
    }

    /* --------------------------------------------------------
       DRAW FUNCTIONS (WITH NEAREST-FRAME FALLBACK)
       -------------------------------------------------------- */
    function drawPhone(idx, force) {
      if (!ctxPhone) return;
      idx = Math.max(0, Math.min(FRAME_COUNT - 1, idx));
      if (idx === lastDrawn_Phone && !force) return;
      const img = getLoadedFrame(imgsPhone, idx);
      if (!img) return;

      ctxPhone.fillStyle = '#dcdee0';
      ctxPhone.fillRect(0, 0, logW_P, logH_P);

      const imgR = PHONE_NAT_W / PHONE_NAT_H;
      const canR = logW_P / logH_P;
      let dw, dh;
      if (canR > imgR) { dw = logW_P; dh = logW_P / imgR; }
      else { dh = logH_P; dw = logH_P * imgR; }

      if (innerWidth < 768) { dw *= 1.3; dh *= 1.3; }

      const ox = (logW_P - dw) / 2;
      const oy = (logH_P - dh) / 2;
      ctxPhone.imageSmoothingEnabled = true;
      ctxPhone.imageSmoothingQuality = 'high';
      ctxPhone.drawImage(img, ox, oy, dw, dh);
      lastDrawn_Phone = idx;
    }

    function drawTab(idx, force) {
      if (!ctxTab) return;
      idx = Math.max(0, Math.min(FRAME_COUNT - 1, idx));
      if (idx === lastDrawn_Tab && !force) return;
      const img = getLoadedFrame(imgsTab, idx);
      if (!img) return;

      ctxTab.fillStyle = '#dcdee0';
      ctxTab.fillRect(0, 0, logW_T, logH_T);

      const imgR = TAB_NAT_W / TAB_NAT_H;
      const canR = logW_T / logH_T;
      let dw, dh;
      if (canR > imgR) { dw = logW_T; dh = logW_T / imgR; }
      else { dh = logH_T; dw = logH_T * imgR; }

      if (innerWidth < 768) { dw *= 1.35; dh *= 1.35; }

      const ox = (logW_T - dw) / 2;
      const oy = (logH_T - dh) / 2;
      ctxTab.imageSmoothingEnabled = true;
      ctxTab.imageSmoothingQuality = 'high';
      ctxTab.drawImage(img, ox, oy, dw, dh);
      lastDrawn_Tab = idx;
    }

    function drawWatch(idx, force) {
      if (!ctxWatch) return;
      idx = Math.max(0, Math.min(FRAME_COUNT - 1, idx));
      if (idx === lastDrawn_Watch && !force) return;
      const img = getLoadedFrame(imgsWatch, idx);
      if (!img) return;

      ctxWatch.fillStyle = '#dcdee0';
      ctxWatch.fillRect(0, 0, logW_W, logH_W);

      const imgR = WATCH_NAT_W / WATCH_NAT_H;
      const canR = logW_W / logH_W;
      let dw, dh;
      if (canR > imgR) { dw = logW_W; dh = logW_W / imgR; }
      else { dh = logH_W; dw = logH_W * imgR; }

      if (innerWidth < 768) { dw *= 1.25; dh *= 1.25; }

      const ox = (logW_W - dw) / 2;
      const oy = (logH_W - dh) / 2;
      ctxWatch.imageSmoothingEnabled = true;
      ctxWatch.imageSmoothingQuality = 'high';
      ctxWatch.drawImage(img, ox, oy, dw, dh);
      lastDrawn_Watch = idx;
    }

    function drawBuds(idx, force) {
      if (!ctxBuds) return;
      idx = Math.max(0, Math.min(FRAME_COUNT - 1, idx));
      if (idx === lastDrawn_Buds && !force) return;
      const img = getLoadedFrame(imgsBuds, idx);
      if (!img) return;

      ctxBuds.fillStyle = '#dcdee0';
      ctxBuds.fillRect(0, 0, logW_B, logH_B);

      const imgR = BUDS_NAT_W / BUDS_NAT_H;
      const canR = logW_B / logH_B;
      let dw, dh;
      if (canR > imgR) { dw = logW_B; dh = logW_B / imgR; }
      else { dh = logH_B; dw = logH_B * imgR; }

      if (innerWidth < 768) { dw *= 1.2; dh *= 1.2; }

      const ox = (logW_B - dw) / 2;
      const oy = (logH_B - dh) / 2;
      ctxBuds.imageSmoothingEnabled = true;
      ctxBuds.imageSmoothingQuality = 'high';
      ctxBuds.drawImage(img, ox, oy, dw, dh);
      lastDrawn_Buds = idx;
    }

    redrawPhone = () => drawPhone(0, true);
    redrawTab = () => drawTab(0, true);
    redrawWatch = () => drawWatch(0, true);
    redrawBuds = () => drawBuds(0, true);

    /* --------------------------------------------------------
       UNIFIED 60FPS LERP LOOP
       -------------------------------------------------------- */
    function renderLoop() {
      const LERP = 0.16;

      // Phone
      const diffP = targetF_Phone - currentF_Phone;
      if (Math.abs(diffP) > 0.005) {
        const prevFrame = Math.round(currentF_Phone);
        currentF_Phone += diffP * LERP;
        const newFrame = Math.round(currentF_Phone);
        if (newFrame !== prevFrame) playHapticTick();
        drawPhone(newFrame);
        updateHotspots(pinsPhone, currentF_Phone);
      }

      // Tab
      const diffT = targetF_Tab - currentF_Tab;
      if (Math.abs(diffT) > 0.005) {
        const prevFrame = Math.round(currentF_Tab);
        currentF_Tab += diffT * LERP;
        const newFrame = Math.round(currentF_Tab);
        if (newFrame !== prevFrame) playHapticTick();
        drawTab(newFrame);
        updateHotspots(pinsTab, currentF_Tab);
      }

      // Watch
      const diffW = targetF_Watch - currentF_Watch;
      if (Math.abs(diffW) > 0.005) {
        const prevFrame = Math.round(currentF_Watch);
        currentF_Watch += diffW * LERP;
        const newFrame = Math.round(currentF_Watch);
        if (newFrame !== prevFrame) playHapticTick();
        drawWatch(newFrame);
        updateHotspots(pinsWatch, currentF_Watch);
      }

      // Buds
      const diffB = targetF_Buds - currentF_Buds;
      if (Math.abs(diffB) > 0.005) {
        const prevFrame = Math.round(currentF_Buds);
        currentF_Buds += diffB * LERP;
        const newFrame = Math.round(currentF_Buds);
        if (newFrame !== prevFrame) playHapticTick();
        drawBuds(newFrame);
        updateHotspots(pinsBuds, currentF_Buds);
      }

      requestAnimationFrame(renderLoop);
    }

    /* --------------------------------------------------------
       HOTSPOT TELEMETRY
       -------------------------------------------------------- */
    function updateHotspots(pins, currentF) {
      if (!pins) return;
      pins.forEach(pin => {
        const minF = +pin.dataset.minFrame;
        const maxF = +pin.dataset.maxFrame;
        const inRange = currentF >= minF && currentF <= maxF;
        pin.classList.toggle('active', inRange);
        if (!inRange) pin.classList.remove('card-open');
      });
    }

    const allPins = [...pinsPhone, ...pinsTab, ...pinsWatch, ...pinsBuds];
    allPins.forEach(pin => {
      const btn = pin.querySelector('.pin-beacon');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = pin.classList.contains('card-open');
          allPins.forEach(p => p.classList.remove('card-open'));
          if (!isOpen) pin.classList.add('card-open');
        });
      }
    });

    document.addEventListener('click', () => {
      allPins.forEach(p => p.classList.remove('card-open'));
    });

    /* --------------------------------------------------------
       STUDIO AUDIO HAPTICS (Web Audio API Synthesizer)
       -------------------------------------------------------- */
    let audioCtx = null;
    let isAudioActive = false;
    const btnAudio = document.getElementById('btnAudio');

    function playHapticTick(freq = 1500) {
      if (!isAudioActive) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.007);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.007);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.008);
      } catch (e) { }
    }

    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        isAudioActive = !isAudioActive;
        btnAudio.classList.toggle('active', isAudioActive);
        const label = btnAudio.querySelector('.audio-label');
        if (label) label.textContent = isAudioActive ? 'Haptics ON' : 'Haptics';
        if (isAudioActive) playHapticTick(2200);
      });
    }

    /* --------------------------------------------------------
       PRE-ORDER MODAL INTERACTION
       -------------------------------------------------------- */
    const btnPreOrder = document.getElementById('btnPreOrder');
    const preorderModal = document.getElementById('preorderModal');
    const modalClose = document.getElementById('modalClose');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const orderOptions = document.querySelectorAll('.order-opt');
    const btnCheckout = document.getElementById('btnCheckout');

    function openModal() {
      if (preorderModal) {
        preorderModal.classList.add('open');
        preorderModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        if (isAudioActive) playHapticTick(1800);
      }
    }

    function closeModal() {
      if (preorderModal) {
        preorderModal.classList.remove('open');
        preorderModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }

    if (btnPreOrder) {
      btnPreOrder.addEventListener('click', (e) => {
        if (isAudioActive) playHapticTick(2400);
      });
    }
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    orderOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        orderOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const radio = opt.querySelector('input');
        if (radio) radio.checked = true;
        if (isAudioActive) playHapticTick(1400);
      });
    });

    if (btnCheckout) {
      btnCheckout.addEventListener('click', () => {
        btnCheckout.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Redirecting to Samsung Store…</span>
        `;
        btnCheckout.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        if (isAudioActive) playHapticTick(2400);

        // Open Samsung official store in a new tab
        window.open('https://www.samsung.com', '_blank', 'noopener,noreferrer');

        setTimeout(() => {
          closeModal();
          setTimeout(() => {
            btnCheckout.innerHTML = `
              <span>Proceed to Secure Reservation</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            `;
            btnCheckout.style.background = '';
          }, 500);
        }, 1200);
      });
    }

    /* --------------------------------------------------------
       TURNTABLE 360° DRAG (All 4 Canvases)
       -------------------------------------------------------- */
    function bindTurntable(wrap, getTarget, setTarget) {
      if (!wrap) return;
      let isDragging = false;
      let startX = 0;
      let startF = 0;

      wrap.addEventListener('mousedown', (e) => {
        if (e.target.closest('.hotspot-pin')) return;
        isDragging = true;
        startX = e.clientX;
        startF = getTarget();
        wrap.classList.add('is-dragging');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const delta = (dx / innerWidth) * FRAME_COUNT * 0.9;
        setTarget(Math.max(0, Math.min(FRAME_COUNT - 1, startF - delta)));
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          wrap.classList.remove('is-dragging');
        }
      });

      // Touch
      wrap.addEventListener('touchstart', (e) => {
        if (e.target.closest('.hotspot-pin')) return;
        if (e.touches.length === 1) {
          isDragging = true;
          startX = e.touches[0].clientX;
          startF = getTarget();
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const delta = (dx / innerWidth) * FRAME_COUNT * 0.9;
        setTarget(Math.max(0, Math.min(FRAME_COUNT - 1, startF - delta)));
      }, { passive: true });

      window.addEventListener('touchend', () => { isDragging = false; });
    }

    bindTurntable(wrapPhone, () => targetF_Phone, v => { targetF_Phone = v; });
    bindTurntable(wrapTab, () => targetF_Tab, v => { targetF_Tab = Math.max(0, Math.min(155, v)); });
    bindTurntable(wrapWatch, () => targetF_Watch, v => { targetF_Watch = v; });
    bindTurntable(wrapBuds, () => targetF_Buds, v => { targetF_Buds = v; });

    /* --------------------------------------------------------
       DYNAMIC CURSOR SPOTLIGHT
       -------------------------------------------------------- */
    [wrapPhone, wrapTab, wrapWatch, wrapBuds].forEach(wrap => {
      if (wrap) {
        wrap.addEventListener('mousemove', (e) => {
          const r = wrap.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          wrap.style.setProperty('--mouse-x', `${x.toFixed(1)}%`);
          wrap.style.setProperty('--mouse-y', `${y.toFixed(1)}%`);
        });
      }
    });

    /* --------------------------------------------------------
       ODOMETER NUMBER COUNTER ANIMATOR
       -------------------------------------------------------- */
    function animateOdometer(el) {
      if (el.dataset.animated === 'true') return;
      el.dataset.animated = 'true';
      const target = parseFloat(el.dataset.target) || 0;
      const decimals = parseInt(el.dataset.decimals) || 0;
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const obj = { val: 0 };

      gsap.to(obj, {
        val: target,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = `${prefix}${obj.val.toFixed(decimals)}${suffix}`;
        }
      });
    }

    function initOdometers() {
      document.querySelectorAll('.odometer').forEach(el => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          onEnter: () => animateOdometer(el)
        });
      });
    }

    /* --------------------------------------------------------
       3D BENTO PERSPECTIVE TILT
       -------------------------------------------------------- */
    document.querySelectorAll('.spec-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const centerX = r.width / 2;
        const centerY = r.height / 2;
        const rotateX = ((e.clientY - r.top - centerY) / centerY) * -10;
        const rotateY = ((e.clientX - r.left - centerX) / centerX) * 10;
        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });

    /* --------------------------------------------------------
       GSAP SCROLLTRIGGER PIPELINES
       -------------------------------------------------------- */
    function initScrollTriggers() {
      // 1. Phone Stage Scrollytelling
      if (document.getElementById('phoneStage')) {
        ScrollTrigger.create({
          trigger: '#phoneStage',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            targetF_Phone = self.progress * (FRAME_COUNT - 1);
          }
        });
      }

      // 2. Tab Stage Scrollytelling (Capped at frame 155 to stay in fully open exploded view)
      if (document.getElementById('tabStage')) {
        ScrollTrigger.create({
          trigger: '#tabStage',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            targetF_Tab = self.progress * 155;
          }
        });
      }

      // 3. Watch Stage Scrollytelling
      if (document.getElementById('watchStage')) {
        ScrollTrigger.create({
          trigger: '#watchStage',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            targetF_Watch = self.progress * (FRAME_COUNT - 1);
          }
        });
      }

      // 4. Buds Stage Scrollytelling
      if (document.getElementById('budsStage')) {
        ScrollTrigger.create({
          trigger: '#budsStage',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            targetF_Buds = self.progress * (FRAME_COUNT - 1);
          }
        });
      }

      // Phase Text Entrance & Exit Animations
      document.querySelectorAll('.phase').forEach(phase => {
        const card = phase.querySelector('.phase-card');
        if (!card) return;

        gsap.fromTo(card,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: phase,
              start: 'top 75%',
              end: 'bottom 25%',
              toggleActions: 'play reverse play reverse'
            }
          }
        );
      });

      // Navbar Active Switcher Sync
      const navButtons = {
        phone: btnSwitchPhone,
        tab: btnSwitchTab,
        watch: btnSwitchWatch,
        buds: btnSwitchBuds
      };

      function setActiveNav(stageKey) {
        Object.values(navButtons).forEach(btn => {
          if (btn) btn.classList.remove('active');
        });
        if (navButtons[stageKey]) {
          navButtons[stageKey].classList.add('active');
        }
      }

      // Smooth Click Scrolling for Nav Switcher & Brand
      const navLinks = [
        { btn: btnSwitchPhone, target: '#phoneStage', key: 'phone' },
        { btn: btnSwitchTab, target: '#tabStage', key: 'tab' },
        { btn: btnSwitchWatch, target: '#watchStage', key: 'watch' },
        { btn: btnSwitchBuds, target: '#budsStage', key: 'buds' }
      ];

      navLinks.forEach(({ btn, target, key }) => {
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav(key);
            if (isAudioActive) playHapticTick(1800);
            const el = document.querySelector(target);
            if (el) {
              gsap.to(window, {
                scrollTo: { y: el, offsetY: 0 },
                duration: 1.1,
                ease: 'power3.inOut'
              });
            }
          });
        }
      });

      const brandBtn = document.querySelector('.navbar-brand');
      if (brandBtn) {
        brandBtn.addEventListener('click', (e) => {
          e.preventDefault();
          setActiveNav('phone');
          if (isAudioActive) playHapticTick(2200);
          gsap.to(window, {
            scrollTo: { y: 0 },
            duration: 1.2,
            ease: 'power3.inOut'
          });
        });
      }

      if (document.getElementById('phoneStage')) {
        ScrollTrigger.create({
          trigger: '#phoneStage',
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => setActiveNav('phone'),
          onEnterBack: () => setActiveNav('phone')
        });
      }

      if (document.getElementById('tabStage')) {
        ScrollTrigger.create({
          trigger: '#tabStage',
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => setActiveNav('tab'),
          onEnterBack: () => setActiveNav('tab')
        });
      }

      if (document.getElementById('watchStage')) {
        ScrollTrigger.create({
          trigger: '#watchStage',
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => setActiveNav('watch'),
          onEnterBack: () => setActiveNav('watch')
        });
      }

      if (document.getElementById('budsStage')) {
        ScrollTrigger.create({
          trigger: '#budsStage',
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => setActiveNav('buds'),
          onEnterBack: () => setActiveNav('buds')
        });
      }
    }

    // Initialize layout, listeners, and loops
    sizeCanvases();
    window.addEventListener('resize', sizeCanvases);
    initScrollTriggers();
    initOdometers();
    renderLoop();
  }
})();
