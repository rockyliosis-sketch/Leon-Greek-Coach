import React, { useRef, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface ZumaProps {
  words: { greek: string; chinese: string }[];
  onComplete: (score: number) => void;
}

interface Sphere {
  chinese: string;
  progress: number;
  x: number;
  y: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface Projectile {
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  chinese: string;
}

const COLORS = ['#FF4757', '#2ED573', '#1E90FF', '#FFA502', '#9B59B6', '#10AC84'];

export default function GreekZuma({ words, onComplete }: ZumaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [targetWord, setTargetWord] = useState<{ greek: string; chinese: string } | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    words,
    spheres: [] as Sphere[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    score: 0,
    mousePos: { x: 300, y: 250 }
  });

  const selectNewTarget = () => {
    if (words.length === 0) return;
    const randomWord = words[Math.floor(Math.random() * words.length)];
    setTargetWord(randomWord);
  };

  useEffect(() => {
    selectNewTarget();
  }, [words]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const state = stateRef.current;
    
    // Path points (spiraling inward gently)
    const getPathPoint = (t: number) => {
      const centerX = 300;
      const centerY = 250;
      const radius = 200 - t * 70;
      const angle = t * Math.PI * 2.8; 
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    };

    // Initialize spheres with comfortable spacing
    state.spheres = words.slice(0, 8).map((w, i) => ({
      chinese: w.chinese,
      progress: 0.05 + i * 0.07,
      x: 0,
      y: 0,
      color: COLORS[i % COLORS.length]
    }));

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (gameOver) return;
      
      const currentTarget = targetWord;
      if (!currentTarget) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const dx = clickX - 300;
      const dy = clickY - 250;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        state.projectiles.push({
          x: 300,
          y: 250,
          tx: dx / dist,
          ty: dy / dist,
          speed: 7, // clean, predictable speed
          chinese: currentTarget.chinese
        });
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleCanvasClick);

    // Game loop
    const update = () => {
      ctx.clearRect(0, 0, 600, 500);

      // Deep premium slate background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 600, 500);

      // Draw background space particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let s = 0; s < 15; s++) {
        const sx = (Math.sin(s * 938.2) * 0.5 + 0.5) * 600;
        const sy = (Math.cos(s * 821.5) * 0.5 + 0.5) * 500;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // 1. Draw glowing neon path
      ctx.beginPath();
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#1E293B';
      for (let t = 0; t <= 1; t += 0.01) {
        const pt = getPathPoint(t);
        if (t === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Neon highlight outline
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38BDF8';
      for (let t = 0; t <= 1; t += 0.01) {
        const pt = getPathPoint(t);
        if (t === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Draw red hazard zone at the end of the spiral
      const endPt = getPathPoint(1);
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // 2. Update and draw spheres
      state.spheres.forEach((sphere) => {
        // SLOWED DOWN SPEED: Comfortable speed for learning (0.00015)
        sphere.progress += 0.00015;
        if (sphere.progress >= 1) {
          setGameOver(true);
        }

        const pos = getPathPoint(sphere.progress);
        sphere.x = pos.x;
        sphere.y = pos.y;

        // Draw 3D Radial-Gradient Marble
        const grad = ctx.createRadialGradient(
          sphere.x - 6, sphere.y - 6, 2, 
          sphere.x, sphere.y, 22
        );
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.2, sphere.color);
        grad.addColorStop(1, '#000000');

        ctx.beginPath();
        ctx.arc(sphere.x, sphere.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw text inside sphere
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sphere.chinese, sphere.x, sphere.y);
      });

      // 3. Update and draw projectiles
      state.projectiles = state.projectiles.filter((proj) => {
        proj.x += proj.tx * proj.speed;
        proj.y += proj.ty * proj.speed;

        // Draw projectile (Glowing energy ball)
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#38BDF8';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        let hit = false;
        state.spheres = state.spheres.filter((sphere) => {
          const dx = sphere.x - proj.x;
          const dy = sphere.y - proj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 32) {
            hit = true;
            if (sphere.chinese === proj.chinese) {
              state.score += 10;
              setScore(state.score);

              // Spawn particles
              for (let p = 0; p < 12; p++) {
                state.particles.push({
                  x: sphere.x,
                  y: sphere.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: sphere.color,
                  life: 1.0
                });
              }
              selectNewTarget();
              return false;
            } else {
              // Deduct on wrong hit
              state.score = Math.max(0, state.score - 5);
              setScore(state.score);
            }
          }
          return true;
        });

        return !hit && proj.x >= 0 && proj.x <= 600 && proj.y >= 0 && proj.y <= 500;
      });

      // 4. Update and draw particles
      state.particles = state.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        return p.life > 0;
      });

      // 5. Draw Space Shooter Turret (Center)
      const dx = state.mousePos.x - 300;
      const dy = state.mousePos.y - 250;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(300, 250);
      ctx.rotate(angle);

      // Outer ring
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Gun nozzle
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.fillRect(16, -10, 24, 20);
      ctx.strokeRect(16, -10, 24, 20);

      // Inner core
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fillStyle = '#1E293B';
      ctx.fill();

      ctx.restore();

      // Draw Target Greek Text inside center
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(targetWord?.greek || '', 300, 180);

      if (state.spheres.length === 0 && !gameOver) {
        onComplete(state.score);
      }

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(update);
      }
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [targetWord, gameOver]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '600px', fontSize: '16px', fontWeight: 'bold' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trophy size={18} className="text-orange" /> 得分: {score} XP</span>
        {targetWord && (
          <span style={{ color: '#0071E3', background: 'rgba(0,113,227,0.08)', padding: '4px 16px', borderRadius: '20px' }}>
            发射目标：{targetWord.greek}
          </span>
        )}
      </div>

      <div style={{ position: 'relative', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '24px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={600} height={500} style={{ display: 'block', cursor: 'crosshair' }} />
        {gameOver && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', gap: '16px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF3B30' }}>游戏结束</h3>
            <p style={{ color: '#86868B' }}>小球滚入了核心禁区，防守失败。</p>
            <button onClick={() => onComplete(score)} style={{ background: '#0071E3', color: '#FFFFFF', border: 'none', padding: '12px 30px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,113,227,0.4)' }}>
              提交积分
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
