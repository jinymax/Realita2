const remoteVideo = document.querySelector('#remoteVideo');
const remoteImage = document.querySelector('#remoteImage');
const remoteVideoBackdrop = document.querySelector('#remoteVideoBackdrop');
const remoteImageBackdrop = document.querySelector('#remoteImageBackdrop');
const callStage = document.querySelector('#callStage');
const profileName = document.querySelector('#profileName');
const profileRole = document.querySelector('#profileRole');
const chatProfileName = document.querySelector('#chatProfileName');
const welcomeMessage = document.querySelector('#welcomeMessage');
const remoteSound = document.querySelector('#remoteSound');
const callTimer = document.querySelector('#callTimer');
const micControl = document.querySelector('#micControl');
const cameraControl = document.querySelector('#cameraControl');
const keyboardControl = document.querySelector('#keyboardControl');
const hangupControl = document.querySelector('#hangupControl');
const localPreview = document.querySelector('#localPreview');
const localVideo = document.querySelector('#localVideo');
const previewLabel = document.querySelector('#previewLabel');
const chatDrawer = document.querySelector('#chatDrawer');
const closeChat = document.querySelector('#closeChat');
const chatForm = document.querySelector('#chatForm');
const chatInput = document.querySelector('#chatInput');
const messages = document.querySelector('#messages');
const callToast = document.querySelector('#callToast');
const callPerformanceControls = [...document.querySelectorAll('.call-performance-control')];
const isEmbeddedCall = window.parent !== window;
document.body.classList.toggle('is-banner-embed', isEmbeddedCall);

window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.data?.type !== 'realita-call-layout') return;
  document.body.classList.toggle('is-banner-embed', event.data.layout === 'banner');
});

function syncRemoteMediaRatio(media) {
  const width = media.videoWidth || media.naturalWidth;
  const height = media.videoHeight || media.naturalHeight;
  if (width && height) callStage.style.setProperty('--remote-media-ratio', `${width} / ${height}`);
}

remoteVideo.addEventListener('loadedmetadata', () => syncRemoteMediaRatio(remoteVideo));
remoteImage.addEventListener('load', () => syncRemoteMediaRatio(remoteImage));

const defaultProfile = {
  name: '小鹿酱',
  role: '甜心主播',
  line: '欢迎来到小鹿酱的直播间',
  video: './assets/live-streamer-banner-female-v2.m4v',
  image: '',
};

let profile = defaultProfile;
try {
  const embeddedProfile = new URLSearchParams(window.location.search).get('profile');
  const storedProfile = sessionStorage.getItem('realitaCallProfile') || '{}';
  profile = { ...defaultProfile, ...JSON.parse(embeddedProfile || storedProfile) };
} catch {}

profileName.textContent = profile.name;
profileRole.textContent = `${profile.role} · AI 视频对话`;
chatProfileName.textContent = profile.name;
welcomeMessage.textContent = profile.line;

// Reveal the embedded call only once its media can render a first frame.
if (isEmbeddedCall) {
  const media = profile.video ? remoteVideo : remoteImage;
  const readyEvent = profile.video ? 'loadeddata' : 'load';
  media.addEventListener(readyEvent, () => {
    window.parent.postMessage({ type: 'realita-call-ready' }, '*');
  }, { once: true });
  media.addEventListener('error', () => {
    window.parent.postMessage({ type: 'realita-call-media-error' }, '*');
  }, { once: true });
}

if (profile.video) {
  remoteVideo.src = profile.video;
  remoteVideoBackdrop.src = profile.video;
  remoteVideo.classList.remove('is-hidden');
  remoteVideoBackdrop.classList.remove('is-hidden');
  remoteImage.classList.add('is-hidden');
  remoteImageBackdrop.classList.add('is-hidden');
  remoteVideoBackdrop.play().catch(() => {});
  remoteVideo.play().then(() => {
    remoteSound.setAttribute('aria-label', '静音');
    remoteSound.title = '静音';
    remoteSound.classList.add('is-on');
  }).catch(() => {
    remoteVideo.muted = true;
    remoteVideo.play().catch(() => {});
  });
} else {
  const imageSource = profile.image || './assets/avatar-momo.svg';
  remoteImage.src = imageSource;
  remoteImageBackdrop.src = imageSource;
  remoteImage.classList.remove('is-hidden');
  remoteImageBackdrop.classList.remove('is-hidden');
  remoteVideo.classList.add('is-hidden');
  remoteVideoBackdrop.classList.add('is-hidden');
  remoteSound.hidden = true;
}

let elapsedSeconds = 0;
const timer = window.setInterval(() => {
  elapsedSeconds += 1;
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');
  callTimer.textContent = `${minutes}:${seconds}`;
}, 1000);

let toastTimer;
function showCallToast(message) {
  window.clearTimeout(toastTimer);
  callToast.textContent = message;
  callToast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => callToast.classList.remove('is-visible'), 2200);
}

function replayRemoteVideo() {
  if (!profile.video) return;
  const replay = () => {
    remoteVideo.currentTime = 0;
    remoteVideo.play().catch(() => {});
    if (remoteVideoBackdrop.readyState >= 1) {
      remoteVideoBackdrop.currentTime = 0;
      remoteVideoBackdrop.play().catch(() => {});
    }
  };
  if (remoteVideo.readyState >= 1) replay();
  else remoteVideo.addEventListener('loadedmetadata', replay, { once: true });
}

callPerformanceControls.forEach((button) => {
  button.addEventListener('click', () => {
    const groupSelector = button.dataset.action ? '[data-action]' : '[data-emotion]';
    const shouldActivate = button.getAttribute('aria-pressed') !== 'true';

    callPerformanceControls
      .filter((control) => control.matches(groupSelector))
      .forEach((control) => {
        const active = shouldActivate && control === button;
        control.classList.toggle('active', active);
        control.setAttribute('aria-pressed', String(active));
      });

    replayRemoteVideo();
    const label = button.lastElementChild.textContent;
    showCallToast(shouldActivate ? `已应用「${label}」效果` : `已关闭「${label}」效果`);
  });
});

remoteSound.addEventListener('click', () => {
  remoteVideo.muted = !remoteVideo.muted;
  const soundLabel = remoteVideo.muted ? '开启声音' : '静音';
  remoteSound.setAttribute('aria-label', soundLabel);
  remoteSound.title = soundLabel;
  remoteSound.classList.toggle('is-on', !remoteVideo.muted);
  if (remoteVideo.paused) remoteVideo.play().catch(() => {});
});

let micStream;
micControl.addEventListener('click', async () => {
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
    micControl.classList.remove('is-active');
    micControl.setAttribute('aria-pressed', 'false');
    micControl.setAttribute('aria-label', '打开麦克风');
    showCallToast('麦克风已关闭');
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micControl.classList.add('is-active');
    micControl.setAttribute('aria-pressed', 'true');
    micControl.setAttribute('aria-label', '关闭麦克风');
    showCallToast('麦克风已开启');
  } catch {
    showCallToast('无法使用麦克风，请检查浏览器权限');
  }
});

let cameraStream;

function showLocalStream(stream, label) {
  localVideo.srcObject = stream;
  previewLabel.textContent = label;
  localPreview.classList.remove('is-hidden');
  localPreview.classList.remove('is-sharing');
}

function hideLocalPreviewIfIdle() {
  if (!cameraStream) {
    localVideo.srcObject = null;
    localPreview.classList.add('is-hidden');
  }
}

cameraControl.addEventListener('click', async () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    cameraControl.classList.remove('is-active');
    cameraControl.setAttribute('aria-pressed', 'false');
    cameraControl.setAttribute('aria-label', '打开摄像头');
    hideLocalPreviewIfIdle();
    showCallToast('摄像头已关闭');
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraControl.classList.add('is-active');
    cameraControl.setAttribute('aria-pressed', 'true');
    cameraControl.setAttribute('aria-label', '关闭摄像头');
    showLocalStream(cameraStream, '你');
    showCallToast('摄像头已开启');
  } catch {
    showCallToast('无法使用摄像头，请检查浏览器权限');
  }
});

function setChatOpen(open) {
  chatDrawer.classList.toggle('is-open', open);
  document.body.classList.toggle('chat-open', open);
  keyboardControl.classList.toggle('is-active', open);
  keyboardControl.setAttribute('aria-pressed', String(open));
  keyboardControl.setAttribute('aria-label', open ? '关闭文字对话' : '打开文字对话');
  chatDrawer.setAttribute('aria-hidden', 'false');
  if (open) window.setTimeout(() => chatInput.focus(), 220);
}

keyboardControl.addEventListener('click', () => {
  const shouldOpen = !chatDrawer.classList.contains('is-open');
  setChatOpen(shouldOpen);
  if (shouldOpen) chatInput.focus();
});
closeChat.addEventListener('click', () => setChatOpen(false));

function appendMessage(text, type) {
  const message = document.createElement('div');
  message.className = `message ${type === 'user' ? 'user-message' : 'ai-message'}`;
  const content = document.createElement('span');
  content.textContent = text;
  const time = document.createElement('small');
  time.textContent = '刚刚';
  message.append(content, time);
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  appendMessage(text, 'user');
  chatInput.value = '';
  const typing = document.createElement('div');
  typing.className = 'message ai-message typing-message';
  typing.innerHTML = '<i></i><i></i><i></i>';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;
  window.setTimeout(() => {
    typing.remove();
    appendMessage(`我听到了。关于“${text.slice(0, 24)}”，我们可以继续聊聊。`, 'ai');
  }, 720);
});

function stopStream(stream) {
  if (stream) stream.getTracks().forEach((track) => track.stop());
}

hangupControl.addEventListener('click', () => {
  window.clearInterval(timer);
  stopStream(micStream);
  stopStream(cameraStream);
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'realita-call-ended' }, '*');
    return;
  }
  window.location.href = './index.html#studio';
});

window.addEventListener('beforeunload', () => {
  stopStream(micStream);
  stopStream(cameraStream);
});

window.addEventListener('wheel', (event) => {
  if (window.parent !== window && event.deltaY) {
    window.parent.postMessage({ type: 'realita-call-scroll', deltaY: event.deltaY }, '*');
  }
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && chatDrawer.classList.contains('is-open')) setChatOpen(false);
});
