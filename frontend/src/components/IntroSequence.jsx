import React, { useEffect, useRef, useState } from 'react';

const IntroSequence = ({ onFinish }) => {
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [showHero, setShowHero] = useState(false);

  useEffect(() => {
    // Inject animation elements
    const animContainer = document.createElement('div');
    animContainer.id = "anim-container";
    
    const panelTop = document.createElement('div');
    panelTop.className = "anim-panel top";
    
    const panelBottom = document.createElement('div');
    panelBottom.className = "anim-panel bottom";
    
    const cutLine = document.createElement('div');
    cutLine.className = "anim-cut-line";
    
    const flash = document.createElement('div');
    flash.className = "anim-flash";
    
    const canvas = document.createElement('canvas');
    canvas.id = "anim-canvas";
    
    const scissorsWrapper = document.createElement('div');
    scissorsWrapper.className = "anim-scissors-wrapper";
    scissorsWrapper.innerHTML = `
      <svg width="100%" height="100%" viewBox="-40 -30 140 60" style="overflow: visible; display: block;">
        <!-- Handles -->
        <path d="M 0 0 L -20 -12 M 0 0 L -20 12" stroke="#2a2a2a" stroke-width="8" stroke-linecap="round" fill="none"/>
        <!-- Finger Holes -->
        <circle cx="-28" cy="-12" r="10" fill="none" stroke="#FFD700" stroke-width="4"/>
        <circle cx="-28" cy="12" r="10" fill="none" stroke="#FFD700" stroke-width="4"/>
        
        <!-- Blades (Animated paths) -->
        <path class="blade-upper" stroke="#a0a0a0" stroke-width="10" stroke-linecap="round" fill="none" d="M -18 0 L 52 -10" />
        <path class="blade-upper-shine" stroke="#d0d0d0" stroke-width="3" stroke-linecap="round" fill="none" d="M -18 0 L 52 -10" />
        
        <path class="blade-lower" stroke="#a0a0a0" stroke-width="10" stroke-linecap="round" fill="none" d="M -18 0 L 52 10" />
        <path class="blade-lower-shine" stroke="#d0d0d0" stroke-width="3" stroke-linecap="round" fill="none" d="M -18 0 L 52 10" />
        
        <!-- Pivot -->
        <circle cx="0" cy="0" r="5" fill="#2a2a2a"/>
        <circle cx="0" cy="0" r="2" fill="#555"/>
      </svg>
    `;

    animContainer.appendChild(panelTop);
    animContainer.appendChild(panelBottom);
    animContainer.appendChild(cutLine);
    animContainer.appendChild(flash);
    animContainer.appendChild(canvas);
    animContainer.appendChild(scissorsWrapper);
    
    // Append to body so it overlays everything
    document.body.appendChild(animContainer);

    // Canvas Physics setup
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const colors = ['#FFD700', '#ffffff', '#1a1a1a'];

    function initParticles() {
      const numParticles = Math.floor(Math.random() * 21) + 60; // 60-80
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      for (let i = 0; i < numParticles; i++) {
        const isLeft = Math.random() > 0.5;
        particles.push({
          x: centerX + (Math.random() * 40 - 20),
          y: centerY + (Math.random() * 10 - 5),
          vx: (Math.random() * 15 + 5) * (isLeft ? -1 : 1), 
          vy: (Math.random() * -10 - 2),
          width: Math.random() * 16 + 4, 
          height: Math.random() * 5 + 3, 
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.4,
          alpha: 1
        });
      }
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      for (let p of particles) {
        if (p.alpha <= 0) continue;
        active = true;

        p.vy += 0.18; // Gravity
        p.vx *= 0.98; // Drag
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha -= 0.018; 

        if (p.alpha < 0) p.alpha = 0;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
        ctx.restore();
      }

      if (active) {
        animFrameRef.current = requestAnimationFrame(animateParticles);
      }
    }

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Timers tracking
    const timers = [];

    timers.push(setTimeout(() => {
      cutLine.classList.add('visible');
    }, 650));

    timers.push(setTimeout(() => {
      flash.classList.add('visible');
      initParticles();
      animateParticles();
      
      timers.push(setTimeout(() => {
        flash.classList.remove('visible');
      }, 50));
    }, 820));

    timers.push(setTimeout(() => {
      panelTop.classList.add('open');
      panelBottom.classList.add('open');
      cutLine.classList.remove('visible');
    }, 900));

    timers.push(setTimeout(() => {
      setShowHero(true);
    }, 1050));

    timers.push(setTimeout(() => {
      if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if(animContainer.parentNode) {
        animContainer.parentNode.removeChild(animContainer);
      }
    }, 2500));

    return () => {
      // Cleanup
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if(animContainer.parentNode) {
        animContainer.parentNode.removeChild(animContainer);
      }
    };
  }, []);

  const handleLetsGo = () => {
    onFinish();
  };

  return (
    <div className={`intro-container ${showHero ? 'visible' : ''}`} ref={containerRef}>
      <div className="badge">★ ★ BEST BARBER ★ ★</div>
      <h1>SHOBANA HAIR <span className="highlight">SALON</span></h1>
      <div className="tagline">Look sharp, stay sharp — we'll remind you when it's time.</div>
      <button className="book-now" onClick={handleLetsGo}>LET'S GO &rarr;</button>
    </div>
  );
};

export default IntroSequence;
