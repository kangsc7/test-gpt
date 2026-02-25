self.onmessage = async (e) => {
  const { type, payload } = e.data;
  if (type !== 'RENDER_REQUEST') return;
  const { scenes, subtitle, width = 1280, height = 720, fps = 30 } = payload;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  const chunks = [];
  recorder.ondataavailable = (evt) => chunks.push(evt.data);
  recorder.start();

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const bmp = await createImageBitmap(scene.blob);
    const durationMs = Math.max(1500, (scene.durationSec || 4) * 1000);
    const frames = Math.round((durationMs / 1000) * fps);

    for (let f = 0; f < frames; f += 1) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bmp, 0, 0, width, height);
      drawSubtitle(ctx, scene.subtitle || scene.text || '', subtitle, width, height);
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
    bmp.close();
    self.postMessage({ type: 'PROGRESS', value: Math.round(((i + 1) / scenes.length) * 100) });
  }

  recorder.stop();
  await new Promise((resolve) => (recorder.onstop = resolve));
  const videoBlob = new Blob(chunks, { type: 'video/webm' });
  self.postMessage({ type: 'RENDER_DONE', blob: videoBlob });
};

function drawSubtitle(ctx, text, subtitle, width, height) {
  if (!text) return;
  const lines = breakLines(text, subtitle.lines === '1' ? 24 : 12, subtitle.lines === '1' ? 1 : 2);
  const yBase = (height * Number(subtitle.yPercent || 85)) / 100;
  ctx.textAlign = 'center';
  ctx.font = `${subtitle.sizePx || 48}px ${subtitle.font || 'Noto Sans KR'}`;

  lines.forEach((line, idx) => {
    const y = yBase + idx * ((subtitle.sizePx || 48) + 10);
    const metrics = ctx.measureText(line);
    const pad = 16;
    ctx.fillStyle = subtitle.bgColor || '#000000';
    ctx.globalAlpha = 0.65;
    ctx.fillRect(width / 2 - metrics.width / 2 - pad, y - (subtitle.sizePx || 48), metrics.width + pad * 2, (subtitle.sizePx || 48) + 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = subtitle.color || '#ffffff';
    ctx.fillText(line, width / 2, y);
  });
}

function breakLines(text, maxChars, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + w).length > maxChars) {
      lines.push(line.trim());
      line = `${w} `;
      if (lines.length >= maxLines) break;
    } else {
      line += `${w} `;
    }
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  return lines.slice(0, maxLines);
}
