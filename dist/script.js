const openingScreen = document.querySelector('#openingScreen');
const mainContent = document.querySelector('#mainContent');
const toast = document.querySelector('#toast');
const scrollProgress = document.querySelector('#scrollProgress');
document.documentElement.classList.add('js-ready');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelector('#openInvitation').addEventListener('click', () => {
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
document.querySelector('#rsvpForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#rsvpName').value.trim();
  if (!name) return;
  const response = { name, choice: document.querySelector('#rsvpChoice').value, guests: document.querySelector('#guestCount').value };
  localStorage.setItem('wedding-rsvp', JSON.stringify(response));
  dialog.close();
  event.target.reset();
  showToast(`Cảm ơn ${name}! Hẹn gặp bạn trong ngày vui của chúng mình.`);
});

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
  scrollTicking = false;
}
addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(updateScrollEffects);
}, { passive: true });
updateScrollEffects();
