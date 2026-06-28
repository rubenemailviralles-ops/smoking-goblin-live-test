import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, LogOut, Terminal, Layers, BadgeAlert, Sparkles, User, ShieldCheck, Archive, Users, Clock, ShoppingBag } from 'lucide-react';
import { InventoryItem, Member, ActivityLog, VisitDiscountRule, ItemDiscountCampaign } from './types';
import { INITIAL_INVENTORY, INITIAL_MEMBERS, INITIAL_ACTIVITIES } from './data';
import LoginScreen from './components/LoginScreen';
import MemberPortal from './components/MemberPortal';
import DispensaryConsole from './components/DispensaryConsole';
import MemberStockShowcase from './components/MemberStockShowcase';
import goblinMascot from './assets/images/goblin_mascot_1780851214634.png';

export default function App() {
  // --- STATE SYSTEM ---
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  
  // Auth state
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [impersonatedMember, setImpersonatedMember] = useState<Member | null>(null);

  // --- DISCOUNT & LOYALTY STATE ---
  const [visitThreshold, setVisitThreshold] = useState<number>(() => {
    const stored = localStorage.getItem('greenhouse_visit_threshold');
    return stored ? parseInt(stored, 10) : 4;
  });

  const [visitDiscountPercent, setVisitDiscountPercent] = useState<number>(() => {
    const stored = localStorage.getItem('greenhouse_visit_discount_percent');
    return stored ? parseInt(stored, 10) : 10;
  });

  const [discountItemId, setDiscountItemId] = useState<string>(() => {
    const stored = localStorage.getItem('greenhouse_discount_item_id');
    return stored || '';
  });

  const [itemDiscountPercent, setItemDiscountPercent] = useState<number>(() => {
    const stored = localStorage.getItem('greenhouse_item_discount_percent');
    return stored ? parseInt(stored, 10) : 0;
  });

  const [visitDiscountRules, setVisitDiscountRules] = useState<VisitDiscountRule[]>(() => {
    const stored = localStorage.getItem('greenhouse_visit_discount_rules');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fallback
      }
    }
    return [{ id: 'rule-legacy', threshold: 4, discountPercent: 10 }];
  });

  const [itemDiscountCampaigns, setItemDiscountCampaigns] = useState<ItemDiscountCampaign[]>(() => {
    const stored = localStorage.getItem('greenhouse_item_discount_campaigns');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  const [employeeBudtenderDiscount, setEmployeeBudtenderDiscount] = useState<number>(() => {
    const stored = localStorage.getItem('greenhouse_employee_budtender_discount');
    return stored ? parseInt(stored, 10) : 20;
  });

  const [employeeTrustedBudtenderDiscount, setEmployeeTrustedBudtenderDiscount] = useState<number>(() => {
    const stored = localStorage.getItem('greenhouse_employee_trusted_budtender_discount');
    return stored ? parseInt(stored, 10) : 25;
  });

  const handleDiscountSettingsChange = (settings: {
    visitThreshold?: number;
    visitDiscountPercent?: number;
    discountItemId?: string;
    itemDiscountPercent?: number;
    visitDiscountRules?: VisitDiscountRule[];
    itemDiscountCampaigns?: ItemDiscountCampaign[];
    employeeBudtenderDiscount?: number;
    employeeTrustedBudtenderDiscount?: number;
  }) => {
    if (settings.visitThreshold !== undefined) {
      setVisitThreshold(settings.visitThreshold);
      localStorage.setItem('greenhouse_visit_threshold', settings.visitThreshold.toString());
    }
    if (settings.visitDiscountPercent !== undefined) {
      setVisitDiscountPercent(settings.visitDiscountPercent);
      localStorage.setItem('greenhouse_visit_discount_percent', settings.visitDiscountPercent.toString());
    }
    if (settings.discountItemId !== undefined) {
      setDiscountItemId(settings.discountItemId);
      localStorage.setItem('greenhouse_discount_item_id', settings.discountItemId);
    }
    if (settings.itemDiscountPercent !== undefined) {
      setItemDiscountPercent(settings.itemDiscountPercent);
      localStorage.setItem('greenhouse_item_discount_percent', settings.itemDiscountPercent.toString());
    }
    if (settings.visitDiscountRules !== undefined) {
      setVisitDiscountRules(settings.visitDiscountRules);
      localStorage.setItem('greenhouse_visit_discount_rules', JSON.stringify(settings.visitDiscountRules));
    }
    if (settings.itemDiscountCampaigns !== undefined) {
      setItemDiscountCampaigns(settings.itemDiscountCampaigns);
      localStorage.setItem('greenhouse_item_discount_campaigns', JSON.stringify(settings.itemDiscountCampaigns));
    }
    if (settings.employeeBudtenderDiscount !== undefined) {
      setEmployeeBudtenderDiscount(settings.employeeBudtenderDiscount);
      localStorage.setItem('greenhouse_employee_budtender_discount', settings.employeeBudtenderDiscount.toString());
    }
    if (settings.employeeTrustedBudtenderDiscount !== undefined) {
      setEmployeeTrustedBudtenderDiscount(settings.employeeTrustedBudtenderDiscount);
      localStorage.setItem('greenhouse_employee_trusted_budtender_discount', settings.employeeTrustedBudtenderDiscount.toString());
    }
  };
  
  // Dashboard navigation tab (for administrators/members)
  // Options: 'all_access' (Staff view), 'member_only' (Personal profile view)
  const [activePortalMode, setActivePortalMode] = useState<'member' | 'staff'>('member');

  // Track DispensaryConsole active tab to selectively hide/show Budtender Logistics Center at the bottom
  const [activeConsoleTab, setActiveConsoleTab] = useState<'stock' | 'members' | 'history' | 'budtenders' | 'sales'>('stock');

  // Time & Status State
  const [formattedTime, setFormattedTime] = useState('');

  // --- HYDRATION ENGINE (LocalStorage) ---
  useEffect(() => {
    // Force clean run for Day 1: Clear all inventory items, transaction activities, closed day ledgers, but strictly keep only Owner profiles and Sassy.
    const productionReadyCleared = localStorage.getItem('greenhouse_production_final_reset_active_v2');
    if (!productionReadyCleared) {
      localStorage.setItem('greenhouse_inventory', JSON.stringify(INITIAL_INVENTORY));
      localStorage.setItem('greenhouse_activities', JSON.stringify([]));
      localStorage.setItem('greenhouse_closed_days', JSON.stringify([]));
      localStorage.setItem('greenhouse_members', JSON.stringify(INITIAL_MEMBERS));
      
      localStorage.setItem('greenhouse_production_final_reset_active_v2', 'true');
      localStorage.setItem('greenhouse_day1_reset_active', 'true');
      localStorage.setItem('greenhouse_pristine_reset_v4', 'true');
    }

    // 1. Inventory hydration
    const storedInv = localStorage.getItem('greenhouse_inventory');
    const catalogV2Loaded = localStorage.getItem('greenhouse_inventory_v2_catalog_loaded');
    if (!catalogV2Loaded || !storedInv) {
      setInventory(INITIAL_INVENTORY);
      localStorage.setItem('greenhouse_inventory', JSON.stringify(INITIAL_INVENTORY));
      localStorage.setItem('greenhouse_inventory_v2_catalog_loaded', 'true');
    } else {
      try {
        const parsed = JSON.parse(storedInv);
        if (Array.isArray(parsed) && parsed.length === 0) {
          setInventory(INITIAL_INVENTORY);
          localStorage.setItem('greenhouse_inventory', JSON.stringify(INITIAL_INVENTORY));
        } else {
          setInventory(parsed);
        }
      } catch (e) {
        setInventory(INITIAL_INVENTORY);
      }
    }

    // 2. Members hydration with automatic legacy fallback/owner migration
    const storedMembers = localStorage.getItem('greenhouse_members');
    let loadedMembers: Member[] = [];
    if (storedMembers) {
      try {
        const parsed = JSON.parse(storedMembers) as Member[];
        const noah = parsed.find(m => m.name === 'Noah');
        // If Noah is not marked as Owner or if new owners are missing, overwrite with pristine INITIAL_MEMBERS
        if (!noah || noah.role !== 'owner' || !parsed.some(m => m.name === 'Anthony')) {
          loadedMembers = INITIAL_MEMBERS;
          localStorage.setItem('greenhouse_members', JSON.stringify(INITIAL_MEMBERS));
        } else {
          loadedMembers = parsed;
          if (!loadedMembers.some(m => m.name.toLowerCase() === 'sassy')) {
            const sassy = INITIAL_MEMBERS.find(m => m.name.toLowerCase() === 'sassy');
            if (sassy) {
              loadedMembers.push(sassy);
              localStorage.setItem('greenhouse_members', JSON.stringify(loadedMembers));
            }
          }
        }
      } catch (e) {
        loadedMembers = INITIAL_MEMBERS;
      }
    } else {
      loadedMembers = INITIAL_MEMBERS;
      localStorage.setItem('greenhouse_members', JSON.stringify(INITIAL_MEMBERS));
    }

    // 3. Activity tracking hydration
    let loadedActs: ActivityLog[] = [];
    const storedAct = localStorage.getItem('greenhouse_activities');
    if (storedAct) {
      try {
        loadedActs = JSON.parse(storedAct);
      } catch (e) {
        loadedActs = INITIAL_ACTIVITIES;
      }
    } else {
      loadedActs = INITIAL_ACTIVITIES;
      localStorage.setItem('greenhouse_activities', JSON.stringify(INITIAL_ACTIVITIES));
    }

    // --- AUTOMATED MEMBERSHIP RETENTION SWEEP ---
    let membersListChanged = false;
    const nowMs = Date.now();
    const purgeLogs: ActivityLog[] = [];

    const sweptMembersList = loadedMembers.filter(m => {
      // Exempt VIPs, Owners, Budtenders from 30-day expiry rules
      if (m.isVip || m.role === 'owner' || m.role === 'budtender' || m.role === 'trusted_budtender') {
        return true;
      }

      const expireTime = m.membershipExpiresDate
        ? new Date(m.membershipExpiresDate).getTime()
        : new Date(m.lastMembershipPaidDate || m.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000);
      const deleteTime = expireTime + (365 * 24 * 60 * 60 * 1000);

      if (nowMs > deleteTime) {
        // Active/inactive term has exceeded 1 year of expiration -> purge
        purgeLogs.push({
          id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}-purged`,
          timestamp: new Date().toISOString(),
          type: 'Security',
          message: `Purged inactive profile: ${m.name} (${m.memberNumber}) deleted after 1+ year unchecked status.`,
          user: 'System'
        });
        membersListChanged = true;
        return false;
      } else if (nowMs > expireTime && m.status !== 'Expired') {
        // Exceeded 30 days -> mark expired
        m.status = 'Expired';
        purgeLogs.push({
          id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}-expired`,
          timestamp: new Date().toISOString(),
          type: 'MemberUpdate',
          message: `Member ${m.name} (${m.memberNumber}) status automatically set to Expired (30-day term ended).`,
          user: 'System'
        });
        membersListChanged = true;
      }
      return true;
    });

    const finalizedSweep = sweptMembersList.map(m => {
      const isOwnerOrSassy = m.role === 'owner' || m.name.toLowerCase() === 'sassy';
      if (isOwnerOrSassy && !m.isVip) {
        membersListChanged = true;
        return { ...m, isVip: true };
      }
      return m;
    });

    if (membersListChanged) {
      localStorage.setItem('greenhouse_members', JSON.stringify(finalizedSweep));
      const updatedActsList = [...loadedActs, ...purgeLogs];
      localStorage.setItem('greenhouse_activities', JSON.stringify(updatedActsList));
      setActivities(updatedActsList);
    } else {
      setActivities(loadedActs);
    }
    setMembers(finalizedSweep);

    // Tick current clock
    const updateTime = () => {
      const now = new Date();
      setFormattedTime(now.toLocaleString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- COMPACT SYNC HELPERS ---
  const saveInventoryState = (newInv: InventoryItem[]) => {
    setInventory(newInv);
    localStorage.setItem('greenhouse_inventory', JSON.stringify(newInv));
  };

  const saveMembersState = (newMembers: Member[]) => {
    // Perform state checks in real-time on members save as well
    const nowMs = Date.now();
    const swept = newMembers.filter(m => {
      if (m.isVip || m.role === 'owner' || m.role === 'budtender' || m.role === 'trusted_budtender') {
        return true;
      }
      const expireTime = m.membershipExpiresDate
        ? new Date(m.membershipExpiresDate).getTime()
        : new Date(m.lastMembershipPaidDate || m.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000);
      const deleteTime = expireTime + (365 * 24 * 60 * 60 * 1000);

      if (nowMs > deleteTime) {
        return false;
      } else if (nowMs > expireTime && m.status !== 'Expired') {
        m.status = 'Expired';
      }
      return true;
    });

    const finalizedSave = swept.map(m => {
      const isOwnerOrSassy = m.role === 'owner' || m.name.toLowerCase() === 'sassy';
      if (isOwnerOrSassy && !m.isVip) {
        return { ...m, isVip: true };
      }
      return m;
    });

    setMembers(finalizedSave);
    localStorage.setItem('greenhouse_members', JSON.stringify(finalizedSave));
    
    // Maintain current logged in reference copy
    if (currentMember) {
      const refreshed = finalizedSave.find(m => m.id === currentMember.id);
      if (refreshed) {
        setCurrentMember(refreshed);
      } else {
        setCurrentMember(null); // Log out if deleted in sweep
      }
    }
  };

  const addActivityAndPersist = (type: ActivityLog['type'], message: string, details?: string, undoPayload?: ActivityLog['undoPayload']) => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      user: currentMember ? currentMember.name : 'Guest/Staff',
      details,
      undoPayload
    };
    const updated = [...activities, newLog];
    setActivities(updated);
    localStorage.setItem('greenhouse_activities', JSON.stringify(updated));
  };

  // --- AUTH OPERATIONS ---
  const handleLoginSuccess = (member: Member) => {
    const isoNow = new Date().toISOString();
    const currentDateStr = isoNow.split('T')[0];
    const timeString = isoNow.replace('T', ' ').substring(0, 16);

    let updatedMembers = [...members];
    let loggedInMember = { ...member };

    // Only sign in owners or budtenders when they sign into the app (perform a login check-in)
    if (member.role === 'owner' || member.role === 'budtender' || member.role === 'trusted_budtender') {
      updatedMembers = members.map(m => {
        if (m.id === member.id) {
          const visited = m.visitedDates || [];
          const isAlreadyCheckedInToday = visited.includes(currentDateStr);
          const newVisited = isAlreadyCheckedInToday ? visited : [...visited, currentDateStr].sort();
          const nextMember = {
            ...m,
            visitsCount: newVisited.length,
            lastCheckIn: isAlreadyCheckedInToday ? m.lastCheckIn : isoNow,
            lastVisit: isAlreadyCheckedInToday ? m.lastVisit : timeString,
            visitedDates: newVisited
          };
          loggedInMember = nextMember;
          return nextMember;
        }
        return m;
      });
      setMembers(updatedMembers);
      localStorage.setItem('greenhouse_members', JSON.stringify(updatedMembers));
    }

    setCurrentMember(loggedInMember);
    
    // Log the security entry
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Security',
      message: `${loggedInMember.name} authenticated and cleared security gateway.`,
      user: loggedInMember.name
    };
    const updated = [...activities, newLog];
    setActivities(updated);
    localStorage.setItem('greenhouse_activities', JSON.stringify(updated));

    // Dropping owners and budtenders directly into the Member Desk by default to help customers the fastest
    setActivePortalMode('member');
  };

  const handleRegisterMember = (name: string, passcode: string, phone: string, idCardNumber: string, email: string) => {
    const newMem: Member = {
      id: `mem-${Date.now()}`,
      name,
      phone: phone.trim(),
      idCardNumber: idCardNumber.trim(),
      email: email.trim(),
      memberNumber: `C-0420-${members.length + 1 + 10}`,
      joinedDate: new Date().toISOString().split('T')[0],
      totalSpent: 0,
      consumedGrams: 0,
      status: 'Active',
      passwordHash: passcode,
      lastVisit: null,
      visitsCount: 0,
      notes: 'New self-registered member portal profile.'
    };

    const updated = [...members, newMem];
    setMembers(updated);
    localStorage.setItem('greenhouse_members', JSON.stringify(updated));

    // Log the signup audit trail
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'MemberUpdate',
      message: `Self-registered member profile created for ${name} (${newMem.memberNumber}). ID: ${newMem.idCardNumber} • Cell: ${newMem.phone}`,
      user: 'Registration Desk'
    };
    const updatedActs = [...activities, newLog];
    setActivities(updatedActs);
    localStorage.setItem('greenhouse_activities', JSON.stringify(updatedActs));
  };

  const handleLogout = () => {
    if (currentMember) {
      // Log logout exit action
      const newLog: ActivityLog = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'Security',
        message: `${currentMember.name} signed out and secured their card.`,
        user: currentMember.name
      };
      const updated = [...activities, newLog];
      setActivities(updated);
      localStorage.setItem('greenhouse_activities', JSON.stringify(updated));
    }
    setCurrentMember(null);
    setImpersonatedMember(null);
  };

  // --- PERSONAL CARD PASSWORD MODIFIER ---
  const handleChangePassword = (newPass: string) => {
    if (!currentMember) return;
    const targetMember = impersonatedMember || currentMember;

    const updated = members.map(m => {
      if (m.id === targetMember.id) {
        return { ...m, passwordHash: newPass };
      }
      return m;
    });

    saveMembersState(updated);
    addActivityAndPersist(
      'Security',
      `${targetMember.name} modified their security PIN password hash details.`,
      `Passcode changed securely from member dashboard`
    );
  };

  // --- RENDER SCREEN ---
  if (!currentMember) {
    return (
      <LoginScreen
        members={members}
        onLoginSuccess={handleLoginSuccess}
        onRegisterMember={handleRegisterMember}
      />
    );
  }

  // Statistics Computations for bottom banner
  const totalGramsInStock = inventory
    .filter(item => item.unit === 'g')
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalPcsInStock = inventory
    .filter(item => item.unit === 'pcs')
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalMembersCount = members.filter(m => m.role !== 'owner').length;
  const activeCheckInsToday = members.filter(m => m.role !== 'owner' && m.lastVisit).filter(m => {
    if (!m.lastVisit) return false;
    const lastVisitDate = new Date(m.lastVisit.replace(' ', 'T'));
    const timeDiff = Math.abs(new Date().getTime() - lastVisitDate.getTime());
    return timeDiff < (24 * 60 * 60 * 1000);
  }).length;

  return (
    <div className="min-h-screen bg-[#0A0F0D] text-[#ECEFF1] flex flex-col justify-between font-sans relative selection:bg-[#4ADE80] selection:text-[#0A0F0D]">
      {/* Visual Ambient Underglow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-40 bg-[#4ADE80]/5 blur-[120px] pointer-events-none" />

      {/* 1. BRAND HEADER NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#0A0F0D]/90 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-3 md:py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          
          {/* Main header row: Brand logo on the left, profile/exit button on the right */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            {/* Logo Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="p-0.5 md:p-1 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#4ADE80]/40 via-emerald-900/10 to-emerald-950/60 border-2 border-[#4ADE80]/40 shadow-[0_0_20px_rgba(74,222,128,0.25)] overflow-hidden flex items-center justify-center transform hover:scale-[1.03] hover:rotate-1 transition-all duration-300 shrink-0">
                <img
                  src={goblinMascot}
                  alt="Smoking Goblin Logo"
                  className="w-10 h-10 md:w-16 md:h-16 object-cover rounded-lg md:rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </span>
              <div>
                <div className="flex flex-col select-none -space-y-1.5 md:-space-y-2">
                  <span 
                    className="font-rage text-lg md:text-2xl tracking-wide transform -rotate-1 font-bold leading-none graffiti-text-glow-sm"
                  >
                    SMOKING
                  </span>
                  <span 
                    className="font-rage text-2xl md:text-4xl tracking-widest transform -rotate-2 font-bold leading-none graffiti-text-glow-sm"
                  >
                    GOBLIN
                  </span>
                </div>
                <p className="text-[6px] md:text-[8px] text-zinc-400 font-mono tracking-widest uppercase mt-0.5 md:mt-1 leading-none">
                  Private Club Portal
                </p>
              </div>
            </div>

            {/* Profile Exit Button (Visible on mobile/tablet right next to brand, embedded in the row) */}
            <div className="flex md:hidden items-center gap-2 bg-[#0C1210] border border-white/5 pl-2.5 pr-1.5 py-1 rounded-xl shrink-0">
              <div className="text-right hidden min-[360px]:block">
                <p className="text-[10px] font-bold text-white leading-none flex items-center gap-1 justify-end">
                  <span className="truncate max-w-[65px]">{currentMember.name}</span>
                  {currentMember.role === 'owner' && (
                    <span className="text-[7px] bg-[#4ADE80]/25 text-[#4ADE80] px-1 py-0.2 rounded font-mono font-bold uppercase tracking-wider">Owner</span>
                  )}
                  {currentMember.role === 'trusted_budtender' && (
                    <span className="text-[7px] bg-purple-500/25 text-purple-400 px-1 py-0.2 rounded font-mono font-bold uppercase tracking-wider">Trusted Budtender</span>
                  )}
                  {currentMember.role === 'budtender' && (
                    <span className="text-[7px] bg-blue-500/25 text-blue-400 px-1 py-0.2 rounded font-mono font-bold uppercase tracking-wider">Budtender</span>
                  )}
                </p>
                <p className="text-[8px] text-zinc-500 font-mono leading-none mt-0.5">{currentMember.memberNumber}</p>
              </div>

              <button
                onClick={handleLogout}
                title="Disconnect your RFID Member Pass"
                className="p-1 hover:bg-[#141C19] text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#4ADE80]/30 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Controls section: Mode switcher (if staff) and Logout Card container for desktop */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            
            {/* Mode toggle - customized for owners/budtenders vs standard members */}
            {currentMember && (
              <div className="bg-[#0C1210] p-1 rounded-xl border border-white/5 flex items-center gap-1 shadow-inner w-full md:w-auto">
                <button
                  onClick={() => setActivePortalMode('member')}
                  className={`px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 justify-center flex-1 md:flex-initial ${
                    activePortalMode === 'member'
                      ? 'bg-[#141C19] text-[#4ADE80] font-bold border border-[#4ADE80]/20'
                      : 'text-zinc-500 hover:text-[#ECEFF1]'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Member Desk
                </button>

                {(currentMember.role === 'owner' || currentMember.role === 'budtender' || currentMember.role === 'trusted_budtender') ? (
                  <button
                    onClick={() => {
                      setImpersonatedMember(null);
                      setActivePortalMode('staff');
                    }}
                    className={`px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 justify-center flex-1 md:flex-initial ${
                      activePortalMode === 'staff'
                        ? 'bg-[#141C19] text-[#4ADE80] font-bold border border-[#4ADE80]/20'
                        : 'text-zinc-500 hover:text-[#ECEFF1]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Staff Workspace
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActivePortalMode('staff');
                    }}
                    className={`px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 justify-center flex-1 md:flex-initial ${
                      activePortalMode === 'staff'
                        ? 'bg-[#141C19] text-[#F5C71A] font-bold border border-[#EAB308]/20 shadow-[0_0_12px_rgba(234,179,8,0.1)]'
                        : 'text-zinc-500 hover:text-[#ECEFF1]'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#F5C71A]" />
                    View Stock
                  </button>
                )}
              </div>
            )}

            {/* Desktop Logout Button - hidden on mobile */}
            <div className="hidden md:flex items-center gap-3 bg-[#0C1210] border border-white/5 pl-4 pr-2.5 py-1.5 rounded-xl">
              <div className="text-right">
                <p className="text-[11px] font-bold text-white leading-none flex items-center gap-1 justify-end">
                  <span>{currentMember.name}</span>
                  {currentMember.role === 'owner' && (
                    <span className="text-[8px] bg-[#4ADE80]/25 text-[#4ADE80] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Owner</span>
                  )}
                  {currentMember.role === 'trusted_budtender' && (
                    <span className="text-[8px] bg-purple-500/25 text-purple-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Trusted Budtender</span>
                  )}
                  {currentMember.role === 'budtender' && (
                    <span className="text-[8px] bg-blue-500/25 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Budtender</span>
                  )}
                </p>
                <p className="text-[9px] text-zinc-500 font-mono leading-none mt-1">{currentMember.memberNumber}</p>
              </div>

              <button
                onClick={handleLogout}
                title="Disconnect your RFID Member Pass"
                className="p-1.5 hover:bg-[#141C19] text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#4ADE80]/30 shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* Portal Switching Animation Wrapper */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePortalMode}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25 }}
            className="focus:outline-none"
          >
            {activePortalMode === 'member' ? (
              /* MEMBER PORTAL VIEW */
              <div className="space-y-6">
                {impersonatedMember && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1C180E] border-l-4 border-[#F5C71A] p-4 rounded-r-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">👁️</span>
                      <div>
                        <p className="text-xs font-bold text-[#F5C71A] uppercase tracking-wider font-mono">Owner Portal Observer</p>
                        <p className="text-xs text-zinc-300">
                          Currently viewing and auditing the dashboard for: <strong className="text-white">{impersonatedMember.name} ({impersonatedMember.memberNumber})</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setImpersonatedMember(null);
                        setActivePortalMode('staff');
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-[#F5C71A] hover:bg-yellow-500 text-[#0A0F0D] font-bold text-xs rounded-xl transition cursor-pointer font-mono"
                    >
                      Exit Member View & Return
                    </button>
                  </motion.div>
                )}

                <div className="flex justify-between items-center bg-[#0C1210] border-l-2 border-[#4ADE80] px-4 py-3 rounded-r-xl border-y border-r border-white/5">
                  <span className="text-xs text-zinc-400 flex items-center gap-2 font-mono tracking-wider">
                    <Terminal className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>SECURE VISITOR DESK</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono italic">Clock: {formattedTime}</span>
                </div>
                                 <MemberPortal
                  currentMember={impersonatedMember || currentMember}
                  activities={activities}
                  onChangePassword={handleChangePassword}
                  inventory={inventory}
                  members={members}
                  onUpdateInventory={saveInventoryState}
                  onUpdateMembers={saveMembersState}
                  onAddActivity={addActivityAndPersist}
                  isOwnerObserving={!!impersonatedMember}
                  visitThreshold={visitThreshold}
                  visitDiscountPercent={visitDiscountPercent}
                  discountItemId={discountItemId}
                  itemDiscountPercent={itemDiscountPercent}
                  visitDiscountRules={visitDiscountRules}
                  itemDiscountCampaigns={itemDiscountCampaigns}
                  employeeBudtenderDiscount={employeeBudtenderDiscount}
                  employeeTrustedBudtenderDiscount={employeeTrustedBudtenderDiscount}
                />
              </div>
            ) : (
              /* STAFF WORKSPACE VIEW or MEMBER CURATED CATALOG VIEW */
              <div className="space-y-6">
                {currentMember.role === 'member' ? (
                  <MemberStockShowcase
                    inventory={inventory}
                    currentUser={currentMember.name}
                    itemDiscountCampaigns={itemDiscountCampaigns}
                    discountItemId={discountItemId}
                    itemDiscountPercent={itemDiscountPercent}
                  />
                ) : (
                  <DispensaryConsole
                    inventory={inventory}
                    members={members}
                    activities={activities}
                    currentUser={currentMember.name}
                    currentUserRole={currentMember.role}
                    onUpdateInventory={saveInventoryState}
                    onUpdateMembers={saveMembersState}
                    onUpdateActivities={(updatedActs) => {
                      setActivities(updatedActs);
                      localStorage.setItem('greenhouse_activities', JSON.stringify(updatedActs));
                    }}
                    onAddActivity={addActivityAndPersist}
                    onEnterMemberPage={(member) => {
                      setImpersonatedMember(member);
                      setActivePortalMode('member');
                    }}
                    activeTab={activeConsoleTab}
                    onActiveTabChange={setActiveConsoleTab}
                    visitThreshold={visitThreshold}
                    visitDiscountPercent={visitDiscountPercent}
                    discountItemId={discountItemId}
                    itemDiscountPercent={itemDiscountPercent}
                    visitDiscountRules={visitDiscountRules}
                    itemDiscountCampaigns={itemDiscountCampaigns}
                    employeeBudtenderDiscount={employeeBudtenderDiscount}
                    employeeTrustedBudtenderDiscount={employeeTrustedBudtenderDiscount}
                    onChangeDiscountSettings={handleDiscountSettingsChange}
                  />
                )}
              </div>
            )}
            {activePortalMode === 'staff' && currentMember.role !== 'member' && activeConsoleTab === 'stock' && (
              <div className="mt-12 pt-6 space-y-4 border-t border-white/5">
                <div 
                  className="flex justify-between items-center bg-[#0C1210] border px-4 py-3 rounded-xl"
                  style={{
                    borderColor: '#4ADE8077',
                    boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                  }}
                >
                  <span className="text-xs text-zinc-400 flex items-center gap-2 font-mono tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>BUD-TENDER LOGISTICS CENTER</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono italic">Clock: {formattedTime}</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div 
                    className="bg-[#0C1210] border rounded-2xl p-5 flex flex-col justify-between"
                    style={{
                      borderColor: '#4ADE8077',
                      boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                    }}
                  >
                    <div className="flex justify-between items-start text-zinc-500">
                      <span className="text-[10px] uppercase font-mono tracking-widest font-bold">Active Weight</span>
                      <Leaf className="w-4 h-4 text-[#4ADE80] stroke-[1.5]" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-semibold text-white font-mono">{totalGramsInStock.toFixed(1)} <span className="text-[#4ADE80] text-sm lowercase font-sans">g</span></p>
                      <p className="text-[10px] text-zinc-650 mt-1">Loose flower in active storage jars</p>
                    </div>
                  </div>

                  <div 
                    className="bg-[#0C1210] border rounded-2xl p-5 flex flex-col justify-between"
                    style={{
                      borderColor: '#4ADE8077',
                      boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                    }}
                  >
                    <div className="flex justify-between items-start text-zinc-500">
                      <span className="text-[10px] uppercase font-mono tracking-widest font-bold">Prepackaged</span>
                      <Archive className="w-4 h-4 text-[#4ADE80] stroke-[1.5]" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-semibold text-white font-mono">{totalPcsInStock} <span className="text-zinc-500 text-sm lowercase font-sans">pcs</span></p>
                      <p className="text-[10px] text-zinc-650 mt-1">Edibles, lozenges, carts, vapes</p>
                    </div>
                  </div>

                  <div 
                    className="bg-[#0C1210] border rounded-2xl p-5 flex flex-col justify-between"
                    style={{
                      borderColor: '#4ADE8077',
                      boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                    }}
                  >
                    <div className="flex justify-between items-start text-zinc-500">
                      <span className="text-[10px] uppercase font-mono tracking-widest font-bold">Verified Members</span>
                      <Users className="w-4 h-4 text-[#4ADE80] stroke-[1.5]" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-semibold text-white font-mono">{totalMembersCount} <span className="text-[#4ADE80] text-sm lowercase font-sans">members</span></p>
                      <p className="text-[10px] text-zinc-650 mt-1">Configured patient check-ins</p>
                    </div>
                  </div>

                  <div 
                    className="bg-[#0C1210] border rounded-2xl p-5 flex flex-col justify-between"
                    style={{
                      borderColor: '#4ADE8077',
                      boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                    }}
                  >
                    <div className="flex justify-between items-start text-zinc-500">
                      <span className="text-[10px] uppercase font-mono tracking-widest font-bold">Live Queue</span>
                      <Clock className="w-4 h-4 text-[#4ADE80] stroke-[1.5]" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-semibold text-white font-mono">{activeCheckInsToday} <span className="text-[#4ADE80] text-sm lowercase font-sans">live</span></p>
                      <p className="text-[10px] text-zinc-650 mt-1">Entrances logged past 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* 3. DISCARD COMPLIANCE FOOTER */}
      <footer className="border-t border-white/5 py-8 px-4 md:px-8 bg-[#0C1210] text-zinc-650 text-xs mt-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 justify-center md:justify-start">
              <ShieldCheck className="w-4 h-4 text-[#4ADE80]/60" />
              <strong className="text-zinc-400 font-serif italic">Smoking Goblin Private Non-Commercial Association</strong>
            </p>
            <p className="text-[11px] leading-relaxed max-w-xl text-zinc-600 font-sans">
              Disclaimer: This program is a closed-source sandbox system designed strictly for local stock-taking audits and private dispensary membership logistics. It operates with zero real credit gateways and contains fully mock loyalty points values in accordance with private member association guidelines.
            </p>
          </div>

          <div className="font-mono text-[9px] text-zinc-600 tracking-wider">
            <span>VERSION 1.4.2 • ALL LEDGERS ENCRYPTED</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
