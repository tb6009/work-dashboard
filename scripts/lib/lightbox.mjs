/**
 * lightbox.mjs — 포트폴리오 공개본 공용 이미지 뷰어
 *
 * 사용법: 빌드 스크립트에서 LIGHTBOX_CSS를 <style>에, LIGHTBOX_JS를 </body> 앞
 * <script>에 넣는다. 페이지 안의 모든 <img>가 대상이 되며, 같은 섹션(또는
 * [data-gallery] 컨테이너) 안의 이미지끼리 ←/→로 넘어간다.
 *
 * - 클릭: 전체 화면 뷰어
 * - FIT / 100% 토글: 화면 맞춤 ↔ 원본 픽셀 크기(드래그로 이동)
 * - ← → : 이전·다음, Esc: 닫기
 * - "새 탭에서 원본 열기": 원본 파일 직접 열기
 */

export const LIGHTBOX_CSS = `
[data-gallery] img,
.gal img, .board img, .pair img, .rej img, .lineage img, figure img { cursor: zoom-in; }
.lb-hint{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-45,#888);
 margin-top:10px;letter-spacing:.02em}
.lb-hint::before{content:"⤢";font-size:13px}

.lb{position:fixed;inset:0;z-index:9999;display:none;background:rgba(12,13,16,.96);
 -webkit-user-select:none;user-select:none}
.lb.is-open{display:block}
.lb-stage{position:absolute;inset:0;overflow:hidden;display:flex;align-items:center;justify-content:center}
.lb-stage.is-zoom{overflow:auto;display:block;cursor:grab}
.lb-stage.is-zoom.is-drag{cursor:grabbing}
.lb-img{display:block;max-width:calc(100vw - 120px);max-height:calc(100vh - 150px);
 object-fit:contain;background:#fff;box-shadow:0 8px 60px rgba(0,0,0,.5)}
.lb-stage.is-zoom .lb-img{max-width:none;max-height:none;margin:auto}

.lb-bar{position:absolute;left:0;right:0;z-index:3;display:flex;align-items:center;gap:14px;
 padding:14px 20px;color:#fff;font-size:12.5px;line-height:1.5}
.lb-bar.top{top:0;background:linear-gradient(rgba(0,0,0,.55),transparent)}
/* 상단 바는 버튼만 클릭을 받고, 나머지 영역은 아래 stage로 통과시킨다 */
.lb-bar.top{pointer-events:none}
.lb-bar.top .lb-btn{pointer-events:auto}
.lb-bar.bot{bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.6));justify-content:center;
 flex-wrap:wrap;text-align:center;pointer-events:none}
.lb-cap{flex:1;min-width:0;font-weight:600;letter-spacing:-.01em;
 overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-count{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.62);white-space:nowrap}
.lb-note{max-width:78ch;color:rgba(255,255,255,.78);font-size:13px;line-height:1.6}
.lb-note b{color:#fff}

.lb-btn{appearance:none;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.06);
 color:#fff;font:inherit;font-size:11.5px;font-weight:700;letter-spacing:.04em;
 padding:6px 11px;cursor:pointer;border-radius:2px;white-space:nowrap}
.lb-btn:hover{background:rgba(255,255,255,.16)}
.lb-btn[aria-pressed="true"]{background:#fff;color:#111}
.lb-btn.x{font-size:16px;line-height:1;padding:5px 10px}
.lb-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:2;
 width:52px;height:80px;display:flex;align-items:center;justify-content:center;
 appearance:none;border:0;background:rgba(0,0,0,.28);color:#fff;font-size:26px;cursor:pointer}
.lb-nav:hover{background:rgba(0,0,0,.55)}
.lb-nav.prev{left:0}.lb-nav.next{right:0}
.lb-nav[hidden]{display:none}
@media(max-width:640px){
  .lb-img{max-width:100vw;max-height:calc(100vh - 170px)}
  .lb-nav{width:40px;height:62px;font-size:20px}
  .lb-bar{padding:10px 12px;gap:8px}
}
`;

export const LIGHTBOX_JS = `
(function(){
  var imgs = [], idx = 0, zoom = false;
  var lb, stage, view, cap, count, note, zbtn, raw, prev, next;

  function collect(el){
    var scope = el.closest('[data-gallery]') || el.closest('section') || document.body;
    return Array.prototype.slice.call(scope.querySelectorAll('img')).filter(function(i){
      return i.naturalWidth !== 0 || i.complete || true;
    });
  }

  function build(){
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.innerHTML =
      '<div class="lb-bar top">'
      + '<span class="lb-cap"></span>'
      + '<span class="lb-count"></span>'
      + '<button class="lb-btn zoom" aria-pressed="false">100%</button>'
      + '<a class="lb-btn raw" target="_blank" rel="noopener">새 탭에서 원본</a>'
      + '<button class="lb-btn x" aria-label="닫기">✕</button>'
      + '</div>'
      + '<div class="lb-stage"><img class="lb-img" alt=""></div>'
      + '<button class="lb-nav prev" aria-label="이전">‹</button>'
      + '<button class="lb-nav next" aria-label="다음">›</button>'
      + '<div class="lb-bar bot"><span class="lb-note"></span></div>';
    document.body.appendChild(lb);
    stage = lb.querySelector('.lb-stage');
    view  = lb.querySelector('.lb-img');
    cap   = lb.querySelector('.lb-cap');
    count = lb.querySelector('.lb-count');
    note  = lb.querySelector('.lb-note');
    zbtn  = lb.querySelector('.zoom');
    raw   = lb.querySelector('.raw');
    prev  = lb.querySelector('.prev');
    next  = lb.querySelector('.next');

    lb.querySelector('.x').addEventListener('click', close);
    prev.addEventListener('click', function(e){ e.stopPropagation(); go(-1); });
    next.addEventListener('click', function(e){ e.stopPropagation(); go(1); });
    zbtn.addEventListener('click', function(e){ e.stopPropagation(); setZoom(!zoom); });
    stage.addEventListener('click', function(e){ if (e.target === stage) close(); });
    view.addEventListener('click', function(e){ e.stopPropagation(); setZoom(!zoom); });

    // 100% 상태에서 드래그로 이동
    var down = false, sx = 0, sy = 0, sl = 0, st = 0;
    stage.addEventListener('mousedown', function(e){
      if (!zoom) return;
      down = true; sx = e.clientX; sy = e.clientY; sl = stage.scrollLeft; st = stage.scrollTop;
      stage.classList.add('is-drag'); e.preventDefault();
    });
    window.addEventListener('mousemove', function(e){
      if (!down) return;
      stage.scrollLeft = sl - (e.clientX - sx);
      stage.scrollTop  = st - (e.clientY - sy);
    });
    window.addEventListener('mouseup', function(){ down = false; stage.classList.remove('is-drag'); });

    document.addEventListener('keydown', function(e){
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
  }

  function meta(img){
    var fig = img.closest('figure');
    var fc = fig && fig.querySelector('figcaption');
    return {
      title: img.getAttribute('data-title') || img.alt || (fc ? fc.textContent.trim() : ''),
      note: img.getAttribute('data-note')
        || (img.closest('.pair') ? (img.closest('.pair').querySelector('.why') || {}).textContent : '')
        || (img.closest('.rej-item') ? (img.closest('.rej-item').querySelector('.why') || {}).textContent : '')
        || ''
    };
  }

  function setZoom(on){
    zoom = on;
    stage.classList.toggle('is-zoom', on);
    zbtn.setAttribute('aria-pressed', String(on));
    zbtn.textContent = on ? 'FIT' : '100%';
    if (on) {
      stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
      stage.scrollTop  = (stage.scrollHeight - stage.clientHeight) / 2;
    }
  }

  function show(){
    var img = imgs[idx];
    var m = meta(img);
    view.src = img.currentSrc || img.src;
    view.alt = m.title;
    cap.textContent = m.title;
    note.textContent = (m.note || '').trim();
    count.textContent = (idx + 1) + ' / ' + imgs.length;
    raw.href = img.currentSrc || img.src;
    prev.hidden = next.hidden = imgs.length < 2;
    setZoom(false);
  }

  function go(d){ idx = (idx + d + imgs.length) % imgs.length; show(); }
  function close(){ lb.classList.remove('is-open'); document.body.style.overflow = ''; view.src = ''; }

  document.addEventListener('click', function(e){
    var img = e.target.closest ? e.target.closest('img') : null;
    if (!img || img.closest('.lb') || img.closest('a[href]')) return;
    if (!lb) build();
    imgs = collect(img);
    idx = Math.max(0, imgs.indexOf(img));
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    show();
  });
})();
`;
