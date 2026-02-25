const STORAGE_KEYS = {
  googleEmail: 'studio_google_email',
  ttsApiKey: 'studio_gcp_tts_api_key',
};

const state = {
  accountEmail: null,
  scenes: [],
  thumbnails: [],
  ttsAudioByScene: new Map(),
  renderedVideo: null,
  ttsConnected: false,
};

const subtitleFonts = [
  'Noto Sans KR', 'Black Han Sans', 'Jua', 'Do Hyeon', 'Nanum Gothic',
  'Nanum Myeongjo', 'Gowun Dodum', 'Gowun Batang', 'Poor Story', 'Arial',
];

const checklist = [
  '대본 버전관리/자동저장 + 프로젝트 복구 기능',
  '씬별 BGM/효과음 트랙 분리 + 볼륨 믹서',
  '저작권/초상권 필터 + 금칙어 검수',
  '썸네일 A/B 테스트용 문구 자동 생성',
  '유튜브 업로드 메타데이터(제목/설명/태그) 자동 작성',
  '실패한 씬만 재시도하는 복구 큐',
  'GPU/메모리 상태 기반 해상도 자동 조절',
  '작업 로그/진행률 이벤트 저장(크래시 복구)',
  'Antigravity/Genspark 가져오기용 JSON Export',
  '팀 협업용 코멘트/승인 워크플로',
];

const $ = (id) => document.getElementById(id);

window.addEventListener('DOMContentLoaded', async () => {
  subtitleFonts.forEach((font) => {
    const opt = document.createElement('option');
    opt.value = font;
    opt.textContent = font;
    $('subtitleFont').appendChild(opt);
  });

  checklist.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    $('checklist').appendChild(li);
  });

  bindEvents();
  restoreSavedSettings();

  if (getSavedTtsApiKey()) {
    await checkTtsApiConnection(true);
  }
});

function bindEvents() {
  $('saveEmailBtn').onclick = saveGoogleEmail;
  $('switchEmailBtn').onclick = startEmailSwitch;
  $('openGoogleAccountBtn').onclick = openGoogleAccountChooser;

  $('analyzeBtn').onclick = analyzeScript;

  $('saveTtsApiBtn').onclick = saveTtsApiKey;
  $('checkTtsApiBtn').onclick = () => checkTtsApiConnection();
  $('deleteTtsApiBtn').onclick = deleteTtsApiKey;
  $('loadVoicesBtn').onclick = loadVoices;
  $('generateTtsBtn').onclick = generateTtsForScenes;

  $('renderBtn').onclick = renderVideo;
  $('downloadAllBtn').onclick = downloadAll;
}

function restoreSavedSettings() {
  const savedEmail = localStorage.getItem(STORAGE_KEYS.googleEmail);
  const savedTtsKey = localStorage.getItem(STORAGE_KEYS.ttsApiKey);

  if (savedEmail) {
    $('googleEmail').value = savedEmail;
    state.accountEmail = savedEmail;
    $('accountInfo').textContent = savedEmail;
  }

  if (savedTtsKey) {
    $('gcpApiKey').value = savedTtsKey;
    $('ttsApiStatus').value = '저장됨 (연결 확인 필요)';
  }
}

function saveGoogleEmail() {
  const email = $('googleEmail').value.trim();
  if (!isValidEmail(email)) {
    alert('유효한 Google 이메일을 입력하세요.');
    return;
  }
  localStorage.setItem(STORAGE_KEYS.googleEmail, email);
  state.accountEmail = email;
  $('accountInfo').textContent = email;
  $('emailStatus').textContent = '이메일 저장 완료. 무료 한도 소진 시 이 값을 새 계정으로 바꾼 뒤 전환을 진행하세요.';
}

function startEmailSwitch() {
  const currentEmail = $('googleEmail').value.trim();
  if (!isValidEmail(currentEmail)) {
    alert('먼저 현재 사용 중인 Google 이메일을 입력/저장하세요.');
    return;
  }
  $('emailStatus').textContent = '계정 전환 시작: 새 Google 이메일로 로그인한 뒤, 이 입력칸에 새 이메일을 저장하고 계속 진행하세요.';
  openGoogleAccountChooser();
}

function openGoogleAccountChooser() {
  const switchUrl = 'https://accounts.google.com/Logout?continue=https://accounts.google.com/AccountChooser';
  window.open(switchUrl, '_blank', 'noopener,noreferrer');
}

async function analyzeScript() {
  const script = $('scriptInput').value.trim();
  const genre = $('genre').value;
  const sceneCount = Number($('sceneCount').value || 8);
  const apiKey = $('geminiApiKey').value.trim();
  if (!script || !apiKey) return alert('대본과 Gemini API Key를 입력하세요.');

  setStatus('Gemini 분석 중...');
  const prompt = `너는 유튜브 제작 AI다. 장르: ${genre}. 아래 대본을 ${sceneCount}개 씬으로 분할하고 JSON으로 응답해.
필드: scenes[{id,text,imagePrompt,durationSec}], thumbnails[{title,hookText,imagePrompt}], subtitlesStyleTip.
대본:\n${script}`;

  try {
    const model = $('geminiModel').value.trim() || 'gemini-3.0-flash-preview';
    const res = await geminiRequest(prompt, apiKey, model);
    const parsed = safeJsonParse(res);

    state.scenes = await Promise.all((parsed.scenes || []).map(async (scene, idx) => ({
      ...scene,
      id: scene.id ?? idx + 1,
      blob: await generateImage(scene.imagePrompt || `${genre} 스타일`, scene.id ?? idx + 1),
    })));

    state.thumbnails = parsed.thumbnails || [];
    renderScenes();
    renderThumbnails();
    setStatus('씬/썸네일 생성 완료');
  } catch (e) {
    const message = String(e.message);
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      setStatus('무료 한도 소진 감지: Google 이메일 계정 전환 후 재시도');
      alert('무료 한도 소진. [계정 전환 시작] 버튼으로 새 Google 이메일 계정 로그인 후 다시 시도하세요.');
    } else {
      setStatus(`오류: ${e.message}`);
    }
  }
}

async function geminiRequest(prompt, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

async function generateImage(prompt, seed) {
  const encoded = encodeURIComponent(`${prompt}, cinematic, high quality, seed=${seed}`);
  const res = await fetch(`https://image.pollinations.ai/prompt/${encoded}`);
  return res.blob();
}

function renderScenes() {
  const root = $('scenes');
  root.innerHTML = '';

  state.scenes.forEach((scene, idx) => {
    const div = document.createElement('div');
    div.className = 'scene';
    const imageUrl = URL.createObjectURL(scene.blob);

    div.innerHTML = `
      <h3>씬 ${idx + 1}</h3>
      <label>대본<textarea rows="3" data-k="text">${scene.text || ''}</textarea></label>
      <label>이미지 프롬프트<textarea rows="2" data-k="imagePrompt">${scene.imagePrompt || ''}</textarea></label>
      <img src="${imageUrl}" alt="scene-${idx}" />
      <div class="actions">
        <button data-act="regen">이미지 재생성</button>
        <button data-act="download">이미지 다운로드</button>
        <label>드래그앤드롭/파일 삽입<input type="file" data-act="upload" accept="image/*" /></label>
      </div>`;

    div.querySelectorAll('textarea').forEach((ta) => {
      ta.oninput = () => {
        scene[ta.dataset.k] = ta.value;
      };
    });

    div.querySelector('[data-act="regen"]').onclick = async () => {
      scene.blob = await generateImage(scene.imagePrompt, scene.id + Date.now());
      renderScenes();
    };

    div.querySelector('[data-act="download"]').onclick = () => {
      downloadBlob(scene.blob, `scene-${idx + 1}.png`);
    };

    div.querySelector('[data-act="upload"]').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      scene.blob = f;
      renderScenes();
    };

    div.ondragover = (e) => e.preventDefault();
    div.ondrop = async (e) => {
      e.preventDefault();
      const f = [...e.dataTransfer.files][0];
      if (f?.type.startsWith('image/')) {
        scene.blob = f;
        renderScenes();
      }
    };

    root.appendChild(div);
  });
}

function renderThumbnails() {
  const root = $('thumbnails');
  root.innerHTML = '';
  state.thumbnails.slice(0, 3).forEach((t, i) => {
    const div = document.createElement('article');
    div.className = 'thumb';
    div.innerHTML = `<h4>썸네일 ${i + 1}</h4><p><b>제목:</b> ${t.title || ''}</p><p><b>후킹카피:</b> ${t.hookText || ''}</p><p><b>이미지 프롬프트:</b> ${t.imagePrompt || ''}</p>`;
    root.appendChild(div);
  });
}

function getSavedTtsApiKey() {
  return localStorage.getItem(STORAGE_KEYS.ttsApiKey) || '';
}

async function saveTtsApiKey() {
  const key = $('gcpApiKey').value.trim();
  if (!key) {
    alert('저장할 Google Cloud TTS API Key를 입력하세요.');
    return;
  }

  const ok = await checkTtsApiConnection(false, key);
  if (!ok) return;

  localStorage.setItem(STORAGE_KEYS.ttsApiKey, key);
  $('ttsApiStatus').value = '정상 연결됨 (저장 완료)';
  setStatus('TTS API 저장 및 연결 확인 완료');
}

function deleteTtsApiKey() {
  localStorage.removeItem(STORAGE_KEYS.ttsApiKey);
  $('gcpApiKey').value = '';
  $('voiceSelect').innerHTML = '';
  $('ttsApiStatus').value = '미연결 (API 삭제됨)';
  state.ttsConnected = false;
  setStatus('TTS API 삭제 완료');
}

async function checkTtsApiConnection(silent = false, overrideKey = null) {
  const key = (overrideKey || $('gcpApiKey').value || getSavedTtsApiKey()).trim();
  if (!key) {
    if (!silent) alert('Google Cloud TTS API Key를 입력하세요.');
    $('ttsApiStatus').value = '미연결';
    return false;
  }

  try {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=ko-KR&key=${key}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || '연결 실패');
    }

    state.ttsConnected = true;
    $('ttsApiStatus').value = '정상 연결됨';
    if (!silent) setStatus(`TTS 연결 확인 완료 (${(data.voices || []).length}개 화자 확인)`);
    return true;
  } catch (error) {
    state.ttsConnected = false;
    $('ttsApiStatus').value = `연결 실패: ${error.message}`;
    if (!silent) alert(`TTS 연결 실패: ${error.message}`);
    return false;
  }
}

async function loadVoices() {
  const key = ($('gcpApiKey').value.trim() || getSavedTtsApiKey()).trim();
  if (!key) return alert('Google Cloud TTS API Key를 먼저 저장하세요.');

  const ok = await checkTtsApiConnection(false, key);
  if (!ok) return;

  const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=ko-KR&key=${key}`);
  const data = await res.json();
  const voices = data.voices || [];

  $('voiceSelect').innerHTML = '';
  voices.forEach((v) => {
    const genderMap = { MALE: '남성', FEMALE: '여성', NEUTRAL: '중성' };
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${genderMap[v.ssmlGender] || v.ssmlGender})`;
    $('voiceSelect').appendChild(opt);
  });

  setStatus(`${voices.length}개 화자 로드`);
}

async function generateTtsForScenes() {
  const key = ($('gcpApiKey').value.trim() || getSavedTtsApiKey()).trim();
  const voiceName = $('voiceSelect').value;
  if (!key || !voiceName || state.scenes.length === 0) {
    return alert('TTS API 저장/연결 확인, 화자 선택, 씬 생성 여부를 확인하세요.');
  }

  const ok = await checkTtsApiConnection(false, key);
  if (!ok) return;

  for (let i = 0; i < state.scenes.length; i += 1) {
    const scene = state.scenes[i];
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: scene.text || '' },
        voice: { languageCode: 'ko-KR', name: voiceName },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });
    const data = await res.json();
    if (data.audioContent) {
      const blob = base64ToBlob(data.audioContent, 'audio/mpeg');
      state.ttsAudioByScene.set(scene.id, blob);
    }
    setProgress(Math.round(((i + 1) / state.scenes.length) * 100));
  }

  setStatus('TTS 생성 완료');
}

async function renderVideo() {
  if (state.scenes.length === 0) return alert('씬을 먼저 생성하세요.');
  setStatus('영상 렌더링 시작 (백그라운드 워커)...');

  const worker = new Worker('worker.js');
  worker.onmessage = (e) => {
    if (e.data.type === 'PROGRESS') {
      setProgress(e.data.value);
    }

    if (e.data.type === 'RENDER_DONE') {
      if (state.renderedVideo) URL.revokeObjectURL(state.renderedVideo);
      state.renderedVideo = URL.createObjectURL(e.data.blob);
      $('preview').src = state.renderedVideo;
      downloadBlob(e.data.blob, 'final-video.webm');
      setStatus('영상 생성 완료 + 자동 다운로드');
      cleanupMemory();
      worker.terminate();
    }
  };

  worker.postMessage({
    type: 'RENDER_REQUEST',
    payload: {
      scenes: state.scenes.map((s) => ({
        blob: s.blob,
        subtitle: s.text,
        durationSec: s.durationSec || 4,
      })),
      subtitle: {
        font: $('subtitleFont').value,
        sizePx: Number($('subtitleSize').value),
        yPercent: Number($('subtitleY').value),
        color: $('subtitleColor').value,
        bgColor: $('subtitleBg').value,
        lines: $('subtitleLines').value,
      },
    },
  });
}

async function downloadAll() {
  const zip = new JSZip();
  state.scenes.forEach((scene, i) => {
    zip.file(`scenes/scene-${i + 1}.txt`, scene.text || '');
    zip.file(`prompts/scene-${i + 1}.prompt.txt`, scene.imagePrompt || '');
    zip.file(`images/scene-${i + 1}.png`, scene.blob);
    const tts = state.ttsAudioByScene.get(scene.id);
    if (tts) zip.file(`tts/scene-${i + 1}.mp3`, tts);
  });
  state.thumbnails.forEach((t, i) => {
    zip.file(`thumbnails/thumb-${i + 1}.json`, JSON.stringify(t, null, 2));
  });
  zip.file('export/antigravity-project.json', JSON.stringify(buildProjectExport(), null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'youtube-ai-project.zip');
}

function buildProjectExport() {
  return {
    meta: {
      createdAt: new Date().toISOString(),
      genre: $('genre').value,
      googleEmail: $('googleEmail').value.trim() || state.accountEmail,
      subtitle: {
        font: $('subtitleFont').value,
        sizePx: Number($('subtitleSize').value),
        lines: $('subtitleLines').value,
      },
      ttsStatus: $('ttsApiStatus').value,
    },
    scenes: state.scenes.map((s, i) => ({
      index: i + 1,
      text: s.text,
      imagePrompt: s.imagePrompt,
      durationSec: s.durationSec || 4,
    })),
    thumbnails: state.thumbnails,
    integrations: {
      antigravity: 'import export/antigravity-project.json',
      gensparkAgent: 'use docs/genspark-agent-instructions.md as bootstrap',
    },
  };
}

function cleanupMemory() {
  if (window.gc) window.gc();
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function base64ToBlob(base64, type) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setProgress(v) {
  $('progress').value = v;
}

function setStatus(msg) {
  $('status').textContent = msg;
}
