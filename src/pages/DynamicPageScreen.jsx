import React from 'react';
import { useParams } from 'react-router-dom';

const DynamicPageScreen = ({ 
  pages, 
  diagQuestions, 
  diagAnswers, 
  handleSelectDiag, 
  handleRunDiagnostic, 
  diagResultText 
}) => {
  const { slug } = useParams();

  // URLのslugに対応するページデータを取得
  const currentPage = pages.find(p => p.slug === slug);

  if (!currentPage) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 flex-grow w-full text-center">
        <h1 className="text-2xl font-bold text-zinc-800 mb-2">ページが見つかりません</h1>
        <p className="text-zinc-500">お探しのページは削除されたか、URLが間違っている可能性があります。</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 flex-grow w-full">
      <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 mb-6 border-b pb-4">
          {currentPage.title}
        </h1>
        
        {/* 管理画面で作成したHTMLコンテンツを表示 */}
        <div 
          className="prose max-w-none text-zinc-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: currentPage.content }}
        />

        {/* もし診断ツールが組み込まれているページの場合 */}
        {currentPage.hasDiagnostic && (
          <div className="mt-10 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">受講資格診断</h2>
            {/* 診断フォームの処理 */}
            {diagQuestions && diagQuestions.length > 0 ? (
              <div className="space-y-6">
                {diagQuestions.map((q) => (
                  <div key={q.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="font-bold text-zinc-800 mb-3">{q.questionText}</p>
                    <div className="space-y-2">
                      {q.choices?.map((choice, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                          <input 
                            type="radio" 
                            name={`q_${q.id}`} 
                            checked={diagAnswers[q.id] === idx}
                            onChange={() => handleSelectDiag(q.id, idx)}
                            className="text-red-600 focus:ring-red-500"
                          />
                          {choice.text}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={handleRunDiagnostic}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow"
                >
                  診断結果を見る
                </button>

                {diagResultText && (
                  <div className={`mt-6 p-5 rounded-xl border ${diagResultText.isPassed ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                    <h3 className="font-bold text-lg mb-2">{diagResultText.title}</h3>
                    <div dangerouslySetInnerHTML={{ __html: diagResultText.content }} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">診断設問を読み込み中...</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default DynamicPageScreen;