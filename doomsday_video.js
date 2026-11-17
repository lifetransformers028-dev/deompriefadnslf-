const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');

const W = 1080, H = 1920, FPS = 30, DURATION = 48;
const TMP = path.join(__dirname, 'frames2');
fs.mkdirSync(TMP, { recursive: true });

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const scriptLines = [
  { text: "Scientists said the world ends THIS FRIDAY... but what if it's not what you think?", start: 0, end: 3000, color: '#ff6b6b' },
  { text: "1960 mein ek scientist ne ek paper likha tha - 'November 13, 2026'... doomsday!", start: 3000, end: 8000, color: '#ffffff' },
  { text: "Logon ne dekha - 'Kya yeh sach hai? Kya yeh galat hai?'", start: 8000, end: 12000, color: '#ffffff' },
  { text: "Sach? Galat? Ya... koi aur theory hai?", start: 12000, end: 18000, color: '#4ecdc4' },
  { text: "Concrete is breathing... yeh sab toh ho raha hai!", start: 12000, end: 15000, color: '#ffd166' },
  { text: "Sach mein... yeh sab kuch... bas ek theory thi!", start: 15000, end: 18000, color: '#4ecdc4' },
  { text: "13 November 2026... koi doomsday nahi hua. Koi prediction galat thi.", start: 18000, end: 22000, color: '#ff6b6b' },
  { text: "Sach yeh hai - logon ne dekha, socha, aur viral ho gaya!", start: 22000, end: 27000, color: '#ffffff' },
  { text: "Comment karein: Kya yeh sach hai? Aur follow karein for next doomsday!", start: 27000, end: 32000, color: '#ffffff' },
  { text: "Paradox Nook", start: 42000, end: 48000, color: '#ffffff' }
];

function drawFrame(t) {
  // Background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0a0a');
  g.addColorStop(1, '#1a0a0a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Draw grid pattern
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 90, 0);
    ctx.lineTo(i * 90, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 90);
    ctx.lineTo(W, i * 90);
    ctx.stroke();
  }

  // Draw countdown clock
  if (t < 3000) {
    const clockText = '13:00:00';
    const progress = 1 - t / 3000;
    ctx.save();
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 96px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 40;
    ctx.fillText(clockText, W / 2, 150);
    ctx.restore();
  }

  // Draw current text
  const currentText = scriptLines.find(item => t >= item.start && t < item.end);
  if (currentText) {
    const progress = (t - currentText.start) / (currentText.end - currentText.start);
    const alpha = Math.min(1, progress * 5);
    const scale = 1 + (1 - progress) * 0.2;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = currentText.color;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = currentText.color;
    ctx.shadowBlur = 20;
    ctx.save();
    ctx.translate(W / 2, H / 2 - 50);
    ctx.scale(scale, scale);
    ctx.fillText(currentText.text, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  // Add background text for doomsday theme
  if (t >= 12000 && t < 15000) {
    const progress = (t - 12000) / 3000;
    if (progress > 0.5) {
      const alpha = (progress - 0.5) * 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Concrete is breathing...', W / 2, 1500);
      ctx.restore();
    }
  }
}

const totalFrames = FPS * DURATION;
console.log('Generating', totalFrames, 'frames...');

for (let f = 0; f < totalFrames; f++) {
  const t = f / FPS;
  drawFrame(t);
  fs.writeFileSync(path.join(TMP, `frame_${String(f).padStart(5, '0')}.png`), canvas.toBuffer('image/png'));
}

console.log('Frames generated. Encoding with FFmpeg...');

const out = path.join(__dirname, 'doomsday_final.mp4');
const ff = spawn(ffmpeg, [
  '-y', '-framerate', String(FPS), '-i', path.join(TMP, 'frame_%05d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', String(DURATION), out
], { stdio: 'inherit' });

ff.on('close', (code) => {
  if (code === 0) {
    const size = fs.statSync(out).size;
    console.log('\nSUCCESS: ' + out + ' (' + (size / 1024).toFixed(1) + ' KB)');
  } else {
    console.error('FFmpeg failed with code', code);
  }
});
