// Demo: code-based motion video renderer
// Banata hai frames (canvas) -> PNG -> FFmpeg se MP4
const { createCanvas } = require('@napi-rs/canvas');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const W = 1280, H = 720, FPS = 30, DURATION = 8; // 8 sec, 30fps
const TMP = path.join(__dirname, 'frames');
fs.mkdirSync(TMP, { recursive: true });

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Scene: gradient background + animated kinetic text
function drawFrame(t) {
  // t = 0..1
  // Background gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(1, '#1e293b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Animated particles
  for (let i = 0; i < 40; i++) {
    const x = (i * 137 + t * 400) % W;
    const y = (i * 89) % H;
    const r = 2 + ((i * 13) % 5);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(96,165,250,${0.15 + 0.3 * Math.sin(t * 6 + i)})`;
    ctx.fill();
  }

  // Main text with fade + scale animation
  const ease = 1 - Math.pow(1 - Math.min(t * 3, 1), 3);
  const scale = 0.8 + ease * 0.2;
  ctx.save();
  ctx.translate(W / 2, H / 2 - 20);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.min(t * 3, 1);
  ctx.textAlign = 'center';

  ctx.font = 'bold 72px sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('CODE SE VIDEO', 0, 0);

  ctx.font = '32px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('Canvas + FFmpeg = real MP4', 0, 70);

  ctx.restore();

  // Progress bar
  ctx.fillStyle = '#334155';
  ctx.fillRect(W / 2 - 200, H - 80, 400, 8);
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(W / 2 - 200, H - 80, 400 * t, 8);
}

// 1) Frames render
const total = FPS * DURATION;
console.log('Rendering', total, 'frames...');
for (let f = 0; f < total; f++) {
  drawFrame(f / (total - 1));
  fs.writeFileSync(path.join(TMP, `frame_${String(f).padStart(5, '0')}.png`), canvas.toBuffer('image/png'));
}
console.log('Frames done. Encoding with FFmpeg...');

// 2) FFmpeg encode
const out = path.join(__dirname, 'demo_output.mp4');
const ff = spawn(ffmpeg, [
  '-y', '-framerate', String(FPS), '-i', path.join(TMP, 'frame_%05d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out
], { stdio: 'inherit' });

ff.on('close', (code) => {
  if (code === 0) {
    const size = fs.statSync(out).size;
    console.log('\nSUCCESS: ' + out + ' (' + (size / 1024).toFixed(1) + ' KB)');
  } else {
    console.error('FFmpeg failed with code', code);
  }
});