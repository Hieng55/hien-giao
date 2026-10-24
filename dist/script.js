const openingScreen = document.querySelector('#openingScreen');
const mainContent = document.querySelector('#mainContent');
const toast = document.querySelector('#toast');
const scrollProgress = document.querySelector('#scrollProgress');
const backgroundMusic = document.querySelector('#backgroundMusic');
const scrollTopButton = document.querySelector('#scrollTopButton');
document.documentElement.classList.add('js-ready');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelector('#openInvitation').addEventListener('click', () => {
  backgroundMusic.volume = 0.55;
  backgroundMusic.play().catch(() => {});
  scrollTopButton.classList.remove('is-visible');
  openingScreen.classList.add('opened');
  mainContent.classList.add('is-open');
  document.body.classList.remove('locked');
  mainContent.setAttribute('aria-hidden', 'false');
  setTimeout(() => scrollTo({ top: 0, left: 0, behavior: 'smooth' }), 250);
});

const weddingDate = new Date('2026-11-22T18:00:00+07:00');
function updateCountdown() {
  const difference = weddingDate - new Date();
  const node = document.querySelector('#countdown');
  if (difference <= 0) {
    node.textContent = 'Hôm nay là ngày chúng mình về chung một nhà!';
    return;
  }
  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  const seconds = Math.floor((difference % 60000) / 1000);
  node.textContent = `${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`;
}
updateCountdown();
setInterval(updateCountdown, 1000);

const calendar = document.querySelector('#calendarDays');
for (let blank = 0; blank < 6; blank += 1) calendar.insertAdjacentHTML('beforeend', '<span class="muted">0</span>');
for (let day = 1; day <= 30; day += 1) calendar.insertAdjacentHTML('beforeend', `<span class="${day === 22 ? 'wedding-day' : ''}">${day}</span>`);

document.querySelector('#addCalendar').addEventListener('click', () => {
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','DTSTART:20261122T110000Z','DTEND:20261122T140000Z','SUMMARY:Lễ cưới Ngọc Giao & Phương Hiển','LOCATION:491 Nguyễn Văn Quá, P. Đông Hưng Thuận, TP. HCM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  link.download = 'le-cuoi-ngoc-giao-phuong-hien.ics';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Ngày vui đã được thêm vào lịch của bạn');
});

const dialog = document.querySelector('#rsvpDialog');
document.querySelector('#rsvpButton').addEventListener('click', () => dialog.showModal());
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('#rsvpForm').addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.querySelector('#rsvpName').value.trim();
  if (!name) return;
  const submitButton = event.target.querySelector('.dialog-submit');
  const submitLabel = submitButton.querySelector('span');
  const response = {
    name,
    choice: document.querySelector('#rsvpChoice').value,
    guests: document.querySelector('#guestCount').value,
    website: document.querySelector('#rsvpWebsite').value
  };

  submitButton.disabled = true;
  submitLabel.textContent = 'ĐANG GỬI...';

  try {
    const request = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    });
    const result = await request.json().catch(() => ({}));
    if (!request.ok) throw new Error(result.error || 'Không thể gửi xác nhận');

    localStorage.setItem('wedding-rsvp', JSON.stringify(response));
    dialog.close();
    event.target.reset();
    showToast(`Cảm ơn ${name}! Xác nhận đã được gửi đến cô dâu chú rể.`);
  } catch (error) {
    showToast('Chưa gửi được xác nhận. Vui lòng thử lại sau.');
  } finally {
    submitButton.disabled = false;
    submitLabel.textContent = 'GỬI XÁC NHẬN';
  }
});

const galleryCarousel = document.querySelector('#galleryCarousel');
const galleryTrack = document.querySelector('#galleryTrack');
const galleryItems = [...galleryTrack.querySelectorAll('.gallery-item')];
const galleryDots = [...document.querySelectorAll('#galleryPagination button')];
const galleryLightbox = document.querySelector('#galleryLightbox');
const galleryLightboxImage = document.querySelector('#galleryLightboxImage');
const galleryCounter = document.querySelector('#galleryCounter');
let activeGalleryIndex = 0;
let galleryImageRequest = 0;
const galleryCloneCount = 2;
let carouselIndex = galleryCloneCount;
let carouselTimer;
let carouselVisible = false;
let dragPointer = null;
let dragStartX = 0;
let dragDistance = 0;
let suppressGalleryClick = false;

function createGalleryClone(item) {
  const clone = item.cloneNode(true);
  clone.dataset.clone = 'true';
  clone.tabIndex = -1;
  clone.setAttribute('aria-hidden', 'true');
  return clone;
}

const leadingGalleryClones = galleryItems.slice(-galleryCloneCount).map(createGalleryClone);
const trailingGalleryClones = galleryItems.slice(0, galleryCloneCount).map(createGalleryClone);
galleryTrack.prepend(...leadingGalleryClones);
galleryTrack.append(...trailingGalleryClones);

function realCarouselIndex() {
  return (carouselIndex - galleryCloneCount + galleryItems.length) % galleryItems.length;
}

function updateGalleryDots() {
  const current = realCarouselIndex();
  galleryDots.forEach((dot, index) => dot.classList.toggle('is-active', index === current));
}

function positionGalleryTrack(animate = true, offset = 0) {
  const gap = Number.parseFloat(getComputedStyle(galleryTrack).columnGap) || 0;
  const slideWidth = galleryTrack.querySelector('.gallery-item').getBoundingClientRect().width;
  galleryTrack.style.transition = animate ? 'transform .65s cubic-bezier(.22,.72,.24,1)' : 'none';
  galleryTrack.style.transform = `translate3d(${-(carouselIndex * (slideWidth + gap)) + offset}px,0,0)`;
  updateGalleryDots();
}

function stopGalleryAutoplay() {
  clearInterval(carouselTimer);
}

function startGalleryAutoplay() {
  stopGalleryAutoplay();
  if (!carouselVisible || galleryLightbox.open || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  carouselTimer = setInterval(() => {
    carouselIndex += 1;
    positionGalleryTrack();
  }, 3800);
}

positionGalleryTrack(false);
updateGalleryDots();

galleryTrack.addEventListener('transitionend', () => {
  if (carouselIndex < galleryCloneCount) carouselIndex += galleryItems.length;
  if (carouselIndex >= galleryItems.length + galleryCloneCount) carouselIndex -= galleryItems.length;
  positionGalleryTrack(false);
});

galleryDots.forEach((dot, index) => dot.addEventListener('click', () => {
  carouselIndex = index + galleryCloneCount;
  positionGalleryTrack();
  startGalleryAutoplay();
}));

galleryCarousel.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  stopGalleryAutoplay();
  dragPointer = event.pointerId;
  dragStartX = event.clientX;
  dragDistance = 0;
  galleryCarousel.classList.add('is-dragging');
  galleryCarousel.setPointerCapture(event.pointerId);
  positionGalleryTrack(false);
});

galleryCarousel.addEventListener('pointermove', event => {
  if (event.pointerId !== dragPointer) return;
  dragDistance = event.clientX - dragStartX;
  positionGalleryTrack(false, dragDistance);
});

function finishGalleryDrag(event) {
  if (event.pointerId !== dragPointer) return;
  const threshold = Math.min(70, galleryCarousel.clientWidth * .12);
  if (dragDistance < -threshold) carouselIndex += 1;
  if (dragDistance > threshold) carouselIndex -= 1;
  suppressGalleryClick = Math.abs(dragDistance) > 6;
  dragPointer = null;
  dragDistance = 0;
  galleryCarousel.classList.remove('is-dragging');
  positionGalleryTrack();
  startGalleryAutoplay();
  setTimeout(() => { suppressGalleryClick = false; }, 0);
}

galleryCarousel.addEventListener('pointerup', finishGalleryDrag);
galleryCarousel.addEventListener('pointercancel', finishGalleryDrag);
galleryCarousel.addEventListener('click', event => {
  if (!suppressGalleryClick) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
galleryCarousel.addEventListener('mouseenter', stopGalleryAutoplay);
galleryCarousel.addEventListener('mouseleave', startGalleryAutoplay);
addEventListener('resize', () => positionGalleryTrack(false));
document.addEventListener('visibilitychange', startGalleryAutoplay);

new IntersectionObserver(entries => {
  carouselVisible = entries[0].isIntersecting;
  if (carouselVisible) startGalleryAutoplay();
  else stopGalleryAutoplay();
}, { threshold: .25 }).observe(galleryCarousel);

function showGalleryImage(index) {
  activeGalleryIndex = (index + galleryItems.length) % galleryItems.length;
  const thumbnail = galleryItems[activeGalleryIndex].querySelector('img');
  const fullSource = galleryItems[activeGalleryIndex].dataset.full;
  const requestId = ++galleryImageRequest;
  galleryLightboxImage.alt = thumbnail.alt;
  galleryCounter.textContent = `${activeGalleryIndex + 1} / ${galleryItems.length}`;
  const thumbnailSource = thumbnail.currentSrc || thumbnail.src;

  // The 1200px gallery image is already cached and is sharp enough for phones.
  // Switching to it directly keeps touch navigation instant on mobile Safari.
  if (matchMedia('(max-width: 700px), (pointer: coarse)').matches) {
    galleryLightboxImage.src = thumbnailSource;
    return;
  }

  const highResolutionImage = new Image();
  const isChangingImage = galleryLightbox.open;

  if (!isChangingImage) galleryLightboxImage.src = thumbnailSource;

  highResolutionImage.onload = () => {
    if (requestId !== galleryImageRequest) return;
    galleryLightboxImage.src = fullSource;
  };
  highResolutionImage.src = fullSource;
}

galleryItems.forEach((item, index) => item.addEventListener('click', () => {
  const itemBounds = item.getBoundingClientRect();
  galleryLightbox.style.setProperty('--gallery-reveal-x', `${itemBounds.left + itemBounds.width / 2}px`);
  galleryLightbox.style.setProperty('--gallery-reveal-y', `${itemBounds.top + itemBounds.height / 2}px`);
  showGalleryImage(index);
  galleryLightbox.showModal();
  stopGalleryAutoplay();
}));

function closeGalleryLightbox() {
  if (!galleryLightbox.open || galleryLightbox.classList.contains('is-closing')) return;
  galleryLightbox.classList.add('is-closing');
  const closeDelay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
  setTimeout(() => {
    galleryLightbox.close();
    galleryLightbox.classList.remove('is-closing');
  }, closeDelay);
}

document.querySelector('#galleryClose').addEventListener('click', closeGalleryLightbox);

function bindGalleryNavigation(button, direction) {
  let touchHandled = false;

  button.addEventListener('pointerup', event => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    event.preventDefault();
    touchHandled = true;
    showGalleryImage(activeGalleryIndex + direction);
    setTimeout(() => { touchHandled = false; }, 450);
  });

  button.addEventListener('click', () => {
    if (touchHandled) return;
    showGalleryImage(activeGalleryIndex + direction);
  });
}

bindGalleryNavigation(document.querySelector('#galleryPrev'), -1);
bindGalleryNavigation(document.querySelector('#galleryNext'), 1);
galleryLightbox.addEventListener('click', event => {
  if (event.target === galleryLightbox) closeGalleryLightbox();
});
galleryLightbox.addEventListener('cancel', event => {
  event.preventDefault();
  closeGalleryLightbox();
});
galleryLightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showGalleryImage(activeGalleryIndex - 1);
  if (event.key === 'ArrowRight') showGalleryImage(activeGalleryIndex + 1);
});
galleryLightbox.addEventListener('close', startGalleryAutoplay);

const stagedSections = document.querySelectorAll('.family-card, .party-card, .gallery-section, .venue');
stagedSections.forEach(section => {
  [...section.children]
    .filter(node => !node.classList.contains('decor'))
    .forEach((node, index) => {
      node.classList.add('scroll-reveal-item');
      node.style.setProperty('--reveal-delay', `${Math.min(index * 65, 260)}ms`);
    });
});

const itemRevealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    itemRevealObserver.unobserve(entry.target);
  });
}, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.scroll-reveal-item').forEach(node => itemRevealObserver.observe(node));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .08 });
document.querySelectorAll('.reveal').forEach(node => revealObserver.observe(node));

let scrollTicking = false;
function updateScrollEffects() {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
  scrollProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
  document.documentElement.style.setProperty('--page-scroll', `${Math.min(scrollY * .055, 55)}px`);
  scrollTopButton.classList.toggle('is-visible', mainContent.classList.contains('is-open') && scrollY > 520);
  scrollTicking = false;
}
addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(updateScrollEffects);
}, { passive: true });
scrollTopButton.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
updateScrollEffects();
