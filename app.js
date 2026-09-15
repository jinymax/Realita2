const stage = document.querySelector('#liveStage');
const gallery = document.querySelector('#bendingGallery');
const galleryCards = [...document.querySelectorAll('.bending-card')];
const galleryVideos = [...document.querySelectorAll('.bending-card video')];
const toast = document.querySelector('#toast');
const callButton = document.querySelector('#callButton');
const muteButton = document.querySelector('#muteButton');
const themeToggle = document.querySelector('#themeToggle');
const topbar = document.querySelector('.topbar');
const recommendationSearch = document.querySelector('#recommendationSearch');
const recommendationEmpty = document.querySelector('#recommendationEmpty');
const recommendationUpload = document.querySelector('#recommendationUpload');
const recommendationUploadZone = document.querySelector('#recommendationUploadZone');
const recommendationUploadFeedback = document.querySelector('#recommendationUploadFeedback');
const presenceCallVideo = document.querySelector('.presence-photo-large video');
const actionControls = [...document.querySelectorAll('[data-action]')];
const emotionControls = [...document.querySelectorAll('[data-emotion]')];
const performanceTrack = document.querySelector('#performanceControlTrack');
const performancePrevious = document.querySelector('#performancePrevious');
const performanceNext = document.querySelector('#performanceNext');
const performanceTarget = document.querySelector('.recommendation-card-main');

const bannerSlides = [
  { name: '虚拟人物 1', role: '虚拟主播', line: '很高兴见到你', image: './assets/banner-01.png' },
  { name: '虚拟人物 2', role: '虚拟主播', line: '今天想聊些什么？', image: './assets/banner-02.png' },
  { name: '虚拟人物 3', role: '虚拟主播', line: '欢迎进入我的直播间', image: './assets/banner-03.png' },
  { name: '虚拟人物 4', role: '虚拟主播', line: '准备好开始了吗？', image: './assets/banner-04.png' },
  { name: '虚拟人物视频 5', role: '动态主播', line: '让我们开始对话吧', video: './assets/banner-05.mp4' },
  { name: '虚拟人物视频 6', role: '动态主播', line: '我正在认真听', video: './assets/banner-06.mp4' },
];

let activeSlideIndex = 0;
let galleryMuted = true;
let dragStartX = null;
let dragDistance = 0;
let pressedCardIndex = null;
let suppressClickUntil = 0;
let activeAction = '';
let activeEmotion = '';
let carouselAutoplayTimer = null;

const actionLabels = { wave: '挥手', nod: '点头', breathe: '自然呼吸', sway: '摇摆', jump: '跳跃' };
const emotionLabels = { happy: '开心', calm: '平静', surprised: '惊喜', shy: '害羞', angry: '生气' };
const actionClasses = Object.keys(actionLabels).map((action) => `action-${action}`);
const emotionClasses = Object.keys(emotionLabels).map((emotion) => `emotion-${emotion}`);

function syncPerformanceScrollButtons() {
  const maxScroll = performanceTrack.scrollWidth - performanceTrack.clientWidth;
  performancePrevious.disabled = performanceTrack.scrollLeft <= 10;
  performanceNext.disabled = performanceTrack.scrollLeft >= maxScroll - 10;
}

function scrollPerformanceControls(direction) {
  performanceTrack.scrollBy({ left: direction * performanceTrack.clientWidth, behavior: 'smooth' });
}

performancePrevious.addEventListener('click', () => scrollPerformanceControls(-1));
performanceNext.addEventListener('click', () => scrollPerformanceControls(1));
performanceTrack.addEventListener('scroll', syncPerformanceScrollButtons, { passive: true });
performanceTrack.addEventListener('wheel', (event) => {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  performanceTrack.scrollLeft += delta;
}, { passive: false });
window.addEventListener('resize', syncPerformanceScrollButtons);

function syncHeaderTone() {
  topbar.classList.toggle('over-media', window.scrollY > 32);
}

window.addEventListener('scroll', syncHeaderTone, { passive: true });
window.addEventListener('resize', syncHeaderTone);
syncHeaderTone();

function syncThemeToggle() {
  const isLight = document.documentElement.dataset.theme === 'light';
  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.setAttribute('aria-label', isLight ? '切换到深色模式' : '切换到浅色模式');
  themeToggle.title = isLight ? '切换到深色模式' : '切换到浅色模式';
}

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem('realitaTheme', nextTheme);
  } catch {
    // 本地存储不可用时，主题仍在当前页面生效。
  }
  syncThemeToggle();
  showToast(nextTheme === 'light' ? '已切换到浅色模式' : '已切换到深色模式');
});

syncThemeToggle();

function normalizeSlideIndex(index) {
  return (index + bannerSlides.length) % bannerSlides.length;
}

function circularOffset(index) {
  let offset = index - activeSlideIndex;
  const midpoint = bannerSlides.length / 2;
  if (offset > midpoint) offset -= bannerSlides.length;
  if (offset < -midpoint) offset += bannerSlides.length;
  return offset;
}

function syncMuteButton() {
  if (!muteButton || !galleryCards.length) return;
  const activeVideo = galleryCards[activeSlideIndex].querySelector('video');
  muteButton.hidden = !activeVideo;
  muteButton.classList.toggle('is-muted', galleryMuted);
  muteButton.setAttribute('aria-pressed', String(galleryMuted));
  muteButton.setAttribute('aria-label', galleryMuted ? '取消静音' : '静音');
}

function layoutBendingGallery() {
  if (!stage || !galleryCards.length) return;
  const width = stage.clientWidth;
  const cardWidth = Math.min(450, Math.max(230, width * (width <= 760 ? 0.68 : 0.32)));
  const gap = Math.min(cardWidth * 0.8, width * 0.265);

  galleryCards.forEach((card, index) => {
    const offset = circularOffset(index);
    const distance = Math.abs(offset);
    const isActive = distance === 0;
    card.style.setProperty('--gallery-x', `${offset * gap}px`);
    card.style.setProperty('--gallery-y', `${distance * 13}px`);
    card.style.setProperty('--gallery-depth', `${distance * -145}px`);
    card.style.setProperty('--gallery-rotate-y', `${offset * -24}deg`);
    card.style.setProperty('--gallery-rotate-z', '0deg');
    card.style.setProperty('--gallery-scale', String(1 - distance * 0.055));
    card.style.setProperty('--gallery-opacity', String(distance > 3 ? 0 : 1 - distance * 0.2));
    card.style.setProperty('--gallery-z', String(30 - distance));
    card.style.pointerEvents = distance > 3 ? 'none' : 'auto';
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-current', String(isActive));
    card.setAttribute('aria-label', isActive ? `切换到${bannerSlides[normalizeSlideIndex(index + 1)].name}` : `选择${bannerSlides[index].name}`);
    card.tabIndex = isActive ? 0 : -1;

    const cardVideo = card.querySelector('video');
    if (!cardVideo) return;
    cardVideo.muted = isActive ? galleryMuted : true;
    if (isActive) cardVideo.play().catch(() => {});
    else cardVideo.pause();
  });

  syncMuteButton();
}

function syncPerformanceControls() {
  actionControls.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.action === activeAction));
  });
  emotionControls.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.emotion === activeEmotion));
  });
}

function clearPerformanceClasses() {
  [...galleryCards, performanceTarget].filter(Boolean).forEach((card) => {
    card.classList.remove(...actionClasses, ...emotionClasses);
  });
}

function resetPerformanceControls() {
  activeAction = '';
  activeEmotion = '';
  clearPerformanceClasses();
  syncPerformanceControls();
}

function applyAction(action) {
  const activeCard = galleryCards[activeSlideIndex] || performanceTarget;
  if (!activeCard) return;
  actionClasses.forEach((className) => activeCard.classList.remove(className));
  activeAction = activeAction === action ? '' : action;
  if (activeAction) {
    void activeCard.offsetWidth;
    activeCard.classList.add(`action-${activeAction}`);
  }
  syncPerformanceControls();
}

function applyEmotion(emotion) {
  const activeCard = galleryCards[activeSlideIndex] || performanceTarget;
  if (!activeCard) return;
  emotionClasses.forEach((className) => activeCard.classList.remove(className));
  activeEmotion = activeEmotion === emotion ? '' : emotion;
  if (activeEmotion) activeCard.classList.add(`emotion-${activeEmotion}`);
  syncPerformanceControls();
}

function selectSlide(nextIndex) {
  const normalizedIndex = normalizeSlideIndex(nextIndex);
  if (normalizedIndex !== activeSlideIndex) {
    resetPerformanceControls();
    activeSlideIndex = normalizedIndex;
    layoutBendingGallery();
  }
}

function stopCarouselAutoplay() {
  window.clearInterval(carouselAutoplayTimer);
  carouselAutoplayTimer = null;
}

function startCarouselAutoplay() {
  stopCarouselAutoplay();
  if (!gallery || !galleryCards.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  carouselAutoplayTimer = window.setInterval(() => selectSlide(activeSlideIndex + 1), 4200);
}

actionControls.forEach((button) => {
  button.addEventListener('click', () => applyAction(button.dataset.action));
});

emotionControls.forEach((button) => {
  button.addEventListener('click', () => applyEmotion(button.dataset.emotion));
});

galleryCards.forEach((card) => {
  card.addEventListener('click', () => {
    if (Date.now() < suppressClickUntil) return;
    const cardIndex = Number(card.dataset.slide);
    selectSlide(cardIndex === activeSlideIndex ? activeSlideIndex + 1 : cardIndex);
  });
  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const cardIndex = Number(card.dataset.slide);
    selectSlide(cardIndex === activeSlideIndex ? activeSlideIndex + 1 : cardIndex);
  });
});

gallery?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') selectSlide(activeSlideIndex - 1);
  else if (event.key === 'ArrowRight') selectSlide(activeSlideIndex + 1);
  else return;
  event.preventDefault();
});

gallery?.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.active-card-actions button')) return;
  dragStartX = event.clientX;
  dragDistance = 0;
  const pressedCard = event.target.closest('.bending-card');
  pressedCardIndex = event.target.closest('.active-card-actions')
    ? activeSlideIndex
    : pressedCard ? Number(pressedCard.dataset.slide) : null;
  gallery.classList.add('is-dragging');
  stopCarouselAutoplay();
  gallery.setPointerCapture(event.pointerId);
});

gallery?.addEventListener('pointermove', (event) => {
  if (dragStartX === null) return;
  dragDistance = event.clientX - dragStartX;
  gallery.style.setProperty('--drag-offset', `${dragDistance * 0.22}px`);
});

function finishGalleryDrag(event) {
  if (dragStartX === null) return;
  if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
  gallery.classList.remove('is-dragging');
  gallery.style.setProperty('--drag-offset', '0px');
  const wasCancelled = event.type === 'pointercancel';
  if (!wasCancelled && Math.abs(dragDistance) > 42) {
    suppressClickUntil = Date.now() + 300;
    selectSlide(activeSlideIndex + (dragDistance < 0 ? 1 : -1));
  } else if (!wasCancelled && pressedCardIndex !== null) {
    suppressClickUntil = Date.now() + 300;
    selectSlide(pressedCardIndex === activeSlideIndex ? activeSlideIndex + 1 : pressedCardIndex);
  }
  dragStartX = null;
  dragDistance = 0;
  pressedCardIndex = null;
  startCarouselAutoplay();
}

gallery?.addEventListener('pointerup', finishGalleryDrag);
gallery?.addEventListener('pointercancel', finishGalleryDrag);
gallery?.addEventListener('dragstart', (event) => event.preventDefault());
gallery?.addEventListener('mouseenter', stopCarouselAutoplay);
gallery?.addEventListener('mouseleave', startCarouselAutoplay);
gallery?.addEventListener('focusin', stopCarouselAutoplay);
gallery?.addEventListener('focusout', (event) => {
  if (!gallery.contains(event.relatedTarget)) startCarouselAutoplay();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCarouselAutoplay();
  else startCarouselAutoplay();
});

galleryVideos.forEach((galleryVideo) => {
  galleryVideo.addEventListener('loadedmetadata', () => {
    if (galleryVideo.currentTime === 0) galleryVideo.currentTime = 0.001;
  });
});

window.addEventListener('resize', layoutBendingGallery);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2300);
}

callButton?.addEventListener('click', () => {
  const slide = bannerSlides[activeSlideIndex];
  const profile = {
    name: slide.name,
    role: slide.role,
    line: slide.line,
    video: slide.video || '',
    image: slide.image || '',
  };
  try {
    sessionStorage.setItem('realitaCallProfile', JSON.stringify(profile));
  } catch {
    sessionStorage.removeItem('realitaCallProfile');
  }
  window.location.href = './call.html';
});

muteButton?.addEventListener('click', () => {
  galleryMuted = !galleryMuted;
  const activeVideo = galleryCards[activeSlideIndex].querySelector('video');
  if (activeVideo) activeVideo.muted = galleryMuted;
  syncMuteButton();
  showToast(galleryMuted ? '视频声音已静音' : '视频声音已开启');
});

let activeRecommendationFilter = 'all';

function filterRecommendations() {
  const query = recommendationSearch?.value.trim().toLowerCase() || '';
  const cards = [...document.querySelectorAll('.recommendation-card')];
  let visibleCount = 0;

  cards.forEach((card) => {
    const categories = card.dataset.category.split(' ');
    const categoryMatches = activeRecommendationFilter === 'all' || categories.includes(activeRecommendationFilter);
    const titleMatches = card.dataset.title.toLowerCase().includes(query);
    const visible = categoryMatches && titleMatches;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  recommendationEmpty.hidden = visibleCount > 0;
}

document.querySelectorAll('.recommendation-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.recommendation-tabs button').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    activeRecommendationFilter = button.dataset.filter;
    filterRecommendations();
  });
});

recommendationSearch?.addEventListener('input', filterRecommendations);

function bindFavoriteButton(button) {
  if (button.dataset.favoriteBound === 'true') return;
  button.dataset.favoriteBound = 'true';
  button.addEventListener('click', () => {
    const selected = button.classList.toggle('saved');
    const characterName = button.closest('.recommendation-card')?.querySelector('h3')?.textContent || '这个虚拟人物';
    button.textContent = '↗';
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', selected ? `取消选择 ${characterName}` : `选择 ${characterName}`);
    showToast(selected ? `已选择 ${characterName}` : `已取消选择 ${characterName}`);
  });
}

document.querySelectorAll('.recommendation-overlay button').forEach(bindFavoriteButton);

const recommendationFeature = document.querySelector('.recommendation-feature');
const featureMainColumn = document.querySelector('.recommendation-main-column');
const featureMainCard = document.querySelector('.recommendation-card-main');
const recommendationChatControl = document.querySelector('.recommendation-chat-control');
const recommendationTitle = document.querySelector('#recommendationTitle');
const recommendationHostIntro = document.querySelector('#recommendationHostIntro');
const reducedCardMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let recommendationTiltFrame = null;
let recommendationCardBounds = null;
let recommendationTiltReturning = false;
const recommendationTiltCurrent = {rotateX:0,rotateY:0,imageX:0,imageY:0,labelX:0,labelY:0,shineX:0,shineY:0};
const recommendationTiltTarget = {...recommendationTiltCurrent};

function updateFeaturedCard3d() {
  let remaining = 0;
  Object.keys(recommendationTiltCurrent).forEach((key) => {
    recommendationTiltCurrent[key] += (recommendationTiltTarget[key] - recommendationTiltCurrent[key]) * .16;
    remaining = Math.max(remaining, Math.abs(recommendationTiltTarget[key] - recommendationTiltCurrent[key]));
  });

  featureMainCard.style.setProperty('--card-rotate-x', `${recommendationTiltCurrent.rotateX.toFixed(2)}deg`);
  featureMainCard.style.setProperty('--card-rotate-y', `${recommendationTiltCurrent.rotateY.toFixed(2)}deg`);
  featureMainCard.style.setProperty('--card-image-x', `${recommendationTiltCurrent.imageX.toFixed(1)}px`);
  featureMainCard.style.setProperty('--card-image-y', `${recommendationTiltCurrent.imageY.toFixed(1)}px`);
  featureMainCard.style.setProperty('--card-label-x', `${recommendationTiltCurrent.labelX.toFixed(1)}px`);
  featureMainCard.style.setProperty('--card-label-y', `${recommendationTiltCurrent.labelY.toFixed(1)}px`);
  featureMainCard.style.setProperty('--card-shine-offset-x', `${recommendationTiltCurrent.shineX.toFixed(1)}px`);
  featureMainCard.style.setProperty('--card-shine-offset-y', `${recommendationTiltCurrent.shineY.toFixed(1)}px`);

  if (remaining > .08) {
    recommendationTiltFrame = window.requestAnimationFrame(updateFeaturedCard3d);
    return;
  }

  recommendationTiltFrame = null;
  if (recommendationTiltReturning) resetFeaturedCard3d();
}

function queueFeaturedCard3d() {
  if (!recommendationTiltFrame) recommendationTiltFrame = window.requestAnimationFrame(updateFeaturedCard3d);
}

function resetFeaturedCard3d() {
  if (recommendationTiltFrame) window.cancelAnimationFrame(recommendationTiltFrame);
  recommendationTiltFrame = null;
  recommendationCardBounds = null;
  recommendationTiltReturning = false;
  Object.keys(recommendationTiltCurrent).forEach((key) => {
    recommendationTiltCurrent[key] = 0;
    recommendationTiltTarget[key] = 0;
  });
  featureMainCard.classList.remove('is-3d-active');
  featureMainCard.style.removeProperty('--card-rotate-x');
  featureMainCard.style.removeProperty('--card-rotate-y');
  featureMainCard.style.removeProperty('--card-image-x');
  featureMainCard.style.removeProperty('--card-image-y');
  featureMainCard.style.removeProperty('--card-label-x');
  featureMainCard.style.removeProperty('--card-label-y');
  featureMainCard.style.removeProperty('--card-shine-offset-x');
  featureMainCard.style.removeProperty('--card-shine-offset-y');
}

function releaseFeaturedCard3d() {
  recommendationTiltReturning = true;
  Object.keys(recommendationTiltTarget).forEach((key) => { recommendationTiltTarget[key] = 0; });
  queueFeaturedCard3d();
}

function measureFeaturedCardBounds() {
  const columnBounds = featureMainColumn.getBoundingClientRect();
  const width = featureMainCard.offsetWidth;
  const height = featureMainCard.offsetHeight;
  return {
    left: columnBounds.left,
    top: columnBounds.top,
    right: columnBounds.left + width,
    bottom: columnBounds.top + height,
    width,
    height,
  };
}

featureMainColumn.addEventListener('pointerenter', (event) => {
  if (reducedCardMotion.matches || event.pointerType === 'touch') return;
  recommendationCardBounds = measureFeaturedCardBounds();
});

featureMainColumn.addEventListener('pointermove', (event) => {
  if (reducedCardMotion.matches || event.pointerType === 'touch' || featureMainCard.classList.contains('is-switching')) return;
  const bounds = recommendationCardBounds || measureFeaturedCardBounds();
  const isInsideCard = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!isInsideCard) {
    releaseFeaturedCard3d();
    return;
  }
  const horizontal = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const vertical = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  const offsetX = horizontal - .5;
  const offsetY = vertical - .5;
  recommendationTiltReturning = false;
  featureMainCard.classList.add('is-3d-active');
  recommendationTiltTarget.rotateX = -offsetY * 8;
  recommendationTiltTarget.rotateY = offsetX * 10;
  recommendationTiltTarget.imageX = -offsetX * 7;
  recommendationTiltTarget.imageY = -offsetY * 6;
  recommendationTiltTarget.labelX = offsetX * 12;
  recommendationTiltTarget.labelY = offsetY * 10;
  recommendationTiltTarget.shineX = offsetX * 130;
  recommendationTiltTarget.shineY = offsetY * 96;
  queueFeaturedCard3d();
});

featureMainColumn.addEventListener('pointerleave', releaseFeaturedCard3d);
featureMainColumn.addEventListener('pointercancel', releaseFeaturedCard3d);

function syncFeaturedProfile() {
  const name = featureMainCard.querySelector('h3')?.textContent?.trim() || '主播';
  const intro = featureMainCard.querySelector('.recommendation-overlay p')?.textContent?.trim() || '';
  recommendationTitle.textContent = name;
  recommendationHostIntro.textContent = intro;
  recommendationChatControl?.setAttribute('aria-label', `与 ${name} 聊天`);
}

function syncFeatureCardLabels() {
  document.querySelectorAll('.recommendation-card-mini').forEach((card) => {
    const name = card.querySelector('h3')?.textContent || '该主播';
    card.setAttribute('aria-label', `将 ${name} 切换为主图`);
  });
}

function swapFeaturedCard(selectedCard) {
  if (!selectedCard || selectedCard.classList.contains('is-switching')) return;
  const selectedName = selectedCard.querySelector('h3')?.textContent || '该主播';
  resetFeaturedCard3d();
  featureMainCard.classList.add('is-switching');
  selectedCard.classList.add('is-switching');

  window.setTimeout(() => {
    const mainChildren = [...featureMainCard.childNodes].filter((child) => child !== recommendationChatControl);
    const selectedChildren = [...selectedCard.childNodes];
    const mainCategory = featureMainCard.dataset.category;
    const mainTitle = featureMainCard.dataset.title;

    featureMainCard.replaceChildren(...selectedChildren, recommendationChatControl);
    selectedCard.replaceChildren(...mainChildren);
    featureMainCard.dataset.category = selectedCard.dataset.category;
    featureMainCard.dataset.title = selectedCard.dataset.title;
    selectedCard.dataset.category = mainCategory;
    selectedCard.dataset.title = mainTitle;

    syncFeaturedProfile();
    featureMainCard.classList.remove('is-switching');
    selectedCard.classList.remove('is-switching');
    featureMainCard.classList.add('is-swap-entering');
    selectedCard.classList.add('is-swap-entering');
    syncFeatureCardLabels();
    filterRecommendations();
    showToast(`已切换至 ${selectedName}`);

    window.setTimeout(() => {
      featureMainCard.classList.remove('is-swap-entering');
      selectedCard.classList.remove('is-swap-entering');
    }, 580);
  }, 210);
}

recommendationFeature.addEventListener('click', (event) => {
  swapFeaturedCard(event.target.closest('.recommendation-card-mini'));
});

recommendationFeature.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const selectedCard = event.target.closest('.recommendation-card-mini');
  if (!selectedCard) return;
  event.preventDefault();
  swapFeaturedCard(selectedCard);
});

syncFeatureCardLabels();
syncFeaturedProfile();

recommendationChatControl?.addEventListener('click', () => {
  const activeMedia = featureMainCard.querySelector('video, img');
  const profile = {
    name: featureMainCard.querySelector('h3')?.textContent?.trim() || '主播',
    role: 'Realita 主播',
    line: featureMainCard.querySelector('.recommendation-overlay p')?.textContent?.trim() || '很高兴见到你',
    video: activeMedia?.tagName === 'VIDEO' ? activeMedia.getAttribute('src') || '' : '',
    image: activeMedia?.tagName === 'IMG' ? activeMedia.getAttribute('src') || '' : '',
  };
  try {
    sessionStorage.setItem('realitaCallProfile', JSON.stringify(profile));
  } catch {
    sessionStorage.removeItem('realitaCallProfile');
  }
  window.location.href = './call.html';
});

function setUploadFeedback(message, isError = false) {
  recommendationUploadFeedback.textContent = message;
  recommendationUploadFeedback.classList.toggle('error', isError);
}

function useRecommendationImage(file) {
  if (!file) return;
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    setUploadFeedback('请选择 JPG、PNG 或 WEBP 图片', true);
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setUploadFeedback('图片不能超过 10MB', true);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    let customCard = document.querySelector('.custom-recommendation');
    if (!customCard) {
      customCard = document.createElement('article');
      customCard.className = 'recommendation-card custom-recommendation';
      customCard.dataset.category = 'custom';
      customCard.innerHTML = `
        <img alt="我的自定义虚拟人物" />
        <div class="recommendation-overlay">
          <span>自定义</span>
          <div><h3>我的虚拟人物</h3><p>由本地图片创建</p></div>
          <button type="button" aria-label="选择我的虚拟人物">↗</button>
        </div>`;
      const recommendationGrid = document.querySelector('#recommendationGrid');
      recommendationGrid.hidden = false;
      recommendationGrid.append(customCard);
      bindFavoriteButton(customCard.querySelector('.recommendation-overlay button'));
    }

    customCard.dataset.title = `我的虚拟人物 ${file.name}`;
    customCard.querySelector('img').src = reader.result;
    setUploadFeedback(`已载入 ${file.name}`);
    if (recommendationSearch) recommendationSearch.value = '';
    const customFilterButton = document.querySelector('.recommendation-tabs button[data-filter="custom"]');
    if (customFilterButton) {
      customFilterButton.click();
    } else {
      activeRecommendationFilter = 'all';
      filterRecommendations();
    }
    showToast('图片已添加到自定义虚拟人物');
    recommendationUpload.value = '';
  });
  reader.addEventListener('error', () => setUploadFeedback('图片读取失败，请重新选择', true));
  reader.readAsDataURL(file);
}

recommendationUpload.addEventListener('change', () => useRecommendationImage(recommendationUpload.files[0]));

['dragenter', 'dragover'].forEach((type) => {
  recommendationUploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    recommendationUploadZone.classList.add('dragging');
  });
});

['dragleave', 'drop'].forEach((type) => {
  recommendationUploadZone.addEventListener(type, (event) => {
    event.preventDefault();
    recommendationUploadZone.classList.remove('dragging');
  });
});

recommendationUploadZone.addEventListener('drop', (event) => {
  useRecommendationImage(event.dataTransfer.files[0]);
});

if (presenceCallVideo) {
  presenceCallVideo.addEventListener('mouseenter', () => {
    if (!presenceCallVideo.ended) return;
    presenceCallVideo.currentTime = 0;
    presenceCallVideo.play().catch(() => {});
  });
}

resetPerformanceControls();
syncPerformanceScrollButtons();
layoutBendingGallery();
startCarouselAutoplay();
