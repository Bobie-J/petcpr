import React from 'react';
import { Link } from 'react-router-dom';

const LoginScreen = ({ loginEmail, setLoginEmail, loginPassword, setLoginPassword, handleLoginSubmit }) => {
  return (
    <section className="max-w-md mx-auto px-4 py-16 flex-grow w-full">
      <h1 className="text-2xl font-black text-center text-zinc-900 mb-2">会員限定ログイン</h1>
      <p className="text-center text-zinc-500 text-sm mb-8">修了証の発行、会員専用掲示板がご利用になれます。</p>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">メールアドレス</label>
            <input 
              type="email" 
              placeholder="example@petcpr.jp" 
              value={loginEmail} 
              onChange={e => setLoginEmail(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1">パスワード</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={loginPassword} 
              onChange={e => setLoginPassword(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" 
            />
          </div>
          <button
            type="submit"
            className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3 rounded-lg shadow transition-colors"
          >
            ログインする
          </button>

          {/* 💡 パスワードをお忘れの方への導線 */}
          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-xs text-zinc-500 hover:text-zinc-800 underline font-medium"
            >
              パスワードをお忘れの方・初回パスワード設定はこちら
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
};

export default LoginScreen;