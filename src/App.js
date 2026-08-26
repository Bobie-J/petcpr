import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase'; // 💡 firebase.js から auth をインポート
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  signOut 
} from 'firebase/auth';

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

  // 認証状態
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true); // 💡 初回の認証状態チェック中フラグ

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

  // 💡 リロード後もログイン状態を維持する処理（Firebase Auth 監視）
  useEffect(() => {
    // ログイン状態をローカルストレージ（ブラウザ閉じても保持）に設定
    setPersistence(auth, browserLocalPersistence).then(() => {
      const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (authUser) {
          // Firestore から該当ユーザー情報を取得
          try {
            const snapUsers = await getDocs(
              query(collection(db, "users"), where("email", "==", authUser.email))
            );

            if (!snapUsers.empty) {
              const userDoc = snapUsers.docs[0];
              setCurrentUser({ id: userDoc.id, ...userDoc.data() });
            } else {
              setCurrentUser({
                id: authUser.uid,
                email: authUser.email,
                name: authUser.displayName || '会員'
              });
            }
            setIsLoggedIn(true);
          } catch (e) {
            console.error("ユーザー情報の取得エラー:", e);
          }
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
        setAuthChecking(false);
      });

      return () => unsubscribe();
    }).catch((err) => {
      console.error("Persistence 設定エラー:", err);
      setAuthChecking(false);
    });
  }, []);

  // 🌐 誰でも閲覧できる公開データの取得
  const fetchHpData = async () => {
    try {
      setLoading(true);
      
      // ページ一覧
      const snapPages = await getDocs(query(collection(db, "pages"), orderBy("order", "asc")));
      setPages(snapPages.docs.map(d => ({ id: d.id, ...d.data() })));

      // お知らせ
      let snapNews = await getDocs(query(collection(db, "news"), where("status", "==", "public"), orderBy("publishedAt", "desc")));
      let newsData = snapNews.docs.map(d => ({ id: d.id, ...d.data() }));
      if (newsData.length === 0) {
        const snapNewsFallback = await getDocs(query(collection(db, "news"), orderBy("publishedAt", "desc")));
        newsData = snapNewsFallback.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setNews(newsData);

      // Instagram
      let snapInsta = await getDocs(query(collection(db, "instagram"), where("status", "==", "public"), orderBy("createdAt", "desc")));
      let instaData = snapInsta.docs.map(d => ({ id: d.id, ...d.data() }));
      if (instaData.length === 0) {
        const snapInstaFallback = await getDocs(query(collection(db, "instagram"), orderBy("createdAt", "desc")));
        instaData = snapInstaFallback.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setInstagram(instaData);

      // FAQ一覧の取得
      try {
        const snapFaq = await getDocs(query(collection(db, "faqs"), orderBy("order", "asc")));
        setFaqList(snapFaq.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        const snapFaqFallback = await getDocs(collection(db, "faqs"));
        setFaqList(snapFaqFallback.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      // 🎁 会員特典設定の取得
      const snapBenefits = await getDocs(collection(db, "settings"));
      const benefitsDoc = snapBenefits.docs.find(d => d.id === 'benefits');
      if (benefitsDoc) setBenefitsData(benefitsDoc.data());

      // ライセンスマスター
      const snapLic = await getDocs(collection(db, "licenses_master"));
      setLicenseMaster(snapLic.docs.map(d => ({ id: d.id, ...d.data() })));

      // 診断設問
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

  // 🔒 ログイン時のみ掲示板データを取得
  const fetchBbsData = async () => {
    try {
      const snapBbs = await getDocs(query(collection(db, "bbs"), orderBy("createdAt", "desc")));
      setBbsList(snapBbs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("掲示板読み込みエラー:", err);
    }
  };

  // 初回読み込み（ログイン状態に関わらず実行）
  useEffect(() => {
    fetchHpData();
  }, []);

  // ログイン時のみ掲示板取得
  useEffect(() => {
    if (isLoggedIn) fetchBbsData();
  }, [isLoggedIn]);

  // 🔒 Firebase Auth を使ったログイン処理
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      return alert("メールアドレスとパスワードを入力してください");
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const authUser = userCredential.user;

      const snapUsers = await getDocs(
        query(collection(db, "users"), where("email", "==", loginEmail.trim()))
      );

      if (!snapUsers.empty) {
        const userDoc = snapUsers.docs[0];
        setCurrentUser({ id: userDoc.id, ...userDoc.data() });
      } else {
        setCurrentUser({
          id: authUser.uid,
          email: authUser.email,
          name: authUser.displayName || '会員'
        });
      }

      setIsLoggedIn(true);
      // 💡 ① 「ログインいたしました！」のアラート（alert）を削除し、直接マイページへ移動
      setLoginEmail('');
      setLoginPassword('');
      navigate('/mypage');

    } catch (err) {
      console.error("ログインエラー:", err);
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found'
      ) {
        alert("メールアドレスまたはパスワードが正しくありません。");
      } else {
        alert("ログイン処理中にエラーが発生しました: " + err.message);
      }
    }
  };

  // ログアウト処理
  const handleLogoutAction = async () => {
    try {
      await signOut(auth); // 💡 Firebase Auth からログアウト
      setIsLoggedIn(false);
      setCurrentUser(null);
      alert("ログアウトしました");
      navigate('/');
    } catch (e) {
      console.error("ログアウトエラー:", e);
    }
  };

  // 掲示板投稿（テキストと画像URLを受け取る）
  const handlePostBbs = async (text, imageUrls = []) => {
    try {
      await addDoc(collection(db, "bbs"), {
        userId: currentUser.id,
        userName: currentUser.name,
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

  // 初回認証チェック中はローディング表示（チラつき防止）
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

        <Route path="/login" element={
          <LoginScreen 
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            handleLoginSubmit={handleLoginSubmit}
          />
        } />

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