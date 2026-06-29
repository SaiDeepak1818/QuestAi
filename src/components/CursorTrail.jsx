import React, { useEffect, useRef } from 'react';

export function CursorTrail() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, radius: 130 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let particlesArray = [];
    
    const colors = [
      'rgba(37, 99, 235, 0.55)',   // Royal Blue
      'rgba(96, 165, 250, 0.55)',  // Light Blue
      'rgba(29, 78, 216, 0.55)',   // Deep Blue
      'rgba(147, 197, 253, 0.55)', // Soft Ice Blue
      'rgba(2, 132, 199, 0.55)'    // Sky Blue
    ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.size = Math.random() * 2.2 + 0.8;
        this.density = (Math.random() * 35) + 12;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // Slight organic drifting speed
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = (Math.random() - 0.5) * 0.25;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        // Base drift
        this.baseX += this.vx;
        this.baseY += this.vy;

        // Wrap around bounds
        if (this.baseX < 0 || this.baseX > canvas.width) this.vx = -this.vx;
        if (this.baseY < 0 || this.baseY > canvas.height) this.vy = -this.vy;

        // Mouse interaction (push away)
        if (mouseRef.current.x !== null) {
          let dx = mouseRef.current.x - this.x;
          let dy = mouseRef.current.y - this.y;
          let distance = Math.hypot(dx, dy);
          
          const maxDistance = mouseRef.current.radius;
          
          if (distance < maxDistance) {
            let force = (maxDistance - distance) / maxDistance;
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let directionX = forceDirectionX * force * this.density * 0.8;
            let directionY = forceDirectionY * force * this.density * 0.8;
            
            this.x -= directionX;
            this.y -= directionY;
          } else {
            // Slow return to base positions
            if (this.x !== this.baseX) {
              let dxHome = this.x - this.baseX;
              this.x -= dxHome / 15;
            }
            if (this.y !== this.baseY) {
              let dyHome = this.y - this.baseY;
              this.y -= dyHome / 15;
            }
          }
        } else {
          // Slow return to base positions if mouse is not on screen
          if (this.x !== this.baseX) {
            let dxHome = this.x - this.baseX;
            this.x -= dxHome / 15;
          }
          if (this.y !== this.baseY) {
            let dyHome = this.y - this.baseY;
            this.y -= dyHome / 15;
          }
        }
      }
    }

    const initParticles = () => {
      particlesArray = [];
      const numberOfParticles = Math.min(
        Math.floor((canvas.width * canvas.height) / 7000), 
        200
      );
      
      for (let i = 0; i < numberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particlesArray.push(new Particle(x, y));
      }
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    resizeCanvas();

    // Interactive Mouse Trail particles
    let cursorParticles = [];
    class CursorParticle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4.0 + 1.2;
        this.speedX = (Math.random() - 0.5) * 1.4;
        this.speedY = (Math.random() - 0.5) * 1.4;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = 1.0;
        this.decay = Math.random() * 0.035 + 0.015;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.size = Math.max(0, this.size - 0.07);
        this.opacity = Math.max(0, this.opacity - this.decay);
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update background dots
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }

      // Spawn mouse trails
      if (mouseRef.current.x !== null) {
        // Spawn 1-2 particles per frame to create a dense trail
        if (Math.random() > 0.4) {
          cursorParticles.push(new CursorParticle(mouseRef.current.x, mouseRef.current.y));
        }
      }

      // Update and draw mouse trails
      for (let i = cursorParticles.length - 1; i >= 0; i--) {
        cursorParticles[i].update();
        cursorParticles[i].draw();
        if (cursorParticles[i].opacity <= 0 || cursorParticles[i].size <= 0) {
          cursorParticles.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* HTML5 Particle Grid Canvas */}
      <canvas 
        ref={canvasRef} 
        className="pointer-events-none fixed inset-0 z-0 opacity-80 dark:opacity-60 transition-opacity"
      />
    </>
  );
}
