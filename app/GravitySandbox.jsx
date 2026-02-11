'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const PRESETS = [
  {
    name: 'Binary Stars',
    bodies: [
      { x: 400, y: 450, vx: 0, vy: -1.2, mass: 800, color: '#FFB347' },
      { x: 600, y: 450, vx: 0, vy: 1.2, mass: 800, color: '#FF6B6B' },
    ]
  },
  {
    name: 'Solar System',
    bodies: [
      { x: 500, y: 450, vx: 0, vy: 0, mass: 2000, color: '#FFD700' },
      { x: 500, y: 350, vx: 2.8, vy: 0, mass: 10, color: '#A0A0A0' },
      { x: 500, y: 280, vx: 2.3, vy: 0, mass: 30, color: '#4FC3F7' },
      { x: 500, y: 180, vx: 1.9, vy: 0, mass: 50, color: '#E63946' },
      { x: 500, y: 50, vx: 1.5, vy: 0, mass: 200, color: '#F4A261' },
    ]
  },
  {
    name: 'Figure 8',
    bodies: [
      { x: 433, y: 450, vx: 0.466, vy: 0.432, mass: 400, color: '#E63946' },
      { x: 567, y: 450, vx: 0.466, vy: 0.432, mass: 400, color: '#4FC3F7' },
      { x: 500, y: 450, vx: -0.932, vy: -0.864, mass: 400, color: '#2A9D8F' },
    ]
  },
  {
    name: 'Chaos',
    bodies: [
      { x: 300, y: 300, vx: 0.5, vy: 0.3, mass: 500, color: '#FF6B6B' },
      { x: 700, y: 300, vx: -0.5, vy: 0.5, mass: 500, color: '#4ECDC4' },
      { x: 500, y: 600, vx: 0.2, vy: -0.8, mass: 500, color: '#FFE66D' },
      { x: 400, y: 450, vx: -0.3, vy: -0.2, mass: 300, color: '#95E1D3' },
    ]
  },
  {
    name: 'Moon Orbit',
    bodies: [
      { x: 500, y: 450, vx: 0, vy: 0, mass: 1500, color: '#4FC3F7' },
      { x: 500, y: 320, vx: 2.5, vy: 0, mass: 20, color: '#A0A0A0' },
    ]
  },
];

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F4A261',
  '#E63946', '#4FC3F7', '#A0A0A0', '#FFB347', '#2A9D8F',
  '#7209B7', '#3A86FF', '#06D6A0', '#FF006E', '#FFD700',
];

const G = 0.5; // Gravitational constant (tuned for visual appeal)
const MIN_DISTANCE = 20; // Prevent extreme forces at close range
const TRAIL_LENGTH = 150;

export default function GravitySandbox() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const bodiesRef = useRef([]);
  const trailsRef = useRef({});
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragCurrentRef = useRef({ x: 0, y: 0 });
  const nextIdRef = useRef(1);

  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [showTrails, setShowTrails] = useState(true);
  const [showVectors, setShowVectors] = useState(false);
  const [newBodyMass, setNewBodyMass] = useState(200);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [collisionMode, setCollisionMode] = useState('merge'); // 'merge' or 'bounce'
  const [bodyCount, setBodyCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const addBody = useCallback((x, y, vx, vy, mass, color) => {
    const id = nextIdRef.current++;
    bodiesRef.current.push({ id, x, y, vx, vy, mass, color });
    trailsRef.current[id] = [];
    setBodyCount(bodiesRef.current.length);
  }, []);

  const clearBodies = useCallback(() => {
    bodiesRef.current = [];
    trailsRef.current = {};
    nextIdRef.current = 1;
    setBodyCount(0);
  }, []);

  const loadPreset = useCallback((preset) => {
    clearBodies();
    preset.bodies.forEach(b => {
      addBody(b.x, b.y, b.vx, b.vy, b.mass, b.color);
    });
  }, [clearBodies, addBody]);

  const calculateForces = useCallback((bodies) => {
    const forces = bodies.map(() => ({ fx: 0, fy: 0 }));

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE);
        
        const force = (G * bodies[i].mass * bodies[j].mass) / (distance * distance);
        const fx = (force * dx) / distance;
        const fy = (force * dy) / distance;

        forces[i].fx += fx;
        forces[i].fy += fy;
        forces[j].fx -= fx;
        forces[j].fy -= fy;
      }
    }

    return forces;
  }, []);

  const checkCollisions = useCallback((bodies) => {
    const toRemove = new Set();
    const toAdd = [];

    for (let i = 0; i < bodies.length; i++) {
      if (toRemove.has(i)) continue;
      
      for (let j = i + 1; j < bodies.length; j++) {
        if (toRemove.has(j)) continue;

        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const r1 = Math.sqrt(bodies[i].mass) * 0.8;
        const r2 = Math.sqrt(bodies[j].mass) * 0.8;

        if (distance < r1 + r2) {
          if (collisionMode === 'merge') {
            // Merge bodies - conservation of momentum
            const totalMass = bodies[i].mass + bodies[j].mass;
            const newVx = (bodies[i].vx * bodies[i].mass + bodies[j].vx * bodies[j].mass) / totalMass;
            const newVy = (bodies[i].vy * bodies[i].mass + bodies[j].vy * bodies[j].mass) / totalMass;
            const newX = (bodies[i].x * bodies[i].mass + bodies[j].x * bodies[j].mass) / totalMass;
            const newY = (bodies[i].y * bodies[i].mass + bodies[j].y * bodies[j].mass) / totalMass;
            
            // Use color of larger body
            const color = bodies[i].mass >= bodies[j].mass ? bodies[i].color : bodies[j].color;

            toRemove.add(i);
            toRemove.add(j);
            toAdd.push({ x: newX, y: newY, vx: newVx, vy: newVy, mass: totalMass, color });
          } else {
            // Elastic bounce
            const nx = dx / distance;
            const ny = dy / distance;
            
            const dvx = bodies[i].vx - bodies[j].vx;
            const dvy = bodies[i].vy - bodies[j].vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) continue; // Already separating

            const m1 = bodies[i].mass;
            const m2 = bodies[j].mass;
            const restitution = 0.9;

            const impulse = (-(1 + restitution) * dvn) / (1/m1 + 1/m2);

            bodies[i].vx += (impulse / m1) * nx;
            bodies[i].vy += (impulse / m1) * ny;
            bodies[j].vx -= (impulse / m2) * nx;
            bodies[j].vy -= (impulse / m2) * ny;

            // Separate bodies to prevent sticking
            const overlap = (r1 + r2 - distance) / 2;
            bodies[i].x -= overlap * nx;
            bodies[i].y -= overlap * ny;
            bodies[j].x += overlap * nx;
            bodies[j].y += overlap * ny;
          }
        }
      }
    }

    // Remove and add bodies
    if (toRemove.size > 0) {
      const remaining = bodies.filter((_, idx) => !toRemove.has(idx));
      bodiesRef.current = remaining;
      
      // Clean up trails for removed bodies
      const remainingIds = new Set(remaining.map(b => b.id));
      Object.keys(trailsRef.current).forEach(id => {
        if (!remainingIds.has(parseInt(id))) {
          delete trailsRef.current[id];
        }
      });

      toAdd.forEach(b => addBody(b.x, b.y, b.vx, b.vy, b.mass, b.color));
    }
  }, [collisionMode, addBody]);

  const update = useCallback(() => {
    const bodies = bodiesRef.current;
    if (bodies.length === 0) return;

    const forces = calculateForces(bodies);

    // Update velocities and positions
    bodies.forEach((body, i) => {
      const ax = forces[i].fx / body.mass;
      const ay = forces[i].fy / body.mass;

      body.vx += ax * timeScale;
      body.vy += ay * timeScale;
      body.x += body.vx * timeScale;
      body.y += body.vy * timeScale;

      // Update trails
      if (showTrails) {
        if (!trailsRef.current[body.id]) {
          trailsRef.current[body.id] = [];
        }
        trailsRef.current[body.id].push({ x: body.x, y: body.y });
        if (trailsRef.current[body.id].length > TRAIL_LENGTH) {
          trailsRef.current[body.id].shift();
        }
      }
    });

    checkCollisions(bodies);
    setBodyCount(bodiesRef.current.length);
  }, [calculateForces, checkCollisions, timeScale, showTrails]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Dark space background
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw trails
    if (showTrails) {
      Object.entries(trailsRef.current).forEach(([id, trail]) => {
        if (trail.length < 2) return;
        
        const body = bodiesRef.current.find(b => b.id === parseInt(id));
        if (!body) return;

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        
        ctx.strokeStyle = body.color + '60';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Draw bodies
    bodiesRef.current.forEach(body => {
      const radius = Math.sqrt(body.mass) * 0.8;
      
      // Glow effect
      const gradient = ctx.createRadialGradient(
        body.x, body.y, 0,
        body.x, body.y, radius * 2
      );
      gradient.addColorStop(0, body.color + 'FF');
      gradient.addColorStop(0.5, body.color + '40');
      gradient.addColorStop(1, body.color + '00');
      
      ctx.beginPath();
      ctx.arc(body.x, body.y, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Solid body
      ctx.beginPath();
      ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();

      // Velocity vectors
      if (showVectors) {
        const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
        if (speed > 0.01) {
          const arrowLength = speed * 30;
          const endX = body.x + (body.vx / speed) * arrowLength;
          const endY = body.y + (body.vy / speed) * arrowLength;

          ctx.beginPath();
          ctx.moveTo(body.x, body.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = '#ffffff80';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(body.vy, body.vx);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - 8 * Math.cos(angle - 0.4),
            endY - 8 * Math.sin(angle - 0.4)
          );
          ctx.lineTo(
            endX - 8 * Math.cos(angle + 0.4),
            endY - 8 * Math.sin(angle + 0.4)
          );
          ctx.closePath();
          ctx.fillStyle = '#ffffff80';
          ctx.fill();
        }
      }
    });

    // Draw drag indicator
    if (isDraggingRef.current) {
      const start = dragStartRef.current;
      const current = dragCurrentRef.current;
      
      // Preview body
      const previewRadius = Math.sqrt(newBodyMass) * 0.8;
      ctx.beginPath();
      ctx.arc(start.x, start.y, previewRadius, 0, Math.PI * 2);
      ctx.fillStyle = selectedColor + '80';
      ctx.fill();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Velocity arrow
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(current.x, current.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(current.x, current.y);
        ctx.lineTo(
          current.x - 12 * Math.cos(angle - 0.4),
          current.y - 12 * Math.sin(angle - 0.4)
        );
        ctx.lineTo(
          current.x - 12 * Math.cos(angle + 0.4),
          current.y - 12 * Math.sin(angle + 0.4)
        );
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
  }, [showTrails, showVectors, newBodyMass, selectedColor]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const pos = getMousePos(e);
    isDraggingRef.current = true;
    dragStartRef.current = pos;
    dragCurrentRef.current = pos;
    setIsDragging(true);
  }, [getMousePos]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    dragCurrentRef.current = getMousePos(e);
  }, [getMousePos]);

  const handleMouseUp = useCallback((e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();

    const start = dragStartRef.current;
    const end = getMousePos(e);
    
    // Velocity based on drag distance (reversed - drag opposite to desired direction)
    const vx = (start.x - end.x) * 0.02;
    const vy = (start.y - end.y) * 0.02;

    addBody(start.x, start.y, vx, vy, newBodyMass, selectedColor);

    isDraggingRef.current = false;
    setIsDragging(false);
  }, [getMousePos, addBody, newBodyMass, selectedColor]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1000;
      canvas.height = 900;
    }

    const loop = () => {
      if (!isPaused) {
        update();
      }
      draw();
      animationRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, update, draw]);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = (e) => {
      if (isDraggingRef.current) {
        handleMouseUp(e);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [handleMouseUp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Gravity Sandbox
        </h1>
        <p className="text-center text-slate-400 mb-4 text-sm">Click and drag to launch planets into orbit</p>

        <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-slate-700/50 flex-shrink-0">
            <canvas
              ref={canvasRef}
              className="rounded-xl shadow-inner cursor-crosshair"
              style={{ width: '1000px', maxWidth: '100%', height: 'auto', touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
            />

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-6 py-2 rounded-lg font-medium transition-all shadow-lg ${
                  isPaused
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/25'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-yellow-500/25'
                } text-white`}
              >
                {isPaused ? '▶ Play' : '⏸ Pause'}
              </button>
              <button
                onClick={clearBodies}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-500/25"
              >
                ✕ Clear
              </button>
            </div>

            <div className="mt-3 text-center text-slate-400 text-sm">
              Bodies: {bodyCount} {isDragging && '• Drag to set velocity...'}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-slate-700/50 w-full xl:w-80 flex-shrink-0">
            <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Preset Scenarios</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => loadPreset(preset)}
                      className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg text-sm transition-colors border border-slate-600/50"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 flex justify-between">
                  <span>Time Speed</span>
                  <span className="text-blue-400">{timeScale.toFixed(1)}x</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={timeScale}
                  onChange={(e) => setTimeScale(Number(e.target.value))}
                  className="w-full mt-1 accent-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 flex justify-between">
                  <span>New Body Mass</span>
                  <span className="text-purple-400">{newBodyMass}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="2000"
                  step="10"
                  value={newBodyMass}
                  onChange={(e) => setNewBodyMass(Number(e.target.value))}
                  className="w-full mt-1 accent-purple-500"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Body Color</h3>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Collision Mode</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCollisionMode('merge')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      collisionMode === 'merge'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => setCollisionMode('bounce')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      collisionMode === 'bounce'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    Bounce
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Show Trails</span>
                  <button
                    onClick={() => setShowTrails(!showTrails)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      showTrails ? 'bg-purple-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        showTrails ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Show Velocity</span>
                  <button
                    onClick={() => setShowVectors(!showVectors)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      showVectors ? 'bg-purple-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        showVectors ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>Tip: Drag in the opposite direction you want the planet to go — like pulling back a slingshot!</p>
        </div>
      </div>
    </div>
  );
}
