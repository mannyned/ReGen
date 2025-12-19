const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const CENTER = SIZE / 2;

// Colors
const DARK_BG = '#0B0F14';
const GRADIENT_COLORS = ['#B47CFF', '#5EDFFF', '#4DFFD2']; // Lavender, Electric Blue, Mint

function createGradient(ctx, startAngle = 0) {
  // Create a conical-style gradient by using multiple linear gradients
  const gradient = ctx.createLinearGradient(
    CENTER - 250, CENTER - 250,
    CENTER + 250, CENTER + 250
  );
  gradient.addColorStop(0, GRADIENT_COLORS[0]);
  gradient.addColorStop(0.5, GRADIENT_COLORS[1]);
  gradient.addColorStop(1, GRADIENT_COLORS[2]);
  return gradient;
}

function drawRegenSymbol(ctx, color, strokeWidth = 48) {
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const radius = 220;
  const arrowSize = 60;

  // Draw three curved arrows forming a regeneration cycle
  for (let i = 0; i < 3; i++) {
    const startAngle = (i * 2 * Math.PI / 3) - Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI / 3) - 0.3;

    ctx.beginPath();
    ctx.arc(CENTER, CENTER, radius, startAngle + 0.3, endAngle, false);
    ctx.stroke();

    // Draw arrowhead at the end of each arc
    const arrowAngle = endAngle;
    const arrowX = CENTER + radius * Math.cos(arrowAngle);
    const arrowY = CENTER + radius * Math.sin(arrowAngle);

    // Arrow direction (tangent to circle, pointing forward)
    const tangentAngle = arrowAngle + Math.PI / 2;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(tangentAngle - 0.5),
      arrowY - arrowSize * Math.sin(tangentAngle - 0.5)
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(tangentAngle + 0.5) * 0.7,
      arrowY - arrowSize * Math.sin(tangentAngle + 0.5) * 0.7
    );
    ctx.stroke();
  }
}

function drawModernRegenSymbol(ctx, color, strokeWidth = 52) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const outerRadius = 240;
  const innerRadius = 140;

  // Draw a flowing infinity-style regeneration loop
  // Three interweaving arcs creating a dynamic flow

  const segments = [
    { start: -0.6, end: 1.2, radius: outerRadius, offsetX: -40, offsetY: 0 },
    { start: 1.5, end: 3.3, radius: outerRadius, offsetX: 20, offsetY: -30 },
    { start: 3.6, end: 5.4, radius: outerRadius, offsetX: 20, offsetY: 30 },
  ];

  // Draw flowing arcs
  segments.forEach((seg, index) => {
    ctx.beginPath();
    ctx.arc(
      CENTER + seg.offsetX,
      CENTER + seg.offsetY,
      seg.radius * 0.85,
      seg.start,
      seg.end,
      false
    );
    ctx.stroke();
  });
}

function drawCleanRegenSymbol(ctx, colorOrGradient, strokeWidth = 56) {
  ctx.strokeStyle = colorOrGradient;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const radius = 200;
  const gap = 0.4; // Gap between segments
  const arrowLen = 70;

  // Three curved segments with arrows, forming a cycle
  for (let i = 0; i < 3; i++) {
    const baseAngle = (i * 2 * Math.PI / 3) - Math.PI / 2;
    const startAngle = baseAngle + gap / 2;
    const endAngle = baseAngle + (2 * Math.PI / 3) - gap / 2;

    // Draw arc
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, radius, startAngle, endAngle, false);
    ctx.stroke();

    // Arrowhead at end
    const tipX = CENTER + radius * Math.cos(endAngle);
    const tipY = CENTER + radius * Math.sin(endAngle);
    const tangent = endAngle + Math.PI / 2;

    // Arrow lines
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - arrowLen * Math.cos(tangent - 0.55),
      tipY - arrowLen * Math.sin(tangent - 0.55)
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - arrowLen * 0.65 * Math.cos(tangent + 0.65),
      tipY - arrowLen * 0.65 * Math.sin(tangent + 0.65)
    );
    ctx.stroke();
  }
}

function drawMinimalFlowSymbol(ctx, colorOrGradient, strokeWidth = 64) {
  ctx.strokeStyle = colorOrGradient;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // A minimal, abstract regeneration symbol
  // Inspired by recycling symbols but more modern/abstract

  const r = 180; // Main radius
  const arrowSize = 80;

  // Draw three flowing curves
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI / 3) - Math.PI / 2;
    const nextAngle = angle + (2 * Math.PI / 3);

    // Start and end points
    const startX = CENTER + r * Math.cos(angle + 0.35);
    const startY = CENTER + r * Math.sin(angle + 0.35);
    const endX = CENTER + r * Math.cos(nextAngle - 0.35);
    const endY = CENTER + r * Math.sin(nextAngle - 0.35);

    // Control point (pulled toward center for curve)
    const midAngle = angle + Math.PI / 3;
    const ctrlR = r * 0.45;
    const ctrlX = CENTER + ctrlR * Math.cos(midAngle);
    const ctrlY = CENTER + ctrlR * Math.sin(midAngle);

    // Draw curved path
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.stroke();

    // Arrow at end
    const arrowAngle = nextAngle + 0.15;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(arrowAngle - 0.4),
      endY - arrowSize * Math.sin(arrowAngle - 0.4)
    );
    ctx.stroke();
  }
}

function drawPremiumRegenSymbol(ctx, colorOrGradient, strokeWidth = 58) {
  ctx.strokeStyle = colorOrGradient;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Premium flowing regeneration symbol - three elegant curves
  const radius = 190;

  for (let i = 0; i < 3; i++) {
    const rotationOffset = (i * 2 * Math.PI / 3);

    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(rotationOffset);

    // Draw elegant curved arrow
    ctx.beginPath();

    // Start point
    const startAngle = -Math.PI / 6;
    const endAngle = Math.PI / 2 + Math.PI / 12;

    // Arc path
    ctx.arc(0, 0, radius, startAngle, endAngle, false);
    ctx.stroke();

    // Arrowhead
    const tipX = radius * Math.cos(endAngle);
    const tipY = radius * Math.sin(endAngle);
    const arrowLen = 75;
    const arrowAngle = endAngle + Math.PI / 2;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - arrowLen * Math.cos(arrowAngle - 0.5),
      tipY - arrowLen * Math.sin(arrowAngle - 0.5)
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - arrowLen * 0.6 * Math.cos(arrowAngle + 0.6),
      tipY - arrowLen * 0.6 * Math.sin(arrowAngle + 0.6)
    );
    ctx.stroke();

    ctx.restore();
  }
}

// Generate main icon with gradient on dark background
function generateMainIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Dark background with rounded corners simulation
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Create gradient
  const gradient = createGradient(ctx);

  // Add subtle glow
  ctx.shadowColor = GRADIENT_COLORS[1];
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw the symbol
  drawPremiumRegenSymbol(ctx, gradient);

  return canvas;
}

// Generate monochrome white version
function generateWhiteIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Transparent background (default)
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Draw white symbol
  drawPremiumRegenSymbol(ctx, '#FFFFFF');

  return canvas;
}

// Generate monochrome black version
function generateBlackIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Transparent background (default)
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Draw black symbol
  drawPremiumRegenSymbol(ctx, '#000000');

  return canvas;
}

// Main execution
async function main() {
  const outputDir = path.join(__dirname, '..', 'public', 'brand');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating ReGenr app icons...\n');

  // Generate main icon
  console.log('1. Generating main icon (gradient on dark background)...');
  const mainIcon = generateMainIcon();
  const mainPath = path.join(outputDir, 'regenr-icon-1024.png');
  fs.writeFileSync(mainPath, mainIcon.toBuffer('image/png'));
  console.log(`   ✓ Saved: ${mainPath}`);

  // Generate white monochrome
  console.log('2. Generating white monochrome icon...');
  const whiteIcon = generateWhiteIcon();
  const whitePath = path.join(outputDir, 'regenr-icon-white-1024.png');
  fs.writeFileSync(whitePath, whiteIcon.toBuffer('image/png'));
  console.log(`   ✓ Saved: ${whitePath}`);

  // Generate black monochrome
  console.log('3. Generating black monochrome icon...');
  const blackIcon = generateBlackIcon();
  const blackPath = path.join(outputDir, 'regenr-icon-black-1024.png');
  fs.writeFileSync(blackPath, blackIcon.toBuffer('image/png'));
  console.log(`   ✓ Saved: ${blackPath}`);

  // Generate smaller sizes for favicons
  console.log('4. Generating favicon sizes...');
  const sizes = [512, 192, 180, 152, 144, 120, 96, 72, 64, 48, 32, 16];

  for (const size of sizes) {
    const smallCanvas = createCanvas(size, size);
    const smallCtx = smallCanvas.getContext('2d');

    // Scale down the main icon
    smallCtx.drawImage(mainIcon, 0, 0, size, size);

    const smallPath = path.join(outputDir, `regenr-icon-${size}.png`);
    fs.writeFileSync(smallPath, smallCanvas.toBuffer('image/png'));
    console.log(`   ✓ Saved: regenr-icon-${size}.png`);
  }

  console.log('\n✅ All icons generated successfully!');
  console.log(`\nOutput directory: ${outputDir}`);
  console.log('\nFiles created:');
  console.log('  - regenr-icon-1024.png (main, gradient)');
  console.log('  - regenr-icon-white-1024.png (monochrome white)');
  console.log('  - regenr-icon-black-1024.png (monochrome black)');
  console.log('  - regenr-icon-{size}.png (favicon sizes)');
}

main().catch(console.error);
