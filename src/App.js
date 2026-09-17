import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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

    // 1. LocalStorage の手動ログイン変更を検知
    window.addEventListener('storage', syncUserSession);

    // 2. Firebase Auth 側の状態監視（補助）
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

  const handleSelectDiag = (qId, choiceIdx) => {
    setDiagAnswers({ ...diagAnswers, [qId]: choiceIdx });
  };

  const handleRunDiagnostic = async () => {
    const unanswered = diagQuestions.some(q => diagAnswers[q.id] === undefined);
    if (unanswered) return alert("すべての設問にお答えください。");

    let isPassed = true;
    const finalAnswersLog = [];

    diagQuestions.forEach(q => {
      const selectedIdx = diagAnswers[q.id];
      const selectedChoice = q.choices[selectedIdx];
      if (selectedChoice && !selectedChoice.isQualified) isPassed = false;
      finalAnswersLog.push({
        questionText: q.questionText,
        selectedChoiceText: selectedChoice ? selectedChoice.text : '未指定'
      });
    });

    if (isPassed) {
      setDiagResultText({
        title: diagSettings?.successTitle || "🎉 受講資格をクリアしています！",
        content: diagSettings?.successContent || "<p>あなたにはエデュケーターコースの受講資格が十分にあります。ぜひお申し込みください！</p>",
        isPassed: true
      });
    } else {
      setDiagResultText({
        title: diagSettings?.failTitle || "⚠️ 受講要件をご確認ください",
        content: diagSettings?.failContent || "<p>現在の回答内容では、一部受講要件を満たしていない可能性がございます。まずはベーシックコースの受講をお勧めします。</p>",
        isPassed: false
      });
    }

    try {
      await addDoc(collection(db, "diagnostic_results"), {
        respondentName: currentUser ? currentUser.name : "一般ビジター",
        respondentEmail: currentUser ? currentUser.email : "未ログイン",
        isPassed: isPassed,
        answers: finalAnswersLog,
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error("診断結果ログの送信に失敗しました", e); }
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

      <Routes>
        <Route path="/" element={
          <HomeScreen 
            loading={loading} 
            news={news} 
            instagram={instagram} 
            getInstaThumbnail={getInstaThumbnail} 
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