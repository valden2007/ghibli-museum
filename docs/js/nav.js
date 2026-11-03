export function initNav(lenis) {
  const nav = document.querySelector('#main-nav');
  const burger = document.querySelector('.burger');
  const progress = document.querySelector('#scroll-progress');

  if (burger && nav) {
    burger.addEventListener('click', () => {
      nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(nav.classList.contains('open')));
    });
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -60 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  function updateProgress() {
    if (!progress) return;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? (window.scrollY / h) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, p))}%`;
  }

  const sections = Array.from(document.querySelectorAll('section[id]'));
  const links = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];
  const linkMap = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach((a) => a.classList.remove('active'));
          const active = linkMap.get(id);
          if (active) active.classList.add('active');
        }
      });
    },
    { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
  );
  sections.forEach((s) => observer.observe(s));

  window.addEventListener('scroll', updateProgress, { passive: true });
  if (lenis) lenis.on('scroll', updateProgress);
  updateProgress();
}