import React from 'react';
import { Link } from 'react-router-dom';
import './AuthorWords.css';

export default function AuthorWords() {
  return (
    <div className="author-page">
      <header className="home__header">
        <span className="home__title">作者的话</span>
        <nav className="home__nav">
          <Link to="/">返回主页</Link>
        </nav>
      </header>

      <main className="author-page__main">
        <p>关于《在日落下相遇》，我喜欢日落，比起日出。</p>
        <p>它象征着结束，也象征着开始。</p><br/>
        <p>我设置了两个模式，送给两年前的、现在的自己：</p>
        <p><strong>随机匹配模式。</strong>在我对恋爱关系充满幻想的时候，我偏执地认为，爱与缘分可以克服一切。可是，现实却告诉我，人与人之间，或许只是渐行渐远的相交线。</p>
        <p><strong>缘分匹配模式。</strong>我希望，我遇到的人也可以与我一样，充满着对于美好恋爱的追求；我希望，我也可以成为他的例外；我希望，我们可以有未来。</p>
        <p>最后，故事的开篇是真诚；结尾，也是。</p>
        <p>愿你我继续保持对于美好爱意的真挚。</p>
        <p>致谢，我遇到的每一个人，待我真诚。</p>
        <p>联系我：ccwevelyncambridge@outlook.com</p>
      </main>
    </div>
  );
}
