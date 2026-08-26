import React from 'react';

const HomeScreen = ({ loading, news, instagram, getInstaThumbnail }) => {
  return (
    <div>
      {/* ❤️ イメージ画像＋コンセプト */}
      <section className="relative bg-black h-[460px] flex items-center justify-center overflow-hidden border-b-8 border-red-600">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1600')] bg-cover bg-center opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-6 text-white leading-tight">
            救ける人を、助けるために。
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            - Helping People Help Their Pets -<br /><br />
            もしものときに愛するペットを救うのは、最も側にいる家族の存在であることは少なくありません。<br />
            一刻を争うような場面では1つ1つの行動が大きな違いを生みます。<br />
            救う人が最適な行動を取れるように、本プログラムは正しい知識と教育であなたをサポートします。
          </p>
        </div>
      </section>

      {/* 📰 NEWS セクション */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center space-x-3 mb-10 border-b-2 border-zinc-200 pb-4">
          <span className="w-2 h-8 bg-red-600 rounded-sm"></span>
          <h2 className="text-2xl font-black text-zinc-900 tracking-wide">
            最新のお知らせ・新着情報
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full"></div>
          </div>
        ) : news.length === 0 ? (
          <p className="text-center text-gray-500 py-12">現在、お知らせはありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {news.slice(0, 6).map((item) => {
              const hasThumbnail = item.imageUrl && !item.imageUrl.includes('placehold.co');

              return (
                <article key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all border border-gray-100 flex flex-col group duration-200">
                  {hasThumbnail ? (
                    <>
                      <div className="relative h-52 bg-zinc-900 overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow">
                          {item.accessControl?.isLimited ? '会員限定' : 'NEWS'}
                        </span>
                      </div>
                      <div className="p-6 flex flex-col flex-grow justify-between">
                        <div>
                          <span className="text-sm font-semibold text-zinc-400 mb-2 block">
                            📅 {item.publishedAt?.toDate ? item.publishedAt.toDate().toLocaleDateString('ja-JP') : '日付未定'}
                          </span>
                          <h3 className="text-lg font-bold text-zinc-900 line-clamp-1 group-hover:text-red-600 transition-colors">
                            {item.title}
                          </h3>
                        </div>
                        <div className="border-t border-gray-100 pt-4 flex justify-end mt-4">
                          <button onClick={() => alert("詳細表示機能へ切り替えます。")} className="text-xs font-bold text-red-600 flex items-center group-hover:translate-x-1 transition-transform">
                            記事を読む <span className="ml-1">→</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 flex flex-col flex-grow justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-zinc-400 block">
                            📅 {item.publishedAt?.toDate ? item.publishedAt.toDate().toLocaleDateString('ja-JP') : '日付未定'}
                          </span>
                          <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            {item.accessControl?.isLimited ? '会員限定' : 'NEWS'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 mb-3 line-clamp-1 group-hover:text-red-600 transition-colors">
                          {item.title}
                        </h3>
                        <div className="text-zinc-600 text-sm line-clamp-2 prose prose-sm mb-2" dangerouslySetInnerHTML={{ __html: item.content }} />
                      </div>
                      <div className="border-t border-gray-100 pt-4 flex justify-end mt-2">
                        <button onClick={() => alert("詳細表示機能へ切り替えます。")} className="text-xs font-bold text-red-600 flex items-center group-hover:translate-x-1 transition-transform">
                          記事を読む <span className="ml-1">→</span>
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* 📸 Instagram セクション */}
        <div className="flex items-center space-x-3 mb-8 border-b-2 border-zinc-200 pb-4">
          <span className="w-2 h-8 bg-gradient-to-tr from-amber-500 to-purple-600 rounded-sm"></span>
          <h2 className="text-2xl font-black text-zinc-900 tracking-wide">📸 Instagram</h2>
        </div>
        <p className="text-zinc-500 -mt-6 mb-8 text-sm">公式アカウントの活動・講習風景レポート</p>
        
        {instagram.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-400">インスタグラムの投稿データをロード中、または投稿がありません。</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {instagram.map(insta => (
              <a key={insta.id} href={insta.url} target="_blank" rel="noreferrer" className="block bg-white p-2 rounded-lg border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                <img 
                  src={getInstaThumbnail(insta.url)} 
                  alt="Instagram" 
                  className="w-full aspect-square object-cover rounded-md"
                  onError={(e) => { e.target.src = "https://placehold.co/300?text=PET+CPR+Post"; }}
                />
                <div className="pt-2 text-[11px] text-zinc-400 text-right">Instagram ↗</div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomeScreen;