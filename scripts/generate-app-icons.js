const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const CENTER = SIZE / 2;

// Colors
const DARK_BG = '#0B0F14';
const GRADIENT_COLORS = ['#B47CFF', '#5EDFFF', '#4DFFD2']; // Lavender, Electric Blue, Mint

function createGradient(ctx) {
  const gradient = ctx.createLinearGradient(
    CENTER - 300, CENTER - 300,
    CENTER + 300, CENTER + 300
  );
  gradient.addColorStop(0, GRADIENT_COLORS[0]);
  gradient.addColorStop(0.5, GRADIENT_COLORS[1]);
  gradient.addColorStop(1, GRADIENT_COLORS[2]);
  return gradient;
}

function drawBoldRegenSymbol(ctx, colorOrGradient, strokeWidth = 72) {
  ctx.strokeStyle = colorOrGradient;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const radius = 200;
  const arrowLen = 90;

  // Three curved segments with bold arrows forming a cycle
  for (let i = 0; i < 3; i++) {
    const rotationOffset = (i * 2 * Math.PI / 3);

    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(rotationOffset);

    // Draw arc segment
    const startAngle = -Math.PI / 5;
    const endAngle = Math.PI / 2 + Math.PI / 10;

    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle, false);
    ctx.stroke();

    // Bold arrowhead at end
    const tipX = radius * Math.cos(endAngle);
    const tipY = radius * Math.sin(endAngle);
    const arrowAngle = endAngle + Math.PI / 2;

    // First arrow line
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - arrowLen * Math.cos(arrowAngle - 0.5),
      tipY - arrowLen * Math.sin(arrowAngle - 0.5)
    );
    ctx.stroke();

    // Second arrow line
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - arrowLen * 0.7 * Math.cos(arrowAngle + 0.55),
      tipY - arrowLen * 0.7 * Math.sin(arrowAngle + 0.55)
    );
    ctx.stroke();

    ctx.restore();
  }
}

// Generate main icon with gradient on dark background
function generateMainIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Create gradient for the symbol
  const gradient = createGradient(ctx);

  // Add subtle glow
  ctx.shadowColor = GRADIENT_COLORS[1];
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw the bold symbol
  drawBoldRegenSymbol(ctx, gradient, 72);

  return canvas;
}

// Generate clean version without glow (better for small sizes)
function generateCleanIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Create gradient
  const gradient = createGradient(ctx);

  // No glow - clean crisp lines
  drawBoldRegenSymbol(ctx, gradient, 80);

  return canvas;
}

// Generate monochrome white version with dark background (visible)
function generateWhiteOnDarkIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // White symbol
  drawBoldRegenSymbol(ctx, '#FFFFFF', 80);

  return canvas;
}

// Generate monochrome white version (transparent bg)
function generateWhiteIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, SIZE, SIZE);
  drawBoldRegenSymbol(ctx, '#FFFFFF', 80);

  return canvas;
}

// Generate monochrome black version (transparent bg)
function generateBlackIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, SIZE, SIZE);
  drawBoldRegenSymbol(ctx, '#000000', 80);

  return canvas;
}

// Generate gradient on white background (for light mode / app stores)
function generateGradientOnWhiteIcon() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Gradient symbol
  const gradient = createGradient(ctx);
  drawBoldRegenSymbol(ctx, gradient, 80);

  return canvas;
}

// Main execution
async function main() {
  const outputDir = path.join(__dirname, '..', 'public', 'brand');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating ReGenr app icons (bold version)...\n');

  // Generate main icon
  console.log('1. Generating main icon (gradient on dark)...');
  const mainIcon = generateMainIcon();
  fs.writeFileSync(path.join(outputDir, 'regenr-icon-1024.png'), mainIcon.toBuffer('image/png'));
  console.log('   ✓ regenr-icon-1024.png');

  // Generate clean icon (no glow, better for small sizes)
  console.log('2. Generating clean icon (for favicons)...');
  const cleanIcon = generateCleanIcon();
  fs.writeFileSync(path.join(outputDir, 'regenr-icon-clean-1024.png'), cleanIcon.toBuffer('image/png'));
  console.log('   ✓ regenr-icon-clean-1024.png');

  // Generate white on dark (visible preview)
  console.log('3. Generating white on dark icon...');
  const whiteOnDark = generateWhiteOnDarkIcon();
  fs.writeFileSync(path.join(outputDir, 'regenr-icon-white-dark-1024.png'), whiteOnDark.toBuffer('image/png'));
  console.log('   ✓ regenr-icon-white-dark-1024.png');

  // Generate white transparent
  console.log('4. Generating white monochrome (transparent)...');
  const whiteIcon = generateWhiteIcon();
  fs.writeFileSync(path.join(outputDir, 'regenr-icon-white-1024.png'), whiteIcon.toBuffer('image/png'));
  console.log('   ✓ regenr-icon-white-1024.png');

  // Generate black transparent
  console.log('5. Generating black monochrome (transparent)...');
  const blackIcon = generateBlackIcon();
  fs.writeFileSync(path.join(outputDir, 'regenr-icon-black-1024.png'), blackIcon.toBuffer('image/png'));
  console.log('   ✓ regenr-icon-black-1024.png');

  // Generate gradient on white
  console.log('6. Generating gradient on white (for app stores)...');
  const gradientWhite = generateGradientOnWhiteIcon();
  fs.writeFileSync(path.join(outputDir, 'regenr-icon-light-1024.png'), gradientWhite.toBuffer('image/png'));
  console.log('   ✓ regenr-icon-light-1024.png');

  // Generate favicon sizes from clean icon
  console.log('7. Generating favicon sizes...');
  const sizes = [512, 192, 180, 152, 144, 120, 96, 72, 64, 48, 32, 16];

  for (const size of sizes) {
    const smallCanvas = createCanvas(size, size);
    const smallCtx = smallCanvas.getContext('2d');
    smallCtx.drawImage(cleanIcon, 0, 0, size, size);

    fs.writeFileSync(path.join(outputDir, `regenr-icon-${size}.png`), smallCanvas.toBuffer('image/png'));
    console.log(`   ✓ regenr-icon-${size}.png`);
  }

  console.log('\n✅ All icons generated!');
  console.log(`\nOutput: ${outputDir}`);
  console.log('\nFor Meta App Review, use:');
  console.log('  - regenr-icon-1024.png (main gradient)');
  console.log('  - regenr-icon-light-1024.png (gradient on white, if needed)');
}

main().catch(console.error);
