import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // 💡 Link を追加インポート
import { doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { downloadCertificate } from '../utils/generateCertificate'; // 💡 共通生成関数をインポート

const MyPageScreen = ({ 
  currentUser, 
  licenseMaster = [], 
  handleLogoutAction, 
  bbsInput, 
  setBbsInput, 
  handlePostBbs, 
  bbsList = [],
  benefitsData
}) => {
  const navigate = useNavigate();
  const [imageFiles, setImageFiles] = useState([]); // 複数枚（配列）で保持
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // 💡 PDF発行中フラグ

  if (!currentUser) {
    return <div className="text-center py-20 text-red-500 font-bold">マイページの閲覧にはログインが必要です。</div>;
  }

  // 取得済み（has === true）のライセンスのみにフィルタリング
  const acquiredLicenses = licenseMaster.filter(master => currentUser.licenses?.[master.id]?.has);

  // 💡 修了証PDFダウンロード処理
  const handleDownloadCert = async (master) => {
    setIsGeneratingPdf(true);
    // 優先順位: ①修了証専用名義(certName) → ②登録ユーザー名(name)
    const displayName = currentUser.certName || currentUser.name;
    const passDate = currentUser.licenses?.[master.id]?.date || '';
    const templateUrl = master.certFileUrl || '/修了証データ.pdf';

    await downloadCertificate(templateUrl, displayName, passDate);
    setIsGeneratingPdf(false);
  };

  // 画像選択時のバリデーション処理（最大3枚 / 合計2MB以内）
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (files.length > 3) {
      alert("一度に添付できる画像は最大3枚までです。");
      e.target.value = '';
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 2 * 1024 * 1024;

    if (totalSize > maxTotalSize) {
      const currentMb = (totalSize / (1024 * 1024)).toFixed(2);
      alert(`画像の合計サイズが2MBを超えています。（選択中: ${currentMb}MB）\n合計2MB以内に収まる画像を選択してください。`);
      e.target.value = '';
      return;
    }

    setImageFiles(files);
  };

  // 投稿処理
  const onSubmitBbs = async () => {
    if (!bbsInput.trim() && imageFiles.length === 0) return;

    let imageUrls = [];
    if (imageFiles.length > 0) {
      try {
        setIsUploading(true);
        imageUrls = await Promise.all(
          imageFiles.map(async (file) => {
            const storageRef = ref(storage, `bbs_images/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
          })
        );
      } catch (error) {
        console.error("画像アップロードエラー:", error);
        alert("画像のアップロードに失敗しました。");
        setIsUploading(false);
        return;
      }
    }

    await handlePostBbs(bbsInput, imageUrls);
    setBbsInput('');
    setImageFiles([]);
    setIsUploading(false);
  };

  // 自分の投稿を削除する処理
  const handleDeleteBbs = async (bbsId) => {
    if (!window.confirm("この投稿を削除してもよろしいですか？")) return;
    try {
      await deleteDoc(doc(db, "bbs", bbsId));
      alert("投稿を削除しました。");
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b-2 border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <span className="text-zinc-400 text-sm font-mono">No.{currentUser.userNum || '---'}</span>
          <h1 className="text-2xl font-black text-zinc-900 mt-0.5">{currentUser.name} 様 マイページ</h1>
        </div>
        <button 
          onClick={() => handleLogoutAction(navigate)} 
          className="self-start sm:self-auto px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 font-semibold text-sm transition-colors bg-white"
        >
          ログアウト
        </button>
      </div>

      {/* 2カラムグリッドエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ① 取得済みライセンス一覧 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-3 mb-4">📄 取得済みライセンス・修了証発行</h2>
          
          {acquiredLicenses.length > 0 ? (
            <div className="space-y-4">
              {acquiredLicenses.map(master => {
                const passDate = currentUser.licenses?.[master.id]?.date;
                return (
                  <div key={master.id} className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-50 pb-3 last:border-0 last:pb-0 gap-3">
                    <div>
                      <strong className="text-zinc-800 text-base block">{master.name}</strong>
                      <span className="text-xs font-semibold text-green-600">
                        ⏱ 認定日: {passDate || '未設定'}
                      </span>
                    </div>

                    {/* 💡 動的修了証PDFダウンロードボタン */}
                    <button 
                      onClick={() => handleDownloadCert(master)}
                      disabled={isGeneratingPdf}
                      className="bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black px-4 py-2 rounded shadow transition-all text-center disabled:opacity-50"
                    >
                      {isGeneratingPdf ? '発行中...' : '修了証PDFダウンロード 📥'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 py-4">取得済みのライセンスはまだありません。</p>
          )}
        </div>

        {/* ② 会員限定特典カード (Tailwind CSS のデザインに合わせて最適化) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-3 mb-4">🎁 会員限定特典</h2>
            <p className="text-sm text-zinc-600 leading-relaxed mb-6">
              会員様限定の特別コンテンツや各種割引サービス、特典の利用方法をご確認いただけます。
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-50 text-right">
            <Link 
              to="/mypage/benefits" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              特典一覧を見る ➔
            </Link>
          </div>
        </div>
      </div> {/* ← 欠落していた grid の閉じタグ */}

      {/* ③ 掲示板 */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h2 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-3 mb-6">💬 受講生・会員専用コミュニティ掲示板</h2>
        
        {/* 投稿フォーム */}
        <div className="space-y-3 mb-6">
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="メッセージを入力..." 
              value={bbsInput} 
              onChange={e => setBbsInput(e.target.value)} 
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500" 
            />
            <button 
              onClick={onSubmitBbs} 
              disabled={isUploading}
              className="bg-zinc-900 hover:bg-black text-white px-5 py-2 rounded-md font-bold text-sm transition-colors disabled:bg-gray-400"
            >
              {isUploading ? '送信中...' : '投稿'}
            </button>
          </div>
          
          {/* 画像ファイル選択 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-600 font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded border cursor-pointer">
                📷 画像を選択（最大3枚・合計2MB以内）
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
              {imageFiles.length > 0 && (
                <button 
                  onClick={() => setImageFiles([])} 
                  className="text-xs text-red-500 hover:underline font-bold"
                >
                  選択解除
                </button>
              )}
            </div>

            {imageFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {imageFiles.map((file, idx) => (
                  <span key={idx} className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border">
                    📎 {file.name} ({(file.size / 1024).toFixed(0)}KB)
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 投稿一覧 */}
        <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
          {bbsList.map(item => {
            const isMyPost = item.userId === currentUser.id;
            const imgs = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);

            return (
              <div key={item.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2 text-xs">
                  <strong className={item.userId === 'admin' ? 'text-red-600' : 'text-zinc-700'}>
                    {item.userId === 'admin' ? '📢 ' : '👤 '}{item.userName}
                  </strong>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : ''}
                    </span>
                    {isMyPost && (
                      <button 
                        onClick={() => handleDeleteBbs(item.id)} 
                        className="text-red-500 hover:text-red-700 font-bold underline"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{item.content}</p>

                {imgs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {imgs.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img 
                          src={url} 
                          alt={`添付画像 ${i + 1}`} 
                          className="h-28 w-28 object-cover rounded-md border border-gray-200 hover:opacity-90 transition-opacity" 
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MyPageScreen;