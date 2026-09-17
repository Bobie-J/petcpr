import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';

async function hashPassword(string) {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function SetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!emailParam) return alert('無効なアクセスです。メールのリンクから開き直してください。');
    if (password.length < 6) return alert('パスワードは6文字以上で入力してください。');
    if (password !== confirmPassword) return alert('パスワードが一致しません。');

    setLoading(true);

    try {
      const trimmedEmail = emailParam.trim();

      // 1. DB上のユーザー存在チェック
      const q = query(collection(db, "users"), where("email", "==", trimmedEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("対象のアカウントが見つかりませんでした。");
      }

      const userDocRef = doc(db, "users", querySnapshot.docs[0].id);
      const hashedPassword = await hashPassword(password);

      // 2. Firestore のパスワード情報更新
      await updateDoc(userDocRef, {
        password: hashedPassword,
        needsPasswordSetup: false
      });

      // 3. Auth ユーザー作成/更新
      try {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (authError) {
        console.log("Auth 状態確認:", authError.code);
      }

      // 💡 4. 自動ログインを防ぐためログアウト＆セッション破棄
      await signOut(auth).catch(() => {});
      localStorage.removeItem('petcpr_user');
      window.dispatchEvent(new Event('storage'));

      alert("パスワードの設定が完了しました。設定したパスワードでログインしてください。");
      
      // 5. ログイン画面へ移動
      navigate('/login');

    } catch (error) {
      console.error("Set Password Error:", error);
      alert("エラー: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 px-4 max-w-xl mx-auto flex-grow w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-10">
        <h1 className="text-2xl font-bold text-center mb-6">パスワード設定</h1>
        
        {emailParam ? (
          <p className="text-xs text-center text-zinc-500 mb-6">
            対象アカウント: <span className="font-bold text-zinc-800">{emailParam}</span>
          </p>
        ) : (
          <p className="text-xs text-center text-red-500 mb-6">
            ※メール内のリンクから正しくアクセスしてください。
          </p>
        )}

        <form onSubmit={handleSetPassword} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">新しいパスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">新しいパスワード (確認用)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !emailParam}
            className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3 rounded-lg text-sm disabled:bg-gray-400"
          >
            {loading ? '保存中...' : 'パスワードを保存'}
          </button>
        </form>
      </div>
    </div>
  );
}