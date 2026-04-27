/* ===========================
   Priorvia — main.js
=========================== */

// ---- Navbar scroll effect ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

// ---- Hamburger menu ----
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) {
    navLinks.classList.remove('open');
  }
});

// ---- Scroll reveal ----
const revealEls = document.querySelectorAll('.reveal, .reveal-delay');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => observer.observe(el));

// ---- Modal helpers ----
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
  document.body.style.overflow = '';
}

// Open Sign In (Using ?. prevents errors if the button isn't on the page)
document.getElementById('signin-btn')?.addEventListener('click', (e) => { e.preventDefault(); openModal('signin-modal'); });
document.getElementById('close-signin')?.addEventListener('click', () => closeModal('signin-modal'));

// Open Sign Up
document.getElementById('signup-btn')?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup-modal'); });
document.getElementById('hero-signup')?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup-modal'); });
document.getElementById('cta-btn')?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup-modal'); });
document.getElementById('free-plan-btn')?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup-modal'); });
document.getElementById('team-plan-btn')?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup-modal'); });
document.getElementById('close-signup')?.addEventListener('click', () => closeModal('signup-modal'));
document.getElementById('enterprise-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeModal('signup-modal');
  // showToast('Kısa sürede sizinle iletişime geçeceğiz!'); // Uncomment if you have this function
});

// Switch between modals
document.getElementById('go-signup')?.addEventListener('click', (e) => {
  e.preventDefault(); // Stops the link from refreshing the page
  closeModal('signin-modal');
  openModal('signup-modal');
});

document.getElementById('go-signin')?.addEventListener('click', (e) => {
  e.preventDefault(); // Stops the link from refreshing the page
  closeModal('signup-modal');
  openModal('signin-modal');
});

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});

// ---- Toggle password visibility ----
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    } else {
      input.type = 'password';
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  });
});

// ---- Password strength ----
const pwInput = document.getElementById('signup-password');
const pwFill  = document.getElementById('pw-fill');
const pwLabel = document.getElementById('pw-label');

if (pwInput) {
  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const widths = ['0%', '25%', '50%', '75%', '100%'];
    const colors = ['#E53E3E', '#E53E3E', '#F59E0B', '#74C69D', '#2D6A4F'];
    const labels = ['Şifre gücü', 'Zayıf', 'Orta', 'İyi', 'Güçlü'];

    pwFill.style.width  = widths[score];
    pwFill.style.background = colors[score];
    pwLabel.textContent = labels[score];
  });
}

// ---- Form validation ----
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setError(inputId, errId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  if (input) input.classList.toggle('error', !!msg);
  if (err)   err.textContent = msg || '';
  return !!msg;
}

// Sign In Form
document.getElementById('signin-form').addEventListener('submit', (e) => {
  e.preventDefault();
  let hasError = false;

  const email = document.getElementById('signin-email').value.trim();
  const pw    = document.getElementById('signin-password').value;

  hasError = setError('signin-email', 'signin-email-err',
    !email ? 'E-posta adresi gerekli.' :
    !validateEmail(email) ? 'Geçerli bir e-posta girin.' : '') || hasError;

  hasError = setError('signin-password', 'signin-pw-err',
    !pw ? 'Şifre gerekli.' :
    pw.length < 8 ? 'Şifre en az 8 karakter olmalı.' : '') || hasError;

  if (!hasError) {
    closeModal('signin-modal');
    showToast('Giriş başarılı! Hoş geldiniz 👋');
  }
});

// Sign Up Form
document.getElementById('signup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  let hasError = false;

  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pw    = document.getElementById('signup-password').value;
  const terms = document.getElementById('terms-check').checked;

  hasError = setError('signup-name', 'signup-name-err',
    !name ? 'Ad Soyad gerekli.' :
    name.length < 3 ? 'En az 3 karakter girin.' : '') || hasError;

  hasError = setError('signup-email', 'signup-email-err',
    !email ? 'E-posta adresi gerekli.' :
    !validateEmail(email) ? 'Geçerli bir e-posta girin.' : '') || hasError;

  hasError = setError('signup-password', 'signup-pw-err',
    !pw ? 'Şifre gerekli.' :
    pw.length < 8 ? 'Şifre en az 8 karakter olmalı.' : '') || hasError;

  const termsErr = document.getElementById('terms-err');
  if (!terms) {
    termsErr.textContent = 'Kullanım şartlarını kabul etmelisiniz.';
    hasError = true;
  } else {
    termsErr.textContent = '';
  }

  if (!hasError) {
    closeModal('signup-modal');
    showToast('Hesabınız oluşturuldu! Hoş geldiniz 🎉');
  }
});

// Clear errors on input
['signin-email','signin-password','signup-name','signup-email','signup-password'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      el.classList.remove('error');
      const errId = id.replace('signin-', 'signin-').replace('-', '-') + '-err';
      // map to error span ids
      const map = {
        'signin-email':    'signin-email-err',
        'signin-password': 'signin-pw-err',
        'signup-name':     'signup-name-err',
        'signup-email':    'signup-email-err',
        'signup-password': 'signup-pw-err',
      };
      const errEl = document.getElementById(map[id]);
      if (errEl) errEl.textContent = '';
    });
  }
});

// ---- Toast ----
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}