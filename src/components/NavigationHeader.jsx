import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../Logo.png'; 

const NavigationHeader = ({ rootPages, getChildPages, openDropdown, setOpenDropdown, isLoggedIn, handleLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileDropdown, setMobileDropdown] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileDropdown(null);
  }, [location]);

  return (
    <header className="bg-black text-white shadow-md border-b-4 border-red-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <img src={Logo} alt="PET EMERGENCY EDUCATION" className="h-14 w-14 object-contain" />
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-sans">
            PET EMERGENCY EDUCATION
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-2 font-semibold">
          <Link to="/" className="px-3 py-2 rounded-md hover:bg-zinc-800 hover:text-red-500 transition-colors">
            ホーム
          </Link>
          
          {rootPages.map(root => {
            const children = getChildPages(root.id);
            const hasChildren = children.length > 0;

            return (
              <div 
                key={root.id} 
                className="relative group py-2"
                onMouseEnter={() => hasChildren && setOpenDropdown(root.id)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  onClick={() => !hasChildren && navigate(`/page/${root.slug}`)}
                  className="px-3 py-2 rounded-md hover:bg-zinc-800 hover:text-red-500 transition-colors flex items-center"
                >
                  {root.title} {hasChildren && <span className="ml-1 text-xs">▼</span>}
                </button>
                
                {hasChildren && openDropdown === root.id && (
                  <div className="absolute top-full left-0 w-52 bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl z-50">
                    <div className="py-1 text-sm text-white">
                      <Link 
                        to={`/page/${root.slug}`}
                        onClick={() => setOpenDropdown(null)}
                        className="w-full text-left block px-4 py-3 hover:bg-red-600 hover:text-white transition-colors border-b border-zinc-900 font-bold text-red-400"
                      >
                        {root.title} 
                      </Link>
                      {children.map(child => (
                        <Link 
                          key={child.id} 
                          to={`/page/${child.slug}`}
                          onClick={() => setOpenDropdown(null)}
                          className="w-full text-left block px-4 py-3 hover:bg-red-600 hover:text-white transition-colors border-b border-zinc-900 last:border-0"
                        >
                          └ {child.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Link to={isLoggedIn ? '/mypage' : '/login'} className="px-3 py-2 rounded-md hover:bg-zinc-800 hover:text-red-500 transition-colors">
            {isLoggedIn ? '👤 マイページ' : '🔒 会員ログイン'}
          </Link>

          <Link to="/contact" className="ml-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-bold transition-colors text-sm shadow">
            ✉️ お問い合わせ
          </Link>
        </nav>

        <div className="flex md:hidden">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-zinc-400 hover:text-white focus:outline-none p-2">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-t border-zinc-800 py-3 px-4 space-y-1 shadow-inner max-h-[85vh] overflow-y-auto">
          <Link to="/" className="block px-3 py-2.5 rounded-md text-base font-medium hover:bg-zinc-800 hover:text-red-500">ホーム</Link>
          {rootPages.map(root => {
            const children = getChildPages(root.id);
            const hasChildren = children.length > 0;
            const isDropdownOpen = mobileDropdown === root.id;

            return (
              <div key={root.id} className="space-y-1">
                <div className="flex items-center justify-between w-full px-3 py-2.5 rounded-md hover:bg-zinc-800 text-base font-medium">
                  <Link to={`/page/${root.slug}`} className="flex-grow hover:text-red-500">{root.title}</Link>
                  {hasChildren && (
                    <button onClick={() => setMobileDropdown(isDropdownOpen ? null : root.id)} className="p-1 text-zinc-400 hover:text-white">
                      {isDropdownOpen ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {hasChildren && isDropdownOpen && (
                  <div className="pl-4 bg-zinc-900/50 rounded-md border-l-2 border-zinc-700 space-y-1 py-1">
                    {children.map(child => (
                      <Link key={child.id} to={`/page/${child.slug}`} className="block px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white">
                        └ {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link to={isLoggedIn ? '/mypage' : '/login'} className="block px-3 py-2.5 rounded-md text-base font-medium hover:bg-zinc-800 hover:text-red-500">
            {isLoggedIn ? '👤 マイページ' : '🔒 会員ログイン'}
          </Link>
          <div className="pt-4 border-t border-zinc-800">
            <Link to="/contact" className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md font-bold text-center block text-sm shadow">
              ✉️ お問い合わせ
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavigationHeader;