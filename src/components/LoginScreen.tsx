import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Leaf, Lock, User, UserPlus, Fingerprint, Sparkles, Phone, Mail, FileText } from 'lucide-react';
import { Member } from '../types';
import goblinMascot from '../assets/images/goblin_mascot_1780851214634.png';

interface LoginScreenProps {
  members: Member[];
  onLoginSuccess: (member: Member) => void;
  onRegisterMember: (name: string, passwordHash: string, phone: string, idCardNumber: string, email: string) => void;
}

export default function LoginScreen({ members, onLoginSuccess, onRegisterMember }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regIdCardNum, setRegIdCardNum] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    const foundMember = members.find(
      (m) => m.name.toLowerCase() === username.trim().toLowerCase()
    );

    if (!foundMember) {
      setError('Member not found. Check-in or register below.');
      return;
    }

    if (foundMember.status === 'Suspended') {
      setError('This membership is currently suspended. Please speak to staff.');
      return;
    }

    if (foundMember.passwordHash !== password) {
      setError('Incorrect passcode. Please try again.');
      return;
    }

    onLoginSuccess(foundMember);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!regName.trim() || !regPassword.trim()) {
      setError('Please provide a name and passcode.');
      return;
    }

    if (!regPhone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }

    if (!regIdCardNum.trim()) {
      setError('Please provide a National ID or Passport Number.');
      return;
    }

    if (!regEmail.trim()) {
      setError('Please provide an Email Address.');
      return;
    }

    const exists = members.some(
      (m) => m.name.toLowerCase() === regName.trim().toLowerCase()
    );

    if (exists) {
      setError('Username is already registered in the club.');
      return;
    }

    if (regPassword.length < 3) {
      setError('Passcode must be at least 3 characters or custom digits.');
      return;
    }

    onRegisterMember(regName.trim(), regPassword, regPhone.trim(), regIdCardNum.trim(), regEmail.trim());
    setSuccess(`Successfully registered! Code is set. Please sign in.`);
    setUsername(regName.trim());
    setPassword(regPassword);
    setIsRegistering(false);
    setRegName('');
    setRegPassword('');
    setRegPhone('');
    setRegIdCardNum('');
    setRegEmail('');
  };



  return (
    <div className="h-[100dvh] w-full relative flex flex-col items-center justify-center bg-[#0A0F0D] text-slate-200 p-4 overflow-hidden selection:bg-[#4ADE80] selection:text-[#0A0F0D]">
      {/* Premium Green light ambient rays */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#4ADE80]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-10%] w-[55%] h-[60%] rounded-full bg-[#4ADE80]/5 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 flex flex-col justify-center my-auto">
        {/* Dispensary Logo & Heading */}
        <div className="text-center mb-3 md:mb-4 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="inline-flex items-center justify-center p-1 rounded-full bg-gradient-to-br from-[#4ADE80]/30 via-emerald-900/10 to-emerald-950/60 border-2 border-[#4ADE80]/40 shadow-[0_0_35px_rgba(74,222,128,0.25)] mb-2 overflow-hidden transform hover:rotate-3 transition-transform duration-300"
          >
            <img
              src={goblinMascot}
              alt="Smoking Goblin Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-cover rounded-full transform hover:scale-105 transition-all duration-300 filter drop-shadow-[0_0_12px_rgba(74,222,128,0.2)]"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          <div className="flex flex-col items-center justify-center select-none mb-1">
            <span 
              className="font-rage text-3xl sm:text-4xl md:text-5xl tracking-wider transform -rotate-1 select-none font-bold block leading-none graffiti-text-glow"
            >
              SMOKING
            </span>
            <span 
              className="font-rage text-4xl sm:text-5xl md:text-6xl tracking-widest transform -rotate-2 -mt-1 select-none font-bold block leading-none graffiti-text-glow"
            >
              GOBLIN
            </span>
          </div>
          
          <p className="text-zinc-500 text-[10px] sm:text-xs mt-1 max-w-xs mx-auto font-sans tracking-tight">
            Live Digital Stocktaking & Counter Menu
          </p>
        </div>

        {/* Main Glassmorphic Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#0C1210]/95 backdrop-blur-md rounded-2xl border border-white/5 p-4 md:p-5 shadow-2xl relative"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-2 bg-red-950/20 border border-red-500/20 text-red-300 rounded-lg text-[11px] flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-2 bg-[#141C19] border border-[#4ADE80]/20 text-[#4ADE80] rounded-lg text-[11px] flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}

          {!isRegistering ? (
            /* LOGIN FLOW */
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[11px] font-semibold tracking-wider text-[#4ADE80] uppercase">Club Sign-In</span>
                <span className="text-[8px] tracking-[0.2em] text-zinc-600 font-mono">LIVE COUNTER</span>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest text-zinc-500 mb-1 uppercase font-mono">YOUR REGISTERED NAME</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Noah"
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest text-zinc-500 mb-1 uppercase font-mono">CLUB SECURITY PASSCODE</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 transition-all tracking-widest font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 cursor-pointer bg-[#4ADE80] text-[#0A0F0D] py-2.5 rounded-xl text-xs font-bold tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(74,222,128,0.15)]"
              >
                <Fingerprint className="w-4 h-4 text-[#0A0F0D]" />
                <span>Enter Club Counter</span>
              </button>
            </form>
          ) : (
            /* REGISTER FLOW */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[11px] font-semibold tracking-wider text-[#4ADE80] uppercase">Apply for Membership</span>
                <span className="text-[8px] tracking-[0.2em] text-zinc-600 font-mono">SECURE PROTOCOL</span>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest text-zinc-500 mb-1 uppercase font-mono">CHOOSE MEMBER ACCOUNT NAME</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 transition-all font-sans"
                  />
                </div>
                <p className="text-[9px] text-zinc-600 mt-1 font-sans">This name will be printed on your secure digital RFID card.</p>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest text-zinc-500 mb-1 uppercase font-mono">SET SECURITY PASSCODE PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="e.g. 1111 (fully changeable inside)"
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 transition-all tracking-widest font-mono"
                  />
                </div>
                <p className="text-[9px] text-zinc-600 mt-1 font-sans">Set digits. You can customize this PIN code anytime.</p>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest text-zinc-500 mb-1 uppercase font-mono">CELLPHONE NUMBER</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    required
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. +27 82 123 4567"
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest text-zinc-500 mb-1 uppercase font-mono">ID / PASSPORT NUMBER</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    required
                    type="text"
                    value={regIdCardNum}
                    onChange={(e) => setRegIdCardNum(e.target.value)}
                    placeholder="e.g. ID9908123445"
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest text-zinc-500 mb-1 uppercase font-mono">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                  <input
                    required
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. name@domain.com"
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 transition-all font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-1.5 cursor-pointer bg-[#4ADE80] text-[#0A0F0D] py-2.5 rounded-xl text-xs font-bold tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Confirm Registration</span>
              </button>

              <div className="pt-3 border-t border-white/5 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                  }}
                  className="text-zinc-500 text-[11px] hover:text-slate-300 hover:underline transition cursor-pointer font-sans"
                >
                  Return to Member Login
                </button>
              </div>
            </form>
          )}
        </motion.div>

      </div>
    </div>
  );
}
