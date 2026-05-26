// ===== 인트로 영상 제어 =====
const introVideo = document.getElementById("introVideo");
const toggleMute = document.getElementById("toggleMute");
const scrollDown = document.getElementById("scrollDown");
const aboutSec = document.getElementById("about");
const projectsSec = document.getElementById("projects");

// 초기화
(async function initIntro() {
  if (!introVideo) return;

  // 자동재생 정책 대응
  introVideo.muted = true;
  try {
    await introVideo.play();
  } catch (e) {}

  // 탭을 가리면 일시정지, 돌아오면 재생
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) introVideo.pause();
    else introVideo.play().catch(() => {});
  });

  // 뷰포트 보일 때만 재생
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) introVideo.play().catch(() => {});
        else introVideo.pause();
      }
    },
    { threshold: 0.2 }
  );
  io.observe(introVideo);

  // 음소거 토글
  const sync = () => {
    const unmuted = !introVideo.muted;
    if (toggleMute) {
      toggleMute.textContent = unmuted ? "Mute" : "Unmute";
      toggleMute.setAttribute("aria-pressed", String(unmuted));
    }
  };
  sync();

  toggleMute?.addEventListener("click", async () => {
    introVideo.muted = !introVideo.muted;
    if (!introVideo.paused) await introVideo.play().catch(() => {});
    sync();
  });
})();

// ===== 헤더 내비 현재 섹션 활성화 =====
const navLinks = document.querySelectorAll(".nav a");
const sections = [...document.querySelectorAll("section[id]")];
const setActive = () => {
  const y = window.scrollY + 120;
  let current = sections[0]?.id;
  for (const s of sections) {
    if (y >= s.offsetTop) current = s.id;
  }
  navLinks.forEach((a) => {
    a.classList.toggle("is-active", a.getAttribute("href") === `#${current}`);
  });
};
setActive();
window.addEventListener("scroll", setActive);

// ===== Projects 데이터/필터 =====
const state = { query: "", category: "all", format: "all", year: "all" };

const gridEl = document.getElementById("grid");
const emptyEl = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const chips = Array.from(document.querySelectorAll(".chip[data-category]"));
const formatSelect = document.getElementById("formatSelect");
const yearSelect = document.getElementById("yearSelect");
document.getElementById("yearNow").textContent = new Date().getFullYear();

let PROJECTS = []; // data.json을 fetch해서 채움

const normalize = (s = "") => s.toString().toLowerCase().trim();
const by = (k) => (a, b) => a[k] > b[k] ? -1 : a[k] < b[k] ? 1 : 0;

// 데이터 로드
(async function load() {
  try {
    const res = await fetch("data/data.json", { cache: "no-store" });
    PROJECTS = await res.json();
    initYearSelect(PROJECTS);
    applyFilters();
  } catch (e) {
    console.error("data.json 로드 실패:", e);
    if (gridEl && emptyEl) {
      gridEl.innerHTML = "";
      emptyEl.hidden = false;
      emptyEl.textContent =
        "데이터를 불러오지 못했습니다. 새로고침하거나 잠시 후 다시 시도해주세요.";
    }
  }
})();

function initYearSelect(list) {
  if (!yearSelect || !Array.isArray(list)) return;
  const years = Array.from(new Set(list.map((p) => p.year))).sort(
    (a, b) => b - a
  );
  years.forEach((y) => {
    const o = document.createElement("option");
    o.value = String(y);
    o.textContent = y;
    yearSelect.appendChild(o);
  });
}

function renderGrid(list) {
  if (!gridEl || !emptyEl) return;

  gridEl.setAttribute("aria-busy", "true");
  gridEl.innerHTML = "";

  if (!list.length) {
    emptyEl.hidden = false;
    gridEl.setAttribute("aria-busy", "false");
    return;
  }
  emptyEl.hidden = true;

  list.sort(by("year"));

  const frag = document.createDocumentFragment();
  list.forEach((p) => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="card__thumb">
        <img src="${p.thumbnail}" alt="${
      p.title
    } 썸네일" loading="lazy" decoding="async"/>
  </div>
  <div class="card__body">
    <h3 class="card__title">${p.title}</h3>
    <div class="card__meta">
      <span>${labelCategory(p.category)}</span>
      <span>· ${labelFormat(p.format)}</span>
      <span>· ${p.year}</span>
      ${p.duration && p.duration !== "-" ? `<span>· ${p.duration}</span>` : ""}
    </div>
    ${
      p.tags?.length
        ? `<div class="card__tags">${p.tags
            .map((t) => `<span class="tag">#${t}</span>`)
            .join("")}</div>`
        : ""
    }
    <div class="card__actions">
      ${
        p.url
          ? `<a class="card__link" href="${p.url}" target="_blank" rel="noopener">View Project →</a>`
          : ""
      }
      ${
        p.url2
          ? `<a class="card__link card__link--alt" href="${p.url2}" target="_blank" rel="noopener">View Data →</a>`
          : ""
      }
    </div>
  </div>
`;
    frag.appendChild(el);
  });
  gridEl.appendChild(frag);
  gridEl.setAttribute("aria-busy", "false");
}

function labelCategory(c) {
  return (
    {
      "music-video": "Music Video",
      advertising: "Ad/Commercial",
      motion: "Motion Graphics",
      web: "Web/Interactive",
    }[c] || c
  );
}
function labelFormat(f) {
  return (
    {
      vertical: "Vertical 9:16",
      horizontal: "Horizontal 16:9",
      square: "Square 1:1",
    }[f] || f
  );
}

function applyFilters() {
  let list = PROJECTS.slice();
  const q = normalize(state.query);

  if (state.category !== "all")
    list = list.filter((p) => p.category === state.category);
  if (state.format !== "all")
    list = list.filter((p) => p.format === state.format);
  if (state.year !== "all")
    list = list.filter((p) => p.year === Number(state.year));
  if (q) {
    list = list.filter((p) => {
      const hay = normalize(`${p.title} ${p.tags?.join(" ")} ${p.category}`);
      return hay.includes(q);
    });
  }
  renderGrid(list);
}

// 이벤트 바인딩
searchInput?.addEventListener("input", (e) => {
  state.query = e.target.value;
  applyFilters();
});
chips.forEach((btn) => {
  btn.addEventListener("click", () => {
    chips.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.category = btn.dataset.category;
    applyFilters();
  });
});
formatSelect?.addEventListener("change", (e) => {
  state.format = e.target.value;
  applyFilters();
});
yearSelect?.addEventListener("change", (e) => {
  state.year = e.target.value;
  applyFilters();
});

// ===== 라이트/다크 테마 토글 =====
const themeToggle = document.getElementById("themeToggle");
const htmlEl = document.documentElement;

(function initTheme() {
  // 저장된 값 우선, 없으면 시스템 설정 사용
  const saved = localStorage.getItem("theme");
  const prefersLight =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  const initial = saved || (prefersLight ? "light" : "dark");
  setTheme(initial);
})();

themeToggle?.addEventListener("click", () => {
  const next = htmlEl.getAttribute("data-theme") === "light" ? "dark" : "light";
  setTheme(next);
});

function setTheme(mode) {
  htmlEl.setAttribute("data-theme", mode);
  localStorage.setItem("theme", mode);
  if (themeToggle) {
    const isLight = mode === "light";
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.setAttribute(
      "aria-label",
      isLight ? "다크 테마로 전환" : "라이트 테마로 전환"
    );
    themeToggle.title = isLight ? "다크 테마로 전환" : "라이트 테마로 전환";
    themeToggle.querySelector(".icon").textContent = isLight ? "☀️" : "🌙";
  }
}

// ===== Scroll down: 스택 퇴장 + 스크롤 이동 =====
scrollDown?.addEventListener("click", () => {
  document.querySelector(".intro__stack")?.classList.add("stack--exit");
  (aboutSec || projectsSec)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

const preloader = document.getElementById("preloader");
const preloaderFill = document.getElementById("preloaderFill");
const preloaderPercent = document.getElementById("preloaderPercent");

// ===== Fake preloader =====
(function initPreloader() {
  if (!preloader || !preloaderFill || !preloaderPercent) return;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) =>
    t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

function setProgress(value) {
  const v = Math.max(0, Math.min(100, value));

  let visual = v;

  // 89% 전까지는 실제 fill을 살짝 덜 차게
  if (v < 100) {
    visual = v * 0.9; 
  }

  preloaderFill.style.clipPath = `inset(${100 - visual}% 0 0 0)`;
  preloaderPercent.textContent = `${Math.round(v)}%`;
}

  function animateProgress(from, to, duration, easing) {
    return new Promise((resolve) => {
      const start = performance.now();

      function frame(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = easing(t);
        const value = from + (to - from) * eased;

        setProgress(value);

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          setProgress(to);
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  async function run() {
    setProgress(0);

    // 0 -> 65 : 빠르게 오르다가 끝으로 갈수록 감속
    await animateProgress(0, 64, 1450, easeOutCubic);

    // 65에서 살짝 멈춤
    await wait(10);

    // 65 -> 89 : 다시 오르다가 끝으로 갈수록 감속
    await animateProgress(64, 89, 1800, easeOutCubic);

    // 89에서 오래 멈춤
await wait(2100);

// 마지막 한 번에 100
await animateProgress(89, 100, 150, easeInOutCubic);

// 100% 잠깐 유지
await wait(180);

// 블러 + 페이드아웃
preloader.classList.add("preloader--done");

await wait(750);
preloader.remove();

    // 100% 잠깐 유지
    await wait(180);

    // 블러 + 페이드아웃
    preloader.classList.add("preloader--done");

    // 전환 끝나면 DOM에서 제거
    await wait(750);
    preloader.remove();

    
  }

  run();

  
})();

// ===== Header background on scroll =====
const siteHeader = document.querySelector(".site-header");

function toggleHeaderBg() {
  if (!siteHeader) return;

  if (window.scrollY <= 5) {
    siteHeader.classList.add("is-top");
  } else {
    siteHeader.classList.remove("is-top");
  }
}

toggleHeaderBg();
window.addEventListener("scroll", toggleHeaderBg);
