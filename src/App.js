import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';

import NavigationHeader from './components/NavigationHeader';
import Footer from './components/Footer';

import HomeScreen from './pages/HomeScreen';
import DynamicPageScreen from './pages/DynamicPageScreen';
import LoginScreen from './pages/LoginScreen';
import MyPageScreen from './pages/MyPageScreen';
import ContactScreen from './pages/ContactScreen';
import DiagUserScreen from './pages/DiagUserScreen';
import BenefitsListScreen from './pages/BenefitsListScreen';
import ForgotPasswordScreen from './pages/ForgotPasswordScreen';
import SetPasswordScreen from './pages/SetPasswordScreen';

// 🛡️ reCAPTCHA Provider のインポート
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

function AppContent() {
  const navigate = useNavigate();

  // 🔑 認証状態の一元管理（LocalStorage と Firebase Auth のハイブリッド）
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('petcpr_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const isLoggedIn = !!currentUser;
  const [authChecking, setAuthChecking] = useState(true);

  // 一般公開用データ
  const [pages, setPages] = useState([]);         
  const [news, setNews] = useState([]);           
  const [instagram, setInstagram] = useState([]); 
  const [licenseMaster, setLicenseMaster] = useState([]); 
  const [faqList, setFaqList] = useState([]); 
  const [selectedNews, setSelectedNews] = useState(null);

  // 会員専用データ（掲示板・特典）
  const [bbsList, setBbsList] = useState([]);     
  const [bbsInput, setBbsInput] = useState('');
  const [benefitsData, setBenefitsData] = useState(null);

  // フォーム＆診断
  const [contactType, setContactType] = useState('general'); 
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '', location: '', date: '' });

  const [diagQuestions, setDiagQuestions] = useState([]);
  const [diagAnswers, setDiagAnswers] = useState({});
  const [diagResultText, setDiagResultText] = useState(null);
  const [diagSettings, setDiagSettings] = useState(null);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [loading, setLoading] = useState(true);

  // 💡 ログイン状態の同期（LocalStorage 変更イベント ＆ Firebase Auth 監視）
  useEffect(() => {
    const syncUserSession = () => {
      const savedUser = localStorage.getItem('petcpr_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        setCurrentUser(null);
      }
    };

    window.addEventListener('storage', syncUserSession);

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && !localStorage.getItem('petcpr_user')) {
        try {
          const snapUsers = await getDocs(
            query(collection(db, "users"), where("email", "==", authUser.email))
          );
          let userData = { id: authUser.uid, email: authUser.email, name: authUser.displayName || '会員' };
          if (!snapUsers.empty) {
            const userDoc = snapUsers.docs[0];
            userData = { id: userDoc.id, ...userDoc.data() };
          }
          setCurrentUser(userData);
          localStorage.setItem('petcpr_user', JSON.stringify(userData));
        } catch (e) {
          console.error("ユーザー情報の取得エラー:", e);
        }
      }
      setAuthChecking(false);
    });

    setAuthChecking(false);

    return () => {
      window.removeEventListener('storage', syncUserSession);
      unsubscribe();
    };
  }, []);

  // 🌐 一般公開データの取得
  const fetchHpData = async () => {
    try {
      setLoading(true);
      
      const snapPages = await getDocs(query(collection(db, "pages"), orderBy("order", "asc")));
      setPages(snapPages.docs.map(d => ({ id: d.id, ...d.data() })));

      let snapNews = await getDocs(query(collection(db, "news"), where("status", "==", "public"), orderBy("publishedAt", "desc")));
      let newsData = snapNews.docs.map(d => ({ id: d.id, ...d.data() }));
      if (newsData.length === 0) {
        const snapNewsFallback = await getDocs(query(collection(db, "news"), orderBy("publishedAt", "desc")));
        newsData = snapNewsFallback.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setNews(newsData);

      let snapInsta = await getDocs(query(collection(db, "instagram"), where("status", "==", "public"), orderBy("createdAt", "desc")));
      let instaData = snapInsta.docs.map(d => ({ id: d.id, ...d.data() }));
      if (instaData.length === 0) {
        const snapInstaFallback = await getDocs(query(collection(db, "instagram"), orderBy("createdAt", "desc")));
        instaData = snapInstaFallback.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setInstagram(instaData);

      try {
        const snapFaq = await getDocs(query(collection(db, "faqs"), orderBy("order", "asc")));
        setFaqList(snapFaq.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        const snapFaqFallback = await getDocs(collection(db, "faqs"));
        setFaqList(snapFaqFallback.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      const snapBenefits = await getDocs(collection(db, "settings"));
      const benefitsDoc = snapBenefits.docs.find(d => d.id === 'benefits');
      if (benefitsDoc) setBenefitsData(benefitsDoc.data());

      const snapLic = await getDocs(collection(db, "licenses_master"));
      setLicenseMaster(snapLic.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapDiag = await getDocs(query(collection(db, "diagnostic_questions"), orderBy("order", "asc")));
      setDiagQuestions(snapDiag.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapDiagSet = await getDocs(collection(db, "settings"));
      const diagSetDoc = snapDiagSet.docs.find(d => d.id === 'diagnostic');
      if (diagSetDoc) setDiagSettings(diagSetDoc.data());

    } catch (err) {
      console.error("データ読み込みエラー:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔒 掲示板データ取得
  const fetchBbsData = async () => {
    try {
      const snapBbs = await getDocs(query(collection(db, "bbs"), orderBy("createdAt", "desc")));
      setBbsList(snapBbs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("掲示板読み込みエラー:", err);
    }
  };

  useEffect(() => {
    fetchHpData();
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchBbsData();
  }, [isLoggedIn]);

  // ログアウト処理
  const handleLogoutAction = async () => {
    try {
      await signOut(auth).catch(() => {});
      localStorage.removeItem('petcpr_user');
      setCurrentUser(null);
      alert("ログアウトしました");
      navigate('/');
    } catch (e) {
      console.error("ログアウトエラー:", e);
    }
  };

  // 掲示板投稿
  const handlePostBbs = async (text, imageUrls = []) => {
    try {
      await addDoc(collection(db, "bbs"), {
        userId: currentUser?.id || currentUser?.uid,
        userName: currentUser?.name || '会員',
        content: text,
        imageUrls: imageUrls,
        createdAt: serverTimestamp()
      });
      fetchBbsData(); 
    } catch (e) {
      alert("投稿に失敗しました");
    }
  };

  // 選択肢および記述式の回答保持
  const handleSelectDiag = (qId, val) => {
    setDiagAnswers(prev => ({ ...prev, [qId]: val }));
  };

  // 診断実行処理
  const handleRunDiagnostic = async () => {
    // 1. 必須設問のチェック
    const unansweredRequired = diagQuestions.some(q => {
      const isReq = q.isRequired ?? q.required ?? false;
      const answer = diagAnswers[q.id];
      return isReq && (answer === undefined || answer === null || String(answer).trim() === '');
    });

    if (unansweredRequired) {
      alert('必須の設問にすべてお答えください。');
      return null;
    }

    // 2. 判定処理（選択肢と記述式の両方に対応）
    let isPassed = true;
    const finalAnswersLog = [];
    const failedQuestions = []; // ❌ 不適合となった理由を記録する配列

    diagQuestions.forEach((q, idx) => {
      const answer = diagAnswers[q.id];
      
      const isTextType = q.type === 'text' || q.type === 'input' || (!q.choices || q.choices.length === 0);

      if (isTextType) {
        // 📝 記述式の場合
        finalAnswersLog.push({
          questionId: q.id,
          questionNumber: idx + 1,
          questionText: q.questionText,
          type: 'text',
          userAnswerText: answer ? String(answer).trim() : '未入力'
        });
      } else {
        // 🔘 選択肢型の場合
        const selectedChoice = q.choices ? q.choices[answer] : null;
        const choiceText = selectedChoice ? selectedChoice.text : '未選択';

        if (selectedChoice && selectedChoice.isQualified === false) {
          isPassed = false;
          // 不適合の理由（質問内容と選択した回答）を追加
          failedQuestions.push({
            questionNumber: idx + 1,
            questionText: q.questionText,
            selectedChoiceText: choiceText
          });
        }

        finalAnswersLog.push({
          questionId: q.id,
          questionNumber: idx + 1,
          questionText: q.questionText,
          type: 'choice',
          selectedChoiceIndex: answer,
          selectedChoiceText: choiceText
        });
      }
    });

    // 3. Firestore への保存処理
    try {
      await addDoc(collection(db, "diagnostic_results"), {
        respondentName: currentUser ? (currentUser.displayName || currentUser.name) : "一般ビジター",
        respondentEmail: currentUser ? currentUser.email : "未ログイン",
        isPassed: isPassed,
        answers: finalAnswersLog,
        failedQuestions: failedQuestions,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("DB保存エラー:", error);
    }

    // 4. 結果オブジェクトの組み立て（failedQuestions を含める）
    const result = {
      isPassed: isPassed,
      title: isPassed 
        ? (diagSettings?.successTitle || '🎉 受講資格をクリアしています！') 
        : (diagSettings?.failTitle || '⚠️ 受講要件をご確認ください'),
      content: isPassed
        ? (diagSettings?.successContent || '<p>あなたにはエデュケーターコースの受講資格が十分にあります。ぜひお申し込みください！</p>')
        : (diagSettings?.failContent || '<p>現在の回答内容では、一部受講要件を満たしていない可能性がございます。</p>'),
      answersLog: finalAnswersLog,
      failedQuestions: failedQuestions // 👈 ここに追加
    };

    setDiagResultText(result);
    return result;
  };

  const rootPages = pages.filter(p => p.parentId === null && p.showInHeader);
  const getChildPages = (parentId) => pages.filter(p => p.parentId === parentId && p.showInHeader);

  const getInstaThumbnail = (url) => {
    const baseUrl = url.split('?')[0];
    return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}media/?size=m`;
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-zinc-600 font-bold text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <NavigationHeader 
        rootPages={rootPages}
        getChildPages={getChildPages}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        isLoggedIn={isLoggedIn}
        handleLogout={handleLogoutAction}
      />
{/* 📰 ニュース詳細モーダル */}
{selectedNews && (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
      <button 
        onClick={() => setSelectedNews(null)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-xl px-2"
      >
        ✕
      </button>
      
      <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded">
        {selectedNews.accessControl?.isLimited ? '会員限定' : 'NEWS'}
      </span>
      <p className="text-xs text-gray-400 mt-3">
        📅 {selectedNews.publishedAt?.toDate ? selectedNews.publishedAt.toDate().toLocaleDateString('ja-JP') : '日付未定'}
      </p>
      
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 mb-6">
        {selectedNews.title}
      </h2>

      {selectedNews.imageUrl && !selectedNews.imageUrl.includes('placehold.co') && (
        <img 
          src={selectedNews.imageUrl} 
          alt={selectedNews.title} 
          className="w-full h-64 object-cover rounded-lg mb-6 shadow-sm"
        />
      )}

      {/* 💡 HTMLまたはテキストで保存された本文を描画 */}
      <div 
        className="text-gray-700 text-sm sm:text-base leading-relaxed prose max-w-none"
        dangerouslySetInnerHTML={{ __html: selectedNews.content }}
      />

      <div className="mt-8 pt-4 border-t border-gray-100 text-right">
        <button 
          onClick={() => setSelectedNews(null)}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-sm rounded-lg transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  </div>
)}
      <Routes>
        <Route path="/" element={
          <HomeScreen 
            loading={loading} 
            news={news} 
            instagram={instagram} 
            getInstaThumbnail={getInstaThumbnail} 
            onSelectNews={setSelectedNews}
          />
        } />

        <Route path="/page/:slug" element={
          <DynamicPageScreen 
            pages={pages}
            diagQuestions={diagQuestions}
            diagAnswers={diagAnswers}
            handleSelectDiag={handleSelectDiag}
            handleRunDiagnostic={handleRunDiagnostic}
            diagResultText={diagResultText}
          />
        } />

        {/* 🔒 ログイン必須の資格診断ページ */}
        <Route 
          path="/diagnostic" 
          element={
            isLoggedIn ? (
              <DiagUserScreen 
                diagQuestions={diagQuestions}
                diagAnswers={diagAnswers}
                handleSelectDiag={handleSelectDiag}
                handleRunDiagnostic={handleRunDiagnostic}
                diagResultText={diagResultText}
                currentUser={currentUser}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* 💡 LoginScreen は独立したコンポーネントとして呼び出します */}
        <Route path="/login" element={<LoginScreen />} />

        <Route path="/mypage" element={
          <MyPageScreen 
            currentUser={currentUser}
            licenseMaster={licenseMaster}
            handleLogoutAction={handleLogoutAction}
            bbsInput={bbsInput}
            setBbsInput={setBbsInput}
            handlePostBbs={handlePostBbs}
            bbsList={bbsList}
            benefitsData={benefitsData}
          />
        } />

        <Route path="/mypage/benefits" 
          element={<BenefitsListScreen db={db} onBack={() => navigate('/mypage')} />} 
        />

        <Route path="/contact" element={
          <ContactScreen 
            contactType={contactType}
            setContactType={setContactType}
            contactForm={contactForm}
            setContactForm={setContactForm}
            faqList={faqList}
          />
        } />
        
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/set-password" element={<SetPasswordScreen />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey="6Lfn0mItAAAAAPbz_0hKEhqoDXSaQNB8cXetZtBp">
      <AppContent />
    </GoogleReCaptchaProvider>
  );
}