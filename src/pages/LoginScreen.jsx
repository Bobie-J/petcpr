import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';

async function hashPassword(string) {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const trimmedEmail = email.trim();

      // 1. Firestore でユーザー検索
      const q = query(collection(db, "users"), where("email", "==", trimmedEmail));
      const querySnapshot = await getDocs(q);

      // DBなし -> アカウント存在しない
      if (querySnapshot.empty) {
        setMessage("アカウントが存在しません。");
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // 💡 2. DBはあるがパスワードが未設定の場合 -> メール送信案内へ誘導
      if (!userData.password || userData.needsPasswordSetup) {
        alert("初回ログインのため、パスワードの設定が必要です。ご登録のメールアドレス宛に設定案内を送付するため、メール送信画面へ移動します。");
        navigate(`/forgot-password?email=${encodeURIComponent(trimmedEmail)}`);
        setLoading(false);
        return;
      }

      // 3. パスワード照合
      const hashedPassword = await hashPassword(password);
      const isDbPasswordValid = 
        userData.password === hashedPassword || userData.password === password;

      if (!isDbPasswordValid) {
        setMessage("メールアドレスまたはパスワードが正しくありません。");
        setLoading(false);
        return;
      }

      // 4. Firebase Auth との同期
      let userUid = userDoc.id;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        userUid = userCredential.user.uid;
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            userUid = userCredential.user.uid;
            await setDoc(doc(db, "users", userUid), {
              ...userData,
              password: hashedPassword,
              needsPasswordSetup: false
            }, { merge: true });
          } catch (e) {
            console.warn("Auth 作成スキップ:", e);
          }
        }
      }

      // 5. ログイン成功時のみ保存
      const sessionUser = { uid: userUid, ...userData, password: hashedPassword };
      localStorage.setItem('petcpr_user', JSON.stringify(sessionUser));

      window.dispatchEvent(new Event('storage'));
      navigate('/');

    } catch (error) {
      console.error("Login Error:", error);
      setMessage("ログイン処理中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto flex-grow w-full">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">会員限定ログイン</h1>
        <p className="text-xs text-zinc-500">
          修了証の発行、会員専用掲示板がご利用になれます。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-10">
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-2">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@petcpr.jp"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-300"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-300"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3.5 rounded-lg text-sm shadow disabled:bg-gray-400 mt-2"
          >
            {loading ? 'ログイン処理中...' : 'ログインする'}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg text-center border border-red-200">
            {message}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-xs text-zinc-600 underline hover:text-zinc-900"
          >
            パスワードをお忘れの方・初回パスワード設定はこちら
          </button>
        </div>
      </div>
    </div>
  );
}