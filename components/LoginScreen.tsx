import React, { useState } from 'react';
import { User, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToaster } from '../context/ToastContext';
import { AppLogoIcon } from './Icons';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  users: User[];
  onSignUp: (newUser: Pick<User, 'username' | 'password_HACK' | 'role' | 'organizationName'>, onFail: () => void) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ users, onSignUp }) => {
  const { t } = useSettings();
  const { login } = useAuth();
  const { addToast } = useToaster();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Sign up states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>(Role.Employee);
  const [organizationName, setOrganizationName] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    setTimeout(() => {
      const foundUser = users.find(
        (user) => user.username.toLowerCase() === username.toLowerCase() && user.password_HACK === password
      );

      if (foundUser) {
        addToast(t('loginSuccess') || 'Login successful!', 'success');
        login(foundUser);
      } else {
        setLoginError(t('invalidCredentials') || t('loginFailed') || 'Invalid username or password');
        addToast(t('loginFailed'), 'error');
        setIsLoading(false);
      }
    }, 500); // Simulate network delay
  };
  
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast(t('passwordsDoNotMatch'), 'error');
      return;
    }
    setIsLoading(true);
    const onFailCallback = () => setIsLoading(false);
    onSignUp({ username: newUsername, password_HACK: newPassword, role: newUserRole, organizationName }, onFailCallback);
  };

  const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const LoginForm = (
    <motion.form 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onSubmit={handleLogin} 
      className="mt-8 space-y-5"
    >
        {loginError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold text-center uppercase tracking-wider">
                {loginError}
            </div>
        )}
        <div>
            <label className="block mb-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" htmlFor="username">{t('username')}</label>
            <input id="username" className="input-field" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
            <label className="block mb-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" htmlFor="password">{t('password')}</label>
            <input id="password" className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="pt-2">
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-4">
                {isLoading ? <LoadingSpinner /> : t('login')}
            </button>
        </div>
    </motion.form>
  );

  const SignUpForm = (
    <motion.form 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onSubmit={handleSignUpSubmit} 
      className="mt-8 space-y-5"
    >
        <div>
            <label className="block mb-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" htmlFor="organization-name">{t('organizationNameLabel')}</label>
            <input id="organization-name" className="input-field" type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
        </div>
        <div>
            <label className="block mb-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" htmlFor="new-username">{t('username')}</label>
            <input id="new-username" className="input-field" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
              <label className="block mb-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" htmlFor="new-password">{t('password')}</label>
              <input id="new-password" className="input-field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div>
              <label className="block mb-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" htmlFor="confirm-password">{t('confirmPassword')}</label>
              <input id="confirm-password" className="input-field" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
        </div>
        <div>
            <label className="block mb-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" htmlFor="role-select">{t('role')}</label>
            <select id="role-select" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as Role)} className="input-field">
                {Object.values(Role).map(roleValue => (
                    <option key={roleValue} value={roleValue}>{t(roleValue)}</option>
                ))}
            </select>
        </div>
        <div className="pt-2">
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-4">
                {isLoading ? <LoadingSpinner /> : t('createAccount')}
            </button>
        </div>
    </motion.form>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto glass-card rounded-[40px] p-8 md:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none relative z-10"
      >
          <div className="flex flex-col items-center justify-center">
              <motion.div 
                whileHover={{ rotate: 10 }}
                className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center shadow-xl shadow-brand-500/30"
              >
                  <AppLogoIcon className="w-12 h-12 text-white" />
              </motion.div>
              <h2 className="mt-6 text-3xl font-black text-center text-slate-900 dark:text-white tracking-tight">{t('welcomeMessage')}</h2>
              <p className="mt-2 text-center text-slate-500 dark:text-slate-400 font-medium">
                  {isSignUp ? t('createAccount') : t('loginPrompt')}
              </p>
          </div>

          <AnimatePresence mode="wait">
            {isSignUp ? SignUpForm : LoginForm}
          </AnimatePresence>
          
          <div className="mt-8 text-center">
              <button 
                onClick={() => setIsSignUp(!isSignUp)} 
                className="text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors focus:outline-none"
              >
                  {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}
              </button>
          </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
