# Gravity Sandbox

An interactive gravitational physics simulator. Create planets, fling them into orbit, and watch orbital mechanics unfold!

## Features

- **Click & Drag to Launch**: Click to place a body, drag to set its velocity (like a slingshot)
- **Realistic Physics**: Newton's law of gravitation with collision detection
- **Preset Scenarios**: Binary stars, solar system, figure-8 orbit, and more
- **Collision Modes**: Bodies can merge (combining mass) or bounce off each other
- **Orbital Trails**: Visualize the paths bodies take through space
- **Velocity Vectors**: See direction and speed of each body
- **Time Control**: Speed up, slow down, or pause the simulation

## Controls

- **Click & Drag** on the canvas to create a new body
- **Drag direction** sets initial velocity (opposite direction, like a slingshot)
- **Mass slider** controls the size of new bodies
- **Color picker** sets the color of new bodies
- **Time Speed** adjusts simulation speed
- **Collision Mode** toggles between merge and bounce

## Getting Started

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy to Vercel

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Deploy!

## The Physics

The simulation uses Newton's law of universal gravitation:

```
F = G × (m1 × m2) / r²
```

Each frame:
1. Calculate gravitational forces between all pairs of bodies
2. Update velocities based on forces (F = ma)
3. Update positions based on velocities
4. Check for collisions and handle them

## Tips

- Start with a massive central body (high mass) to create stable orbits
- Small bodies orbiting large ones are more stable than equal masses
- Try the "Figure 8" preset to see a famous three-body solution
- Use "Bounce" mode for billiard-ball style chaos

## License

MIT
