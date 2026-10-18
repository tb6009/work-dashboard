(() => {
  const bar = document.querySelector('.reading-controls');
  if (!bar) return;
  const nodes = [...document.querySelectorAll('p,li,td,th,figcaption,blockquote,pre')].filter(el => !el.closest('nav,.reading-controls'));
  const bases = nodes.map(el => getComputedStyle(el).fontSize);
  nodes.forEach((el,i) => { el.dataset.readingSize = ''; el.style.setProperty('--reading-base',bases[i]); });
  let step = 0;
  const output = bar.querySelector('output');
  function apply() {
    document.documentElement.style.setProperty('--reading-offset',`${step * 8 / 3}px`);
    output.textContent = step === 0 ? '기본 크기' : `${step > 0 ? '+' : ''}${step * 2}pt`;
    bar.querySelector('[data-size="down"]').disabled = step <= -2;
    bar.querySelector('[data-size="up"]').disabled = step >= 6;
  }
  bar.addEventListener('click', e => {
    const button = e.target.closest('button[data-size]');
    if (!button) return;
    step = button.dataset.size === 'reset' ? 0 : Math.max(-2,Math.min(6,step + (button.dataset.size === 'up' ? 1 : -1)));
    apply();
  });
  apply();
})();
