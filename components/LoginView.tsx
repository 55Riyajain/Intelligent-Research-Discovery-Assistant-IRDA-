
import React, { useState, useEffect, useRef } from 'react';
import { BrowserProvider } from 'ethers';
import { UserRole, UserProfile } from '../types';
import { ledgerService } from '../services/ledgerService';

interface LoginViewProps {
  onLogin: (profile: UserProfile) => void;
}

// --- PARTICLE NETWORK ANIMATION COMPONENT ---
const ParticleNetwork: React.FC<{ color: string }> = ({ color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    // Parse color hex to rgb for opacity handling
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 99, g: 102, b: 241 }; // Default indigo
    };
    const rgb = hexToRgb(color);

    const particles: any[] = [];
    const particleCount = 50; // Number of nodes

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }

    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update and Draw Particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Interaction with mouse
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 200) {
            p.x += dx * 0.005;
            p.y += dy * 0.005;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);

          if (dist2 < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.2 - dist2/150 * 0.2})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
        if(canvasRef.current) {
            width = canvasRef.current.width = window.innerWidth;
            height = canvasRef.current.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// --- MAIN LOGIN VIEW ---

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTypingDemo, setIsTypingDemo] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [institute, setInstitute] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.RESEARCHER);

  // Theme Colors based on Role
  const themeColor = {
      [UserRole.RESEARCHER]: '#4f46e5', // Indigo
      [UserRole.REVIEWER]: '#059669', // Emerald
      [UserRole.INSTITUTE_ADMIN]: '#7c3aed', // Violet
      [UserRole.SYSTEM_ADMIN]: '#dc2626' // Red
  }[role];

  const themeClass = {
      [UserRole.RESEARCHER]: 'indigo',
      [UserRole.REVIEWER]: 'emerald',
      [UserRole.INSTITUTE_ADMIN]: 'violet',
      [UserRole.SYSTEM_ADMIN]: 'red'
  }[role];

  const validateInputs = (vals: {name: string, institute: string, password: string}) => {
    if (!vals.name.trim()) return "Please enter your full name.";
    if (!vals.institute.trim()) return "Please enter your research institute.";
    if (!vals.password.trim()) return "Please enter a password.";
    return null;
  };

  const handleAuth = async (
    isDemo: boolean, 
    demoOverrides?: { name: string, institute: string, password: string, role: UserRole },
    type: 'LOGIN' | 'REGISTER' = 'LOGIN'
  ) => {
    const currentName = demoOverrides ? demoOverrides.name : name;
    const currentInstitute = demoOverrides ? demoOverrides.institute : institute;
    const currentPassword = demoOverrides ? demoOverrides.password : password;
    const currentRole = demoOverrides ? demoOverrides.role : role;

    const validationError = validateInputs({ name: currentName, institute: currentInstitute, password: currentPassword });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsConnecting(true);
    setAuthMode(type);
    setError(null);

    try {
      let address = "";
      
      if (isDemo) {
        // Mock Address Generation
        await new Promise(r => setTimeout(r, 800)); // Simulate network

        if (currentRole === UserRole.RESEARCHER && currentName === "Demo Researcher") {
           address = "0xRes...1234";
        } else if (currentRole === UserRole.REVIEWER && currentName === "Demo Reviewer") {
           address = "0xRev...5678";
        } else if (currentRole === UserRole.INSTITUTE_ADMIN) {
           address = "0xAdmin...8888";
        } else {
           address = `0xUser...${Math.floor(Math.random() * 9000) + 1000}`;
        }
      } else {
        // Real Wallet Logic
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const provider = new BrowserProvider((window as any).ethereum);
          await provider.send("eth_requestAccounts", []);
          const signer = await provider.getSigner();
          address = await signer.getAddress();
          
          const message = `IRDA Identity Verification\n\nRequest: ${type === 'LOGIN' ? 'Access' : 'Registration'}\nRole: ${currentRole}\nName: ${currentName}\nInstitute: ${currentInstitute}\nTimestamp: ${Date.now()}`;
          await signer.signMessage(message);
        } else {
          throw new Error("No wallet found. Please use the Demo Mode if you don't have MetaMask.");
        }
      }

      // Register or Login via Ledger Service
      const userProfile = await ledgerService.authenticateUser(address, currentName, currentInstitute, currentRole, currentPassword);
      onLogin(userProfile);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed.");
      setIsConnecting(false);
      setAuthMode(null);
    }
  };

  const typeWriter = async (text: string, setter: (val: string) => void) => {
      for (let i = 0; i <= text.length; i++) {
          setter(text.substring(0, i));
          await new Promise(r => setTimeout(r, 30 + Math.random() * 30));
      }
  };

  const triggerDemo = async () => {
    setIsTypingDemo(true);
    let demoName = "Demo Researcher";
    if (role === UserRole.INSTITUTE_ADMIN) demoName = "Dr. Admin User";
    if (role === UserRole.REVIEWER) demoName = "Demo Reviewer";

    const demoCreds = {
      name: demoName,
      institute: role === UserRole.INSTITUTE_ADMIN ? "Central Oversight Committee" : (role === UserRole.REVIEWER ? "Review Board Alpha" : "Demo Institute"),
      password: "demo123",
      role: role
    };

    // Reset fields
    setName('');
    setInstitute('');
    setPassword('');

    // Simulate Typing Effect
    await typeWriter(demoCreds.name, setName);
    await typeWriter(demoCreds.institute, setInstitute);
    await typeWriter(demoCreds.password, setPassword);

    setIsTypingDemo(false);
    
    // Call auth
    handleAuth(true, demoCreds, 'LOGIN');
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-900 overflow-hidden relative">
      {/* --- BACKGROUND ANIMATION --- */}
      <div className="absolute inset-0 z-0">
          <ParticleNetwork color={themeColor} />
          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900/50"></div>
      </div>

      {/* --- LEFT SIDE: BRANDING --- */}
      <div className="hidden lg:flex w-1/2 relative z-10 flex-col justify-center px-16 text-white">
          <div className="mb-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold bg-white text-${themeClass}-600 shadow-2xl mb-6`}>
                  IR
              </div>
              <h1 className="text-5xl font-bold leading-tight mb-4">
                  Intelligent Research <br/>
                  <span className={`text-${themeClass}-400`}>Discovery Assistant</span>
              </h1>
              <p className="text-slate-300 text-lg max-w-md leading-relaxed">
                  Accelerate scientific breakthroughs with Gemini 3.0 powered analysis, blockchain-verified identity, and automated knowledge graph construction.
              </p>
          </div>
          
          <div className="flex gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                  <h4 className="font-bold text-xl">10k+</h4>
                  <p className="text-xs text-slate-400">Papers Analyzed</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                  <h4 className="font-bold text-xl">99.9%</h4>
                  <p className="text-xs text-slate-400">Analysis Accuracy</p>
              </div>
          </div>
      </div>

      {/* --- RIGHT SIDE: LOGIN FORM --- */}
      <div className="w-full lg:w-1/2 relative z-10 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 transition-all duration-500">
              
              {/* Header */}
              <div className={`h-2 bg-${themeClass}-600 w-full`}></div>
              
              <div className="p-8">
                  <div className="text-center mb-8 lg:hidden">
                      <h2 className="text-2xl font-bold text-slate-900">IRDA Login</h2>
                  </div>

                  {/* Role Switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-8 relative">
                      {/* Sliding Background Pill (Simplified visual logic) */}
                      <button
                        onClick={() => !isTypingDemo && setRole(UserRole.RESEARCHER)}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 relative z-10 ${role === UserRole.RESEARCHER ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Researcher
                      </button>
                      <button
                        onClick={() => !isTypingDemo && setRole(UserRole.REVIEWER)}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 relative z-10 ${role === UserRole.REVIEWER ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Reviewer
                      </button>
                      <button
                        onClick={() => !isTypingDemo && setRole(UserRole.INSTITUTE_ADMIN)}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 relative z-10 ${role === UserRole.INSTITUTE_ADMIN ? 'bg-white text-violet-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Admin
                      </button>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-3 border border-red-100 animate-fade-in">
                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                        {error}
                    </div>
                  )}

                  <div className="space-y-5">
                      <div className="relative group">
                          <i className={`fa-solid fa-user absolute left-4 top-3.5 text-slate-400 group-focus-within:text-${themeClass}-500 transition-colors`}></i>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full Name"
                            disabled={isConnecting || isTypingDemo}
                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-${themeClass}-500 focus:border-transparent outline-none transition-all`}
                          />
                      </div>
                      
                      <div className="relative group">
                          <i className={`fa-solid fa-building-columns absolute left-4 top-3.5 text-slate-400 group-focus-within:text-${themeClass}-500 transition-colors`}></i>
                          <input
                            type="text"
                            value={institute}
                            onChange={(e) => setInstitute(e.target.value)}
                            placeholder="Institute / Organization"
                            disabled={isConnecting || isTypingDemo}
                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-${themeClass}-500 focus:border-transparent outline-none transition-all`}
                          />
                      </div>

                      <div className="relative group">
                          <i className={`fa-solid fa-lock absolute left-4 top-3.5 text-slate-400 group-focus-within:text-${themeClass}-500 transition-colors`}></i>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            disabled={isConnecting || isTypingDemo}
                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-${themeClass}-500 focus:border-transparent outline-none transition-all`}
                          />
                      </div>
                  </div>

                  {/* Two Buttons: Login & Sign Up */}
                  <div className="mt-8 flex gap-3">
                      <button
                        onClick={() => handleAuth(false, undefined, 'LOGIN')}
                        disabled={isConnecting || isTypingDemo}
                        className={`
                          flex-1 py-3.5 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5
                          flex items-center justify-center gap-2
                          ${isConnecting || isTypingDemo 
                              ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                              : `bg-gradient-to-r from-${themeClass}-600 to-${themeClass}-500 hover:to-${themeClass}-600 hover:shadow-${themeClass}-200`}
                        `}
                      >
                        {isConnecting && authMode === 'LOGIN' ? (
                          <i className="fa-solid fa-circle-notch fa-spin"></i>
                        ) : (
                          <>Log In <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i></>
                        )}
                      </button>

                      <button
                        onClick={() => handleAuth(false, undefined, 'REGISTER')}
                        disabled={isConnecting || isTypingDemo}
                        className={`
                          flex-1 py-3.5 px-6 rounded-xl font-bold border-2 transition-all transform hover:-translate-y-0.5
                          flex items-center justify-center gap-2
                          ${isConnecting || isTypingDemo
                              ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                              : `border-${themeClass}-100 text-${themeClass}-600 hover:border-${themeClass}-200 hover:bg-${themeClass}-50`}
                        `}
                      >
                         {isConnecting && authMode === 'REGISTER' ? (
                          <i className="fa-solid fa-circle-notch fa-spin"></i>
                        ) : (
                          <>Sign Up <i className="fa-solid fa-user-plus text-xs"></i></>
                        )}
                      </button>
                  </div>

                  <div className="relative flex py-4 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Or</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    onClick={triggerDemo}
                    disabled={isConnecting || isTypingDemo}
                    className={`
                        w-full py-3 px-6 rounded-xl font-medium text-slate-500 bg-slate-50 border border-slate-200 
                        hover:bg-white hover:border-${themeClass}-300 hover:text-${themeClass}-600 transition-all
                        flex items-center justify-center gap-2 group
                    `}
                  >
                    {isTypingDemo ? (
                        <><i className="fa-solid fa-keyboard fa-fade"></i> Auto-filling credentials...</>
                    ) : (
                        <><i className="fa-solid fa-robot group-hover:animate-bounce"></i> Auto-Fill {role.toLowerCase().replace('_', ' ')} Demo</>
                    )}
                  </button>
              </div>
              
              <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 flex items-center justify-center gap-2">
                      <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                      Verified by Immutable Ledger Technology
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};
