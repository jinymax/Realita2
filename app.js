const hero = document.querySelector('#heroAvatar');
const video = document.querySelector('#heroVideo');
const stage = document.querySelector('#liveStage');
const speaking = document.querySelector('#nowSpeaking');
const soundButton = document.querySelector('#soundToggle');
const toast = document.querySelector('#toast');
const callButton = document.querySelector('#callButton');
const topbar = document.querySelector('.topbar');
const transitionCanvas = document.querySelector('#mediaTransition');
const performanceControlTrack = document.querySelector('#performanceControlTrack');
const performancePrevious = document.querySelector('#performancePrevious');
const performanceNext = document.querySelector('#performanceNext');
const performanceControls = [...document.querySelectorAll('.performance-control')];
const bannerAvatarButtons = [...document.querySelectorAll('.banner-avatar-button')];
const characterTrack = document.querySelector('#characterTrack');
const characterPrevious = document.querySelector('#characterPrevious');
const characterNext = document.querySelector('#characterNext');
const callFlow = document.querySelector('#callFlow');
const callEmbed = document.querySelector('#callEmbed');
const dialAvatar = document.querySelector('#dialAvatar');
const dialName = document.querySelector('#dialName');
const dialCancel = document.querySelector('#dialCancel');
const stageStyleOptions = [...document.querySelectorAll('[data-stage-style]')];
const stageModeOptions = [...document.querySelectorAll('[data-stage-mode]')];
const stageBackgroundToggle = document.querySelector('#stageBackgroundToggle');
const stageBackgroundLabel = document.querySelector('#stageBackgroundLabel');

const bannerSlides = [
  { name: 'Realita 主播一', role: '虚拟主播', video: './assets/live-streamer-banner-female-v2.m4v', image: './assets/banner-avatar-01.png', line: '欢迎来到 Realita' },
  { name: 'Realita 主播二', role: '虚拟主播', video: './assets/live-streamer-banner-02.m4v', image: './assets/banner-avatar-02.png', line: '欢迎来到 Realita' },
];

let activeSlideIndex = 0;
let mediaSwitching = false;
const stageBackgrounds = [
  { value: 'aurora', label: '极光' },
  { value: 'midnight', label: '深夜' },
  { value: 'sunset', label: '日落' },
];
let activeBackgroundIndex = 0;

function syncHeaderTone() {
  topbar.classList.toggle('over-media', window.scrollY > 32);
}

window.addEventListener('scroll', syncHeaderTone, { passive: true });
window.addEventListener('resize', syncHeaderTone);
syncHeaderTone();

function setStageOption(options, activeOption, attribute, value) {
  stage.dataset[attribute] = value;
  options.forEach((option) => {
    const isActive = option === activeOption;
    option.classList.toggle('active', isActive);
    option.setAttribute('aria-pressed', String(isActive));
  });
}

stageStyleOptions.forEach((option) => {
  option.addEventListener('click', () => {
    const style = option.dataset.stageStyle;
    setStageOption(stageStyleOptions, option, 'style', style);
    showToast(`已切换为 ${style.toUpperCase()} 风格`);
  });
});

stageModeOptions.forEach((option) => {
  option.addEventListener('click', () => {
    const mode = option.dataset.stageMode;
    setStageOption(stageModeOptions, option, 'mode', mode);
    speaking.textContent = mode === 'companion' ? '现在开始，陪你聊聊' : bannerSlides[activeSlideIndex].line;
    showToast(`已切换为${mode === 'companion' ? '陪伴' : '直播'}模式`);
  });
});

stageBackgroundToggle.addEventListener('click', () => {
  activeBackgroundIndex = (activeBackgroundIndex + 1) % stageBackgrounds.length;
  const background = stageBackgrounds[activeBackgroundIndex];
  stage.dataset.background = background.value;
  stageBackgroundLabel.textContent = background.label;
  stageBackgroundToggle.setAttribute('aria-label', `切换背景：${background.label}`);
  showToast(`背景已切换为${background.label}`);
});

function drawCurrentMediaSnapshot() {
  const sourceIsVideo = !video.classList.contains('media-hidden') && video.readyState >= 2;
  const source = sourceIsVideo ? video : hero;
  const sourceWidth = sourceIsVideo ? video.videoWidth : hero.naturalWidth;
  const sourceHeight = sourceIsVideo ? video.videoHeight : hero.naturalHeight;
  if (!sourceWidth || !sourceHeight) return false;

  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  transitionCanvas.width = Math.round(stageWidth * pixelRatio);
  transitionCanvas.height = Math.round(stageHeight * pixelRatio);
  const context = transitionCanvas.getContext('2d');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, stageWidth, stageHeight);

  const scale = Math.max(stageWidth / sourceWidth, stageHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = (stageWidth - drawWidth) / 2;
  const drawY = (stageHeight - drawHeight) / 2;

  try {
    context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
    transitionCanvas.className = 'media-transition is-visible';
    return true;
  } catch {
    return false;
  }
}

function waitForMediaReady(target, eventName) {
  const ready = target === video ? video.readyState >= 2 : hero.complete && hero.naturalWidth > 0;
  if (ready) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      target.removeEventListener(eventName, finish);
      target.removeEventListener('error', finish);
      resolve();
    };
    const timeout = window.setTimeout(finish, 1200);
    target.addEventListener(eventName, finish, { once: true });
    target.addEventListener('error', finish, { once: true });
  });
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function syncBannerState() {
  const slide = bannerSlides[activeSlideIndex];
  bannerAvatarButtons.forEach((button, index) => {
    const isActive = index === activeSlideIndex;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  video.setAttribute('aria-label', `${slide.name}演示视频`);
  stage.setAttribute('aria-label', `${slide.name}视频 Banner`);
}

async function selectSlide(nextIndex, direction = 'forward') {
  if (mediaSwitching || nextIndex === activeSlideIndex) return;
  mediaSwitching = true;
  try {
    const slide = bannerSlides[nextIndex];
    const hasVideo = Boolean(slide.video);
    const media = [hero, video];
    const movingBackward = direction === 'backward';

    drawCurrentMediaSnapshot();
    stage.classList.toggle('slide-backward', movingBackward);
    activeSlideIndex = nextIndex;
    syncBannerState();
    await nextFrame();

    media.forEach((item) => item.classList.add('media-enter'));
    video.pause();
    if (hasVideo) {
      video.src = slide.video;
      video.load();
    } else {
      hero.src = slide.image;
      hero.alt = `当前虚拟主播 ${slide.name}`;
    }

    hero.classList.toggle('media-hidden', hasVideo);
    video.classList.toggle('media-hidden', !hasVideo);
    stage.classList.toggle('photo-mode', !hasVideo);
    stage.classList.toggle('video-mode', hasVideo);
    stage.classList.remove('video-playing');
    speaking.textContent = stage.dataset.mode === 'companion' ? '现在开始，陪你聊聊' : slide.line;

    await waitForMediaReady(hasVideo ? video : hero, hasVideo ? 'loadeddata' : 'load');
    if (hasVideo && video.readyState >= 1) {
      video.currentTime = 0.001;
      video.play().then(() => stage.classList.add('video-playing')).catch(() => {});
    }

    void stage.offsetWidth;
    transitionCanvas.classList.add('media-exit');
    media.forEach((item) => item.classList.remove('media-enter'));
    await new Promise((resolve) => window.setTimeout(resolve, 720));
  } finally {
    transitionCanvas.className = 'media-transition';
    hero.classList.remove('media-enter');
    video.classList.remove('media-enter');
    mediaSwitching = false;
  }
}

bannerAvatarButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextIndex = Number(button.dataset.slideIndex);
    if (!Number.isInteger(nextIndex) || !bannerSlides[nextIndex]) return;
    selectSlide(nextIndex, nextIndex < activeSlideIndex ? 'backward' : 'forward');
  });
});

performanceControls.forEach((button) => {
  button.addEventListener('click', () => {
    const groupSelector = button.dataset.action ? '[data-action]' : '[data-emotion]';
    const shouldActivate = button.getAttribute('aria-pressed') !== 'true';

    performanceControls
      .filter((control) => control.matches(groupSelector))
      .forEach((control) => {
        const isSelected = shouldActivate && control === button;
        control.classList.toggle('active', isSelected);
        control.setAttribute('aria-pressed', String(isSelected));
      });

    try {
      video.currentTime = 0;
      video.play().then(() => stage.classList.add('video-playing')).catch(() => {});
    } catch {
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = 0;
        video.play().then(() => stage.classList.add('video-playing')).catch(() => {});
      }, { once: true });
    }

    const label = button.lastElementChild.textContent;
    showToast(shouldActivate ? `已应用「${label}」效果` : `已关闭「${label}」效果`);
  });
});

function updatePerformanceScrollButtons() {
  const maximumScroll = performanceControlTrack.scrollHeight - performanceControlTrack.clientHeight;
  performancePrevious.disabled = performanceControlTrack.scrollTop <= 2;
  performanceNext.disabled = performanceControlTrack.scrollTop >= maximumScroll - 2;
}

performancePrevious.addEventListener('click', () => {
  performanceControlTrack.scrollBy({ top: -performanceControlTrack.clientHeight * 0.72, behavior: 'smooth' });
});

performanceNext.addEventListener('click', () => {
  performanceControlTrack.scrollBy({ top: performanceControlTrack.clientHeight * 0.72, behavior: 'smooth' });
});

performanceControlTrack.addEventListener('scroll', updatePerformanceScrollButtons, { passive: true });
window.addEventListener('resize', updatePerformanceScrollButtons);
window.requestAnimationFrame(updatePerformanceScrollButtons);

let stageTiltAnimationFrame;

function updateStageTilt(event) {
  if (event.pointerType === 'touch') return;
  window.cancelAnimationFrame(stageTiltAnimationFrame);
  stageTiltAnimationFrame = window.requestAnimationFrame(() => {
    const bounds = stage.getBoundingClientRect();
    const xRatio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const yRatio = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    stage.style.setProperty('--tilt-x', `${((0.5 - yRatio) * 5).toFixed(2)}deg`);
    stage.style.setProperty('--tilt-y', `${((xRatio - 0.5) * 6).toFixed(2)}deg`);
    stage.style.setProperty('--light-x', `${(xRatio * 100).toFixed(1)}%`);
    stage.style.setProperty('--light-y', `${(yRatio * 100).toFixed(1)}%`);
    stage.classList.add('is-tilting');
  });
}

function resetStageTilt() {
  window.cancelAnimationFrame(stageTiltAnimationFrame);
  stage.style.setProperty('--tilt-x', '0deg');
  stage.style.setProperty('--tilt-y', '0deg');
  stage.style.setProperty('--light-x', '50%');
  stage.style.setProperty('--light-y', '50%');
  stage.classList.remove('is-tilting');
}

stage.addEventListener('pointermove', updateStageTilt);
stage.addEventListener('pointerleave', resetStageTilt);

video.addEventListener('loadeddata', () => {
  if (video.currentTime === 0) video.currentTime = 0.001;
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2300);
}

let dialingFinishTimer;
let callCloseTimer;
let connectedCallActive = false;
let embeddedCallLayout = '';

function storeCallProfile(profile) {
  try {
    sessionStorage.setItem('realitaCallProfile', JSON.stringify(profile));
  } catch {
    sessionStorage.removeItem('realitaCallProfile');
  }
}

function parkCallEmbed() {
  connectedCallActive = false;
  stage.classList.remove('is-in-call', 'is-floating-call');
  callFlow.classList.remove('is-floating-call');
  callEmbed.classList.remove('is-floating');
  embeddedCallLayout = '';
}

function setEmbeddedCallLayout(layout) {
  if (embeddedCallLayout === layout) return;
  embeddedCallLayout = layout;
  callEmbed.contentWindow?.postMessage({ type: 'realita-call-layout', layout }, '*');
}

function mountCallInBanner() {
  stage.classList.add('is-in-call');
  stage.classList.remove('is-floating-call');
  callFlow.classList.remove('is-floating-call');
  callEmbed.classList.remove('is-floating');
  setEmbeddedCallLayout('banner');
}

function syncConnectedCallPlacement() {
  if (!connectedCallActive) return;

  const stageBottom = stage.getBoundingClientRect().bottom;
  // Separate enter/exit thresholds prevent jitter near the banner edge.
  const shouldFloat = stageBottom <= (callEmbed.classList.contains('is-floating') ? 120 : 88);

  if (shouldFloat) {
    stage.classList.remove('is-in-call');
    stage.classList.add('is-floating-call');
    callFlow.classList.add('is-floating-call');
    callEmbed.classList.add('is-floating');
    setEmbeddedCallLayout('floating');
    return;
  }

  mountCallInBanner();
}

function closeInPageCall() {
  window.clearTimeout(dialingFinishTimer);
  window.clearTimeout(callCloseTimer);
  parkCallEmbed();
  callFlow.classList.remove('is-active', 'is-connecting', 'is-connected');
  callButton.disabled = false;
  callCloseTimer = window.setTimeout(() => {
    if (!callFlow.classList.contains('is-active')) {
      callEmbed.src = 'about:blank';
      delete callEmbed.dataset.callPage;
      callFlow.hidden = true;
    }
  }, 380);
}

function beginInPageCall(profile) {
  if (connectedCallActive || callFlow.classList.contains('is-connecting')) return;
  const dialDuration = 5000;
  window.clearTimeout(callCloseTimer);
  window.clearTimeout(dialingFinishTimer);
  parkCallEmbed();
  storeCallProfile(profile);
  dialAvatar.src = profile.image || '';
  dialName.textContent = profile.name;
  callEmbed.src = 'about:blank';
  callFlow.hidden = false;
  callFlow.classList.remove('is-connected');
  callFlow.classList.add('is-connecting');
  callButton.disabled = true;
  window.requestAnimationFrame(() => callFlow.classList.add('is-active'));

  dialingFinishTimer = window.setTimeout(() => {
    callEmbed.dataset.callPage = 'true';
    callEmbed.src = `./call.html?v=41&embed=1&profile=${encodeURIComponent(JSON.stringify(profile))}`;
  }, dialDuration);
}

callButton.addEventListener('click', () => {
  const slide = bannerSlides[activeSlideIndex];
  const profile = {
    name: slide.name,
    role: slide.role,
    line: slide.line,
    video: slide.video || '',
    image: slide.image || '',
  };
  beginInPageCall(profile);
});

dialCancel.addEventListener('click', closeInPageCall);
function completeInPageCall() {
  if (
    callFlow.classList.contains('is-connecting') &&
    callEmbed.dataset.callPage === 'true' &&
    callEmbed.getAttribute('src')?.startsWith('./call.html?v=41&embed=1')
  ) {
    callFlow.classList.remove('is-connecting');
    callFlow.classList.add('is-connected');
    connectedCallActive = true;
    video.pause();
    mountCallInBanner();
    syncConnectedCallPlacement();
  }
}
window.addEventListener('message', (event) => {
  if (event.source !== callEmbed.contentWindow) return;
  if (event.data?.type === 'realita-call-ready') {
    completeInPageCall();
    return;
  }
  if (event.data?.type === 'realita-call-media-error' && callFlow.classList.contains('is-connecting')) {
    closeInPageCall();
    showToast('视频加载失败，请重试');
    return;
  }
  if (event.data?.type === 'realita-call-ended') {
    closeInPageCall();
    return;
  }
  if (event.data?.type === 'realita-call-scroll' && connectedCallActive && Number.isFinite(event.data.deltaY)) {
    window.scrollBy({ top: event.data.deltaY, behavior: 'instant' });
  }
});
window.addEventListener('scroll', syncConnectedCallPlacement, { passive: true });
window.addEventListener('resize', syncConnectedCallPlacement);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (connectedCallActive || !callFlow.hidden)) closeInPageCall();
});

soundButton.addEventListener('click', () => {
  soundButton.classList.toggle('muted');
  soundButton.textContent = soundButton.classList.contains('muted') ? '×' : '⌁';
});

function openRecommendationCall(card) {
  const image = card.querySelector('img');
  const previewVideo = card.querySelector('video');
  const profile = {
    name: card.dataset.name || card.querySelector('h3')?.textContent?.trim() || '虚拟主播',
    role: card.dataset.role || '实时互动角色',
    line: card.dataset.line || '你好，很高兴见到你。',
    video: card.dataset.video || previewVideo?.currentSrc || previewVideo?.src || '',
    image: image?.currentSrc || image?.src || '',
  };
  try {
    sessionStorage.setItem('realitaCallProfile', JSON.stringify(profile));
  } catch {
    sessionStorage.removeItem('realitaCallProfile');
  }
  window.location.href = './call.html';
}

document.querySelectorAll('.character-chat-button').forEach((button) => {
  button.addEventListener('click', () => openRecommendationCall(button.closest('.character-card')));
});

function updateCharacterNavigation() {
  const maxScroll = characterTrack.scrollWidth - characterTrack.clientWidth;
  characterPrevious.disabled = characterTrack.scrollLeft <= 4;
  characterNext.disabled = characterTrack.scrollLeft >= maxScroll - 4;
}

function scrollCharacters(direction) {
  const card = characterTrack.querySelector('.character-card');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(characterTrack).gap) || 0;
  characterTrack.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: 'smooth' });
}

characterPrevious.addEventListener('click', () => scrollCharacters(-1));
characterNext.addEventListener('click', () => scrollCharacters(1));
characterTrack.addEventListener('scroll', updateCharacterNavigation, { passive: true });
window.addEventListener('resize', updateCharacterNavigation);
updateCharacterNavigation();

let characterDrag = null;
characterTrack.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse' || event.target.closest('button')) return;
  characterDrag = { x: event.clientX, scrollLeft: characterTrack.scrollLeft };
  characterTrack.setPointerCapture(event.pointerId);
  characterTrack.classList.add('is-dragging');
});
characterTrack.addEventListener('pointermove', (event) => {
  if (!characterDrag) return;
  characterTrack.scrollLeft = characterDrag.scrollLeft - (event.clientX - characterDrag.x);
});
function finishCharacterDrag() {
  characterDrag = null;
  characterTrack.classList.remove('is-dragging');
  updateCharacterNavigation();
}
characterTrack.addEventListener('pointerup', finishCharacterDrag);
characterTrack.addEventListener('pointercancel', finishCharacterDrag);

const characterVideos = [...document.querySelectorAll('.character-video')];
if ('IntersectionObserver' in window) {
  const characterVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  }, { threshold: 0.25 });
  characterVideos.forEach((previewVideo) => characterVideoObserver.observe(previewVideo));
} else {
  characterVideos.slice(0, 3).forEach((previewVideo) => previewVideo.play().catch(() => {}));
}

video.play().then(() => stage.classList.add('video-playing')).catch(() => {});
syncBannerState();
