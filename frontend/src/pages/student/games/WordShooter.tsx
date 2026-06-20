import React, { useRef, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface ShooterProps {
  words: { greek: string; chinese: string }[];
  onComplete: (score: number) => void;
}

interface Enemy {
  id: number;
  chinese: string;
  x: number;
  y: number;
  speed: number;
  width: number;
  height: number;
  color: string;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const COLORS = ['#FF4757', '#34C759', '#FF9500', '#0071E3', '#AF52DE'];

export default function WordShooter({ words, onComplete }: ShooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [targetWord, setTargetWord] = useState<{ greek: string; chinese: string } | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    words,
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    score: 0,
    mousePos: { x: 300, y: 450 },
    spawnCooldown: 0
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

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (gameOver) return;
      
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const dx = clickX - 300;
      const dy = clickY - 450;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        state.projectiles.push({
          x: 300,
          y: 440,
          vx: (dx / dist) * 8, // Smooth projectile speed
          vy: (dy / dist) * 8
        });
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleCanvasClick);

    const spawnEnemy = () => {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      ctx.font = 'bold 13px Inter';
      const textWidth = ctx.measureText(randomWord.chinese).width;
      const cardWidth = Math.max(90, textWidth + 24);

      state.enemies.push({
        id: Math.random(),
        chinese: randomWord.chinese,
        x: Math.random() * (600 - cardWidth),
        y: -35,
        // SLOWED DOWN SPEED: 0.3 to 0.7 for comfortable play
        speed: 0.3 + Math.random() * 0.4,
        width: cardWidth,
        height: 38,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    };

    // Spawn initial set
    for (let i = 0; i < 4; i++) {
      spawnEnemy();
      state.enemies[i].y = Math.random() * 120;
    }

    const update = () => {
      ctx.clearRect(0, 0, 600, 500);

      // Deep space premium layout
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 600, 500);

      // Glowing starfield background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let s = 0; s < 25; s++) {
        const sx = (Math.sin(s * 423.4) * 0.5 + 0.5) * 600;
        const sy = ((Date.now() / 15 + s * 120) % 500);
        ctx.fillRect(sx, sy, 2, 2);
      }

      // 1. Update and draw enemies
      state.spawnCooldown += 1;
      if (state.spawnCooldown > 150 && state.enemies.length < 6) {
        spawnEnemy();
        state.spawnCooldown = 0;
      }

      state.enemies.forEach((enemy) => {
        enemy.y += enemy.speed;

        // If hits shield limit, game over!
        if (enemy.y > 410) {
          setGameOver(true);
        }

        // Draw rounded neon container
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 2;
        
        const radius = 12;
        ctx.beginPath();
        ctx.moveTo(enemy.x + radius, enemy.y);
        ctx.lineTo(enemy.x + enemy.width - radius, enemy.y);
        ctx.arcTo(enemy.x + enemy.width, enemy.y, enemy.x + enemy.width, enemy.y + radius, radius);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height - radius);
        ctx.arcTo(enemy.x + enemy.width, enemy.y + enemy.height, enemy.x + enemy.width - radius, enemy.y + enemy.height, radius);
        ctx.lineTo(enemy.x + radius, enemy.y + enemy.height);
        ctx.arcTo(enemy.x, enemy.y + enemy.height, enemy.x, enemy.y + enemy.height - radius, radius);
        ctx.lineTo(enemy.x, enemy.y + radius);
        ctx.arcTo(enemy.x, enemy.y, enemy.x + radius, enemy.y, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Chinese text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.chinese, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      });

      // 2. Update and draw projectiles
      state.projectiles = state.projectiles.filter((proj) => {
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Glowing blue laser bolt
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#38BDF8';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        let hit = false;
        state.enemies = state.enemies.filter((enemy) => {
          if (
            proj.x > enemy.x && 
            proj.x < enemy.x + enemy.width &&
            proj.y > enemy.y && 
            proj.y < enemy.y + enemy.height
          ) {
            hit = true;
            if (enemy.chinese === targetWord?.chinese) {
              state.score += 20;
              setScore(state.score);

              // Burst particles
              for (let p = 0; p < 12; p++) {
                state.particles.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: enemy.color,
                  life: 1.0
                });
              }
              selectNewTarget();
              return false;
            } else {
              state.score = Math.max(0, state.score - 10);
              setScore(state.score);
            }
          }
          return true;
        });

        return !hit && proj.y > 0 && proj.x > 0 && proj.x < 600;
      });

      // 3. Update and draw particles
      state.particles = state.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        return p.life > 0;
      });

      // 4. Draw Player Spaceship (Bottom Center)
      const shipX = 300;
      const shipY = 450;

      // Laser guide line
      const dx = state.mousePos.x - shipX;
      const dy = state.mousePos.y - shipY;
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 15);
      ctx.lineTo(shipX + Math.cos(angle) * 45, shipY + Math.sin(angle) * 45);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]); 

      // Spaceship body
      ctx.fillStyle = '#0071E3';
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 24);
      ctx.lineTo(shipX - 20, shipY + 12);
      ctx.lineTo(shipX + 20, shipY + 12);
      ctx.closePath();
      ctx.fill();

      // Wing flaps
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(shipX - 26, shipY + 2, 6, 8);
      ctx.fillRect(shipX + 20, shipY + 2, 6, 8);

      // Pulse thruster flame
      ctx.fillStyle = '#FF9500';
      ctx.beginPath();
      ctx.moveTo(shipX - 6, shipY + 12);
      ctx.lineTo(shipX, shipY + 20 + Math.random() * 10);
      ctx.lineTo(shipX + 6, shipY + 12);
      ctx.closePath();
      ctx.fill();

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
          <span style={{ color: '#FF9500', background: 'rgba(255,149,0,0.08)', padding: '4px 16px', borderRadius: '20px' }}>
            击落目标：{targetWord.greek}
          </span>
        )}
      </div>

      <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={600} height={500} style={{ display: 'block', cursor: 'crosshair' }} />
        {gameOver && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', gap: '16px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF3B30' }}>防线失守</h3>
            <p style={{ color: '#86868B' }}>外星陨石已突破地球防护罩。</p>
            <button onClick={() => onComplete(score)} style={{ background: '#0071E3', color: '#FFFFFF', border: 'none', padding: '12px 30px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,113,227,0.4)' }}>
              提交积分
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
