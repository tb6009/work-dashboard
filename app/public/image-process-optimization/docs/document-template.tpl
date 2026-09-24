<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="$description$">
  <title>$title$ · 이미지 제작프로세스최적화</title>
  <link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
  <link rel="stylesheet" href="document.css">
</head>
<body data-page="$page$">
  <header class="site-head">
    <nav class="site-nav" aria-label="문서 메뉴">
      <a class="site-brand" href="../index.html">이미지 제작<span>프로세스최적화</span></a>
      <div class="site-links">
        <a href="../index.html">매거진</a>
        <a href="overview.html" data-page-link="overview">통합 안내</a>
        <a href="prompt-first.html" data-page-link="prompt-first">01 프롬프트</a>
        <a href="geometry-first.html" data-page-link="geometry-first">02 정교한 제작</a>
        <a href="operations.html" data-page-link="operations">기록 규칙</a>
      </div>
    </nav>
  </header>
  <main class="doc-shell">
    <article class="doc-article">$body$
      <nav class="doc-next" aria-label="이전·다음 문서">$if(prev_url)$<a href="$prev_url$">← $prev_label$</a>$else$<span></span>$endif$$if(next_url)$<a href="$next_url$">$next_label$ →</a>$endif$</nav>
    </article>
    <aside class="doc-toc" aria-label="현재 문서 목차"><strong>ON THIS PAGE</strong>$toc$</aside>
  </main>
  <footer class="site-footer"><div><span>IMAGE PROCESS OPTIMIZATION · RELEASE 2026.09</span><span>원본 Markdown과 함께 관리되는 HTML 문서</span></div></footer>
  <script>
    const page=document.body.dataset.page;
    document.querySelector(`[data-page-link="${page}"]`)?.setAttribute('aria-current','page');
  </script>
</body>
</html>
