import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Lock, Sparkles, Check, RefreshCw, Calendar, ShoppingBag, CreditCard, ShieldCheck, AlertCircle, CheckCircle, ShoppingCart, Plus, Trash2, QrCode, ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Member, ActivityLog, InventoryItem, VisitDiscountRule, ItemDiscountCampaign } from '../types';

interface MemberPortalProps {
  currentMember: Member;
  activities: ActivityLog[];
  onChangePassword: (newPass: string) => void;
  inventory: InventoryItem[];
  members: Member[];
  onUpdateInventory: (updatedInv: InventoryItem[]) => void;
  onUpdateMembers: (updatedMembers: Member[]) => void;
  onAddActivity: (type: ActivityLog['type'], message: string, details?: string) => void;
  isOwnerObserving?: boolean;
  visitThreshold?: number;
  visitDiscountPercent?: number;
  discountItemId?: string;
  itemDiscountPercent?: number;
  visitDiscountRules?: VisitDiscountRule[];
  itemDiscountCampaigns?: ItemDiscountCampaign[];
  employeeBudtenderDiscount?: number;
  employeeTrustedBudtenderDiscount?: number;
}

export default function MemberPortal({ 
  currentMember, 
  activities, 
  onChangePassword,
  inventory,
  members,
  onUpdateInventory,
  onUpdateMembers,
  onAddActivity,
  isOwnerObserving = false,
  visitThreshold = 4,
  visitDiscountPercent = 10,
  discountItemId = '',
  itemDiscountPercent = 0,
  visitDiscountRules = [],
  itemDiscountCampaigns = [],
  employeeBudtenderDiscount = 20,
  employeeTrustedBudtenderDiscount = 25
}: MemberPortalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Helper to calculate member base discount, considering employee role status
  const getMemberBaseDiscount = (m: Member) => {
    if (m.role === 'budtender') {
      return employeeBudtenderDiscount;
    }
    if (m.role === 'trusted_budtender') {
      return employeeTrustedBudtenderDiscount;
    }
    const vCount = m.visitedDates ? m.visitedDates.length : m.visitsCount;
    return getLoyaltyDiscountPercent(vCount);
  };

  // Helper to calculate loyalty discount based on multiple rules
  const getActiveLoyaltyRules = (vCount: number) => {
    if (visitDiscountRules && visitDiscountRules.length > 0) {
      return visitDiscountRules.filter(r => r.threshold > 0 && vCount > 0 && vCount % r.threshold === 0);
    }
    if (vCount > 0 && vCount % visitThreshold === 0) {
      return [{ id: 'legacy', threshold: visitThreshold, discountPercent: visitDiscountPercent }];
    }
    return [];
  };

  const getLoyaltyDiscountPercent = (vCount: number) => {
    const activeRules = getActiveLoyaltyRules(vCount);
    if (activeRules.length === 0) return 0;
    return Math.max(...activeRules.map(r => r.discountPercent));
  };

  const getItemPromoPercent = (itemId: string) => {
    if (itemDiscountCampaigns && itemDiscountCampaigns.length > 0) {
      const campaigns = itemDiscountCampaigns.filter(c => c.itemId === itemId);
      if (campaigns.length > 0) {
        return Math.max(...campaigns.map(c => c.discountPercent));
      }
    }
    if (discountItemId !== '' && itemId === discountItemId) {
      return itemDiscountPercent;
    }
    return 0;
  };


  // Pre-fill fields if owner is observing to make reset trivial
  React.useEffect(() => {
    if (isOwnerObserving) {
      setOldPassword(currentMember.passwordHash);
      setNewPassword(currentMember.passwordHash);
      setConfirmPassword(currentMember.passwordHash);
    } else {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [currentMember.id, currentMember.passwordHash, isOwnerObserving]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active Till States
  const [selectedMemberId, setSelectedMemberId] = useState(
    currentMember.role === 'member' ? currentMember.id : ''
  );
  const [targetScanMemberId, setTargetScanMemberId] = useState(
    currentMember.role === 'member' ? currentMember.id : ''
  );

  React.useEffect(() => {
    if (currentMember.role === 'member') {
      setSelectedMemberId(currentMember.id);
      setTargetScanMemberId(currentMember.id);
    } else {
      setSelectedMemberId('');
      setTargetScanMemberId('');
    }
  }, [currentMember.id, currentMember.role]);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Fetch category colors to match the admin dashboard
  const categoryColors = useMemo<Record<string, string>>(() => {
    const saved = localStorage.getItem('greenhouse_category_colors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      'Flower': '#22C55E',
      'Pre-rolls': '#F59E0B',
      'Edibles': '#EC4899',
      'Concentrates': '#8B5CF6',
      'Vapes': '#3B82F6',
      'Uncategorized': '#64748B'
    };
  }, []);

  const getCategoryColor = (cat: string) => {
    const key = cat || 'Uncategorized';
    return categoryColors[key] || categoryColors[key.trim()] || '#4ADE80';
  };

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.custom-till-dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);
  const [dispenseAmt, setDispenseAmt] = useState('1');
  const [tillError, setTillError] = useState('');
  const [tillSuccess, setTillSuccess] = useState('');

  // Card Flip State & Dynamic QR Check-in Simulator
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [scanSuccess, setScanSuccess] = useState('');
  const [scanError, setScanError] = useState('');

  // --- VISITOR DESK CALENDAR GENERATION ---
  const todayVal = new Date();
  const [currentMonth, setCurrentMonth] = useState(todayVal.getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(todayVal.getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOffset = new Date(currentYear, currentMonth, 1).getDay();
  const currentMonthName = monthNames[currentMonth];

  const formatCalendarDate = (dayNum: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    return `${currentYear}-${formattedMonth}-${formattedDay}`;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToggleVisitDay = (dayNum: number) => {
    const dateStr = formatCalendarDate(dayNum);
    const visited = currentMember.visitedDates || [];
    
    let newVisited: string[];
    if (visited.includes(dateStr)) {
      newVisited = visited.filter(d => d !== dateStr);
    } else {
      newVisited = [...visited, dateStr].sort();
    }

    const updated = members.map(m => {
      if (m.id === currentMember.id) {
        return {
          ...m,
          visitsCount: newVisited.length,
          visitedDates: newVisited
        };
      }
      return m;
    });

    onUpdateMembers(updated);
    onAddActivity(
      'MemberUpdate',
      `Visitor Desk adjusted checked-in days for ${currentMember.name}.`,
      `Manual calendar date adjustment: ${dateStr} ${visited.includes(dateStr) ? 'REMOVED' : 'ADDED'}. New days visited sum: ${newVisited.length}`
    );
  };

  const handleSimulateQRScan = () => {
    setScanSuccess('');
    setScanError('');

    if (!targetScanMemberId) {
      setScanError('Please select a member or staff card to scan/sign in first.');
      return;
    }

    const targetMember = members.find(m => m.id === targetScanMemberId);
    if (!targetMember) {
      setScanError('Target member/staff could not be found.');
      return;
    }

    // Check if check-in is on cooldown (matching standard 3-hour reception desk constraint)
    if (targetMember.lastCheckIn) {
      const lastTime = new Date(targetMember.lastCheckIn).getTime();
      const diffMs = Date.now() - lastTime;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 3) {
        const remainingHours = 3 - diffHours;
        const minsRemaining = Math.ceil(remainingHours * 60);
        let cooldownText = "";
        if (minsRemaining >= 60) {
          cooldownText = `${(minsRemaining / 60).toFixed(1)} hours`;
        } else {
          cooldownText = `${minsRemaining} min`;
        }
        setScanError(`Check-In Locked: ${targetMember.name} has signed in within the last 3 hours. Cooldown remaining: ${cooldownText}.`);
        return;
      }
    }

    const isoNow = new Date().toISOString();
    const currentDateStr = isoNow.split('T')[0];
    const timeString = isoNow.replace('T', ' ').substring(0, 16);

    const updated = members.map(m => {
      if (m.id === targetScanMemberId) {
        const visited = m.visitedDates || [];
        const newVisited = visited.includes(currentDateStr) ? visited : [...visited, currentDateStr];
        return {
          ...m,
          visitsCount: newVisited.length,
          lastCheckIn: isoNow,
          lastVisit: timeString,
          visitedDates: newVisited
        };
      }
      return m;
    });

    onUpdateMembers(updated);
    
    const targetOnMembers = updated.find(m => m.id === targetScanMemberId);
    const totalVisits = targetOnMembers?.visitedDates?.length || 1;

    onAddActivity(
      'MemberCheckIn',
      `${targetMember.name} signed in at desk via simulating terminal credentials check.`,
      `Reception desk terminal verified digitally. Total Check-In days recorded: ${totalVisits}`
    );

    setScanSuccess(`Scan Verified! Checked-in status registered for ${targetMember.name}.`);
  };

  // Variations Basket States
  interface OrderLine {
    id: string;
    itemId: string;
    itemName: string;
    sku: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
  }
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

  const handleAddVariation = () => {
    setTillError('');
    setTillSuccess('');
    
    if (!selectedItemId) {
      setTillError('Please select a strain or variety to add as a variation.');
      return;
    }
    
    const item = inventory.find(i => i.id === selectedItemId);
    if (!item) {
      setTillError('Selected item could not be resolved.');
      return;
    }
    
    const qty = parseFloat(dispenseAmt);
    if (isNaN(qty) || qty <= 0) {
      setTillError('Please enter a valid portion weight or unit count.');
      return;
    }
    
    if (item.quantity < qty) {
      setTillError(`Cannot add variation: Insufficient stock. Only ${item.quantity}${item.unit} available for ${item.name}.`);
      return;
    }
    
    const existingIndex = orderLines.findIndex(l => l.itemId === item.id);
    if (existingIndex !== -1) {
      const existing = orderLines[existingIndex];
      const newQty = existing.quantity + qty;
      if (item.quantity < newQty) {
        setTillError(`Cannot exceed available stock of ${item.quantity}${item.unit} for ${item.name}.`);
        return;
      }
      const updatedLines = [...orderLines];
      updatedLines[existingIndex] = {
        ...existing,
        quantity: parseFloat(newQty.toFixed(2))
      };
      setOrderLines(updatedLines);
    } else {
      const newLine: OrderLine = {
        id: 'var-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        quantity: qty,
        unit: item.unit,
        pricePerUnit: item.pricePerUnit
      };
      setOrderLines([...orderLines, newLine]);
    }
    
    setTillSuccess(`Added ${qty}${item.unit} of ${item.name} as variation.`);
    setDispenseAmt('1');
  };

  const handleRemoveVariation = (lineId: string) => {
    setOrderLines(orderLines.filter(l => l.id !== lineId));
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (oldPassword !== currentMember.passwordHash) {
      setErrorMsg('The current passcode you entered is incorrect.');
      return;
    }

    if (newPassword.length < 3) {
      setErrorMsg('The new passcode must be at least 3 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('The confirmation passcode does not match.');
      return;
    }

    onChangePassword(newPassword);
    setSuccessMsg('Your security passcode has been successfully updated.');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // --- DISPENSE REGISTER (Till Sale on Member Desk) ---
  const handleCheckAndDispense = (e: React.FormEvent) => {
    e.preventDefault();
    setTillError('');
    setTillSuccess('');

    if (!selectedMemberId) {
      setTillError('Please select an active member.');
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) {
      setTillError('Selected member record could not be resolved.');
      return;
    }

    // Check membership expiration before dispensing (exempt owners, budtenders, and Sassy's honorary VIP)
    if (member.role !== 'owner' && member.role !== 'budtender' && member.role !== 'trusted_budtender' && !(member.isVip && member.name.toLowerCase() === 'sassy')) {
      const expireTime = member.membershipExpiresDate
        ? new Date(member.membershipExpiresDate).getTime()
        : new Date(member.lastMembershipPaidDate || member.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000);
      if (Date.now() > expireTime || member.status === 'Expired') {
        setTillError(`Access Denied: ${member.name}'s membership has expired (30-day unpaid limit). Dues must be paid in the registry before product can be dispensed.`);
        return;
      }
    }

    // Determine lines to dispense
    let linesToProcess: { itemId: string; quantity: number; itemName: string; unit: string; pricePerUnit: number }[] = [];

    if (orderLines.length > 0) {
      linesToProcess = orderLines.map(line => ({
        itemId: line.itemId,
        quantity: line.quantity,
        itemName: line.itemName,
        unit: line.unit,
        pricePerUnit: line.pricePerUnit
      }));
    } else {
      // Fallback to currently selected single item
      if (!selectedItemId) {
        setTillError('Please select a strain or variety, or add variations to your basket before checking out.');
        return;
      }
      const item = inventory.find(i => i.id === selectedItemId);
      if (!item) {
        setTillError('Selected product could not be resolved.');
        return;
      }
      const quantityToDispense = parseFloat(dispenseAmt);
      if (isNaN(quantityToDispense) || quantityToDispense <= 0) {
        setTillError('Dispensation amount must be a positive number.');
        return;
      }
      linesToProcess = [{
        itemId: item.id,
        quantity: quantityToDispense,
        itemName: item.name,
        unit: item.unit,
        pricePerUnit: item.pricePerUnit
      }];
    }

    // Validate stock for ALL items
    for (const line of linesToProcess) {
      const invItem = inventory.find(i => i.id === line.itemId);
      if (!invItem) {
        setTillError(`Product "${line.itemName}" could not be found in stock.`);
        return;
      }
      if (invItem.quantity < line.quantity) {
        setTillError(`Insufficient stock for "${line.itemName}"! Only ${invItem.quantity}${invItem.unit} available in jar.`);
        return;
      }
    }

    // Execute bulk transactions
    let updatedInventory = [...inventory];
    let totalContribution = 0;
    let dispensedGramsSum = 0;
    let descLines: string[] = [];

    // Auto-trigger a registration scan in for today
    const isoNow = new Date().toISOString();
    const currentDateStr = isoNow.split('T')[0];
    const timeString = isoNow.replace('T', ' ').substring(0, 16);

    const visited = member.visitedDates || [];
    const isAlreadyCheckedInToday = visited.includes(currentDateStr);
    const newVisited = isAlreadyCheckedInToday ? visited : [...visited, currentDateStr].sort();

    const baseDiscPercent = getMemberBaseDiscount(member);
    const discountFactor = 1 - (baseDiscPercent / 100);

    linesToProcess.forEach(line => {
      const baseCost = line.quantity * line.pricePerUnit;
      const itemDiscPercent = getItemPromoPercent(line.itemId);
      const itemPromoFactor = 1 - (itemDiscPercent / 100);

      const lineCost = parseFloat((baseCost * discountFactor * itemPromoFactor).toFixed(2));
      totalContribution += lineCost;
      if (line.unit === 'g') {
        dispensedGramsSum += line.quantity;
      }

      updatedInventory = updatedInventory.map(i => {
        if (i.id === line.itemId) {
          return { ...i, quantity: parseFloat((i.quantity - line.quantity).toFixed(2)) };
        }
        return i;
      });

      descLines.push(`${line.quantity}${line.unit} of ${line.itemName}`);
    });

    const finalContribution = parseFloat(totalContribution.toFixed(2));

    // Update members spent and quota stats, and also trigger check-in details
    const updatedMembers = members.map(m => {
      if (m.id === member.id) {
        return {
          ...m,
          consumedGrams: parseFloat((m.consumedGrams + dispensedGramsSum).toFixed(2)),
          totalSpent: parseFloat((m.totalSpent + finalContribution).toFixed(2)),
          lastCheckIn: isAlreadyCheckedInToday ? m.lastCheckIn : isoNow,
          lastVisit: isAlreadyCheckedInToday ? m.lastVisit : timeString,
          visitsCount: newVisited.length,
          visitedDates: newVisited
        };
      }
      return m;
    });

    onUpdateInventory(updatedInventory);
    onUpdateMembers(updatedMembers);

    const isStaff = member.role === 'budtender' || member.role === 'trusted_budtender';
    let discountNote = "";
    if (baseDiscPercent > 0) {
      discountNote += ` (${baseDiscPercent}% ${isStaff ? 'Employee' : 'Loyalty'} Off)`;
    }
    const promoLines = linesToProcess.filter(line => getItemPromoPercent(line.itemId) > 0);
    if (promoLines.length > 0) {
      discountNote += ` (${promoLines.length} Promo Item(s) Applied)`;
    }
    const autoCheckInNote = !isAlreadyCheckedInToday ? " • Instant Daily Check-In Registered" : "";
    const messageSummary = `Dispensed ${descLines.join(', ')} to ${member.name}. Net Contribution: R${finalContribution}${discountNote}.`;
    onAddActivity(
      'Dispensed',
      messageSummary,
      `Multi-variation checkout authorization recorded at member till desk.${baseDiscPercent > 0 ? ` Included ${baseDiscPercent}% ${isStaff ? 'employee' : 'loyalty check-in reward'} discount.` : ""}${promoLines.length > 0 ? ` Product campaign promo discount(s) included.` : ""}${autoCheckInNote}`
    );

    setTillSuccess(`Success! Dispensed multiple products. Updated ${member.name}'s contribution ledger by R${finalContribution}.`);
    
    // Auto-scroll to top so the success banner is immediately visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Reset inputs
    setDispenseAmt('1');
    setSelectedItemId('');
    setOrderLines([]);
  };

  // Filter actions associated with this member to show custom purchase history
  const myActivities = activities.filter(
    (act) => act.type === 'Dispensed' && act.message.includes(currentMember.name)
  );

  return (
    <div className="flex flex-col gap-6 selection:bg-[#4ADE80] selection:text-[#0A0F0D] w-full max-w-full overflow-hidden">
      
      {/* Dynamic top banner for completed orders to be seen first ontop of screen */}
      {tillSuccess && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-[#141C19]/95 to-slate-950/90 border-2 border-[#4ADE80] rounded-2xl p-4 md:p-6 shadow-[0_0_35px_rgba(74,222,128,0.3)] w-full max-w-full overflow-hidden mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 md:gap-3.5 min-w-0">
              <div className="p-2 md:p-2.5 rounded-xl bg-[#4ADE80]/15 border border-[#4ADE80]/30 text-[#4ADE80] shrink-0 mt-0.5">
                <CheckCircle className="w-5.5 h-5.5 md:w-6 md:h-6 text-[#4ADE80]" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-col select-none -space-y-1">
                  <span className="font-rage text-xl md:text-3xl tracking-wider transform -rotate-1 font-bold leading-none text-[#4ADE80] graffiti-text-glow-sm truncate max-w-full">
                    SMOKING GOBLIN TILL CENTER
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase mt-1">
                    Order completed successfully!
                  </span>
                </div>
                <p className="text-zinc-200 text-xs md:text-sm mt-3 font-medium leading-relaxed font-sans break-words text-left">
                  {tillSuccess}
                </p>
              </div>
            </div>
            <button
              onClick={() => setTillSuccess('')}
              className="px-4 py-2 bg-[#4ADE80] text-[#0A0F0D] hover:bg-[#4ADE80]/80 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer text-center sm:self-center w-full sm:w-auto"
            >
              Okay
            </button>
          </div>
        </div>
      )}
      
      {/* TOP SECTION: Welcome & Active Till Panel */}
      <div className="space-y-6 w-full">
        
        {/* Welcome Block */}
        <div className={`border rounded-2xl p-6 relative overflow-hidden ${
          currentMember.isVip
            ? 'bg-[#12110c] border-[#D4AF37]/30'
            : 'bg-[#0C1210] border-white/5'
        }`}>
          <div className={`absolute right-0 top-0 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
            currentMember.isVip ? 'bg-[#D4AF37]/10' : 'bg-[#4ADE80]/5'
          }`} />
          <div className="flex items-center gap-3">
            <span className={`flex items-center justify-center w-10 h-10 rounded-full border text-base ${
              currentMember.isVip
                ? 'bg-[#1c190f] border-[#D4AF37]/25 text-[#F5C71A]'
                : 'bg-[#141C19] border-[#4ADE80]/10 text-[#4ADE80]'
            }`}>
              {currentMember.isVip ? '👑' : '🌿'}
            </span>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                <span>{currentMember.isVip ? 'Verified Golden VIP Status' : 'Verified Active Pass'}</span>
                {currentMember.isVip && (
                  <span className="text-[#F5C71A] font-extrabold bg-[#F5C71A]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/35 inline-block uppercase text-[8px] tracking-wider scale-95 leading-none font-mono">
                    GOLD ∞
                  </span>
                )}
              </span>
              <h2 className="text-xl font-serif italic text-white">
                {currentMember.isVip ? `Royal Greetings, VIP ${currentMember.name}` : `Salutations, ${currentMember.name}`}
              </h2>
            </div>
          </div>

          {/* Membership dues countdown or status */}
          {!(currentMember.isVip && currentMember.name.toLowerCase() === 'sassy') && currentMember.role !== 'owner' && currentMember.role !== 'budtender' && currentMember.role !== 'trusted_budtender' && (
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px]">
              <span className="text-zinc-500">Dues & Membership Term:</span>
              {(() => {
                const expiresMs = currentMember.membershipExpiresDate
                  ? new Date(currentMember.membershipExpiresDate).getTime()
                  : (new Date(currentMember.lastMembershipPaidDate || currentMember.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000));
                const daysLeft = Math.ceil((expiresMs - Date.now()) / (1000 * 60 * 60 * 24));

                if (daysLeft < 0) {
                  const overdue = Math.abs(daysLeft);
                  const deleteIn = Math.max(0, 365 - overdue);
                  return (
                    <span className="text-red-400 font-bold bg-red-950/20 px-3 py-1 rounded-xl border border-red-900/35">
                      ✕ Expired {overdue} day{overdue !== 1 ? 's' : ''} ago • Delists in {deleteIn} days
                    </span>
                  );
                } else {
                  return (
                    <span className={`px-3 py-1 rounded-xl border ${
                      daysLeft <= 5 
                        ? 'text-amber-400 bg-amber-950/20 border-amber-900/35 font-bold animate-pulse' 
                        : 'text-emerald-400 bg-emerald-950/20 border-emerald-900/20'
                    }`}>
                      ✓ {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                    </span>
                  );
                }
              })()}
            </div>
          )}
        </div>

        {/* --- MOVED ACTIVE TILL CENTER / DISPENSE PANEL --- */}
        {(currentMember.role === 'owner' || currentMember.role === 'budtender' || currentMember.role === 'trusted_budtender') && (
          <div className="bg-[#0C1210] border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-base font-serif italic text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#4ADE80]" />
                <span>Smoking Goblin Active Till Center</span>
              </h3>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                Register a validated customer dispense action. This dynamically decrements catalog weed stock and increments member quota.
              </p>
            </div>

            {tillError && (
              <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-start gap-1.5 animate-pulse font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tillError}</span>
              </div>
            )}

            {tillSuccess && (
              <div className="p-3.5 bg-[#141C19] border border-[#4ADE80]/30 rounded-xl text-xs text-[#4ADE80] flex items-start gap-1.5 font-sans">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{tillSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCheckAndDispense} className="space-y-5">
              {/* MEMBER SELECTION */}
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-semibold">
                  1. Identify Member Account
                </label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value);
                    setTillSuccess('');
                    setTillError('');
                  }}
                  className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                >
                  <option value="">-- Choose verified checked-in member --</option>
                  {members.map(m => {
                    const rPercent = getMemberBaseDiscount(m);
                    const isStaff = m.role === 'budtender' || m.role === 'trusted_budtender';
                    return (
                      <option key={m.id} value={m.id}>
                        {m.isVip ? '🔱 [GOLD VIP] ' : ''}{m.name} ({m.memberNumber}) {m.id === currentMember.id ? '• [MY DIAL-IN]' : ''} • Consumed: {m.consumedGrams}g{rPercent > 0 ? ` ★ [${isStaff ? 'EMPLOYEE' : 'LOYALTY'} - ${rPercent}% OFF] ★` : ''}
                      </option>
                    );
                  })}
                </select>

                {(() => {
                  const selMem = members.find(m => m.id === selectedMemberId);
                  if (!selMem) return null;
                  const vCount = selMem.visitedDates ? selMem.visitedDates.length : selMem.visitsCount;
                  const isStaff = selMem.role === 'budtender' || selMem.role === 'trusted_budtender';
                  const baseDiscount = getMemberBaseDiscount(selMem);
                  const activeLoyaltyRules = isStaff ? [] : getActiveLoyaltyRules(vCount);
                  
                  // Active item campaigns
                  const promoItems = (itemDiscountCampaigns && itemDiscountCampaigns.length > 0)
                    ? itemDiscountCampaigns
                        .filter(c => c.discountPercent > 0)
                        .map(c => {
                          const item = inventory.find(i => i.id === c.itemId);
                          return item ? { name: item.name, discountPercent: c.discountPercent } : null;
                        })
                        .filter((x): x is { name: string; discountPercent: number } => x !== null)
                    : (discountItemId !== '' && itemDiscountPercent > 0 ? [{ name: inventory.find(i => i.id === discountItemId)?.name || 'Item', discountPercent: itemDiscountPercent }] : []);
                  
                  return (
                    <div className="space-y-1.5 mt-2.5">
                      {isStaff && baseDiscount > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-[#4ADE80]/10 border border-[#4ADE80]/20 text-[11px] text-[#4ADE80] font-mono flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#4ADE80] shrink-0" />
                          <div>
                            <span className="font-bold">🎖️ {baseDiscount}% EMPLOYEE DISCOUNT APPLIED:</span> Authorized staff member (<strong>{selMem.role === 'trusted_budtender' ? 'Trusted Budtender' : 'Standard Budtender'}</strong>) receives corporate discount privileges.
                          </div>
                        </motion.div>
                      )}

                      {activeLoyaltyRules.map((rule, idx) => (
                        <motion.div
                          key={`loyalty-banner-${idx}`}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 font-mono flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <span className="font-bold">🎉 {rule.discountPercent}% RETAIL DISCOUNT APPLIED:</span> Selected member has logged <strong>{vCount} check-in days</strong> which qualifies for our {rule.threshold}th Sign-in Reward tier!
                          </div>
                        </motion.div>
                      ))}
                      
                      {promoItems.map((promo, idx) => (
                        <motion.div
                          key={`promo-banner-${idx}`}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-mono flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold">🔥 CAMPAIGN ITEM SPECIAL:</span> Purchase <strong>{promo.name}</strong> to receive a dedicated <strong>{promo.discountPercent}% campaign discount</strong>!
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* PRODUCT SELECTION */}
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-semibold">
                  2. Select Strain or Packaged Variety
                </label>
                
                <div className="relative custom-till-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3 text-xs text-left text-white focus:outline-none focus:border-[#4ADE80]/40 flex items-center justify-between font-sans cursor-pointer h-10"
                  >
                    {(() => {
                      const selectedItem = inventory.find(i => i.id === selectedItemId);
                      if (!selectedItem) {
                        return <span className="text-zinc-500">-- Select items in locker shelf --</span>;
                      }
                      const catColor = getCategoryColor(selectedItem.category);
                      return (
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                          <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-1 bg-white/5 rounded text-zinc-400 shrink-0">
                            {selectedItem.category || 'Uncategorized'}
                          </span>
                          <span className="font-semibold truncate" style={{ color: catColor }}>
                            {selectedItem.name}
                          </span>
                          <span className="text-zinc-500 font-mono text-[10px] shrink-0">
                            ({selectedItem.sku}) • R{selectedItem.pricePerUnit}/{selectedItem.unit}
                          </span>
                        </div>
                      );
                    })()}
                    {isDropdownOpen ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0 ml-1" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />}
                  </button>

                  {/* Dropdown Options */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#0A0F0D]/95 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md max-h-[350px] flex flex-col">
                      {/* Search bar inside dropdown */}
                      <div className="p-2 border-b border-white/5 flex items-center gap-2 bg-black/40">
                        <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search strains or categories..."
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          className="w-full bg-transparent border-none text-xs text-white focus:outline-none font-sans placeholder-zinc-500"
                        />
                        {dropdownSearch && (
                          <button
                            type="button"
                            onClick={() => setDropdownSearch('')}
                            className="text-[10px] text-zinc-400 hover:text-zinc-100 font-mono"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Grouped Options List */}
                      <div className="overflow-y-auto flex-1">
                        {(() => {
                          const term = dropdownSearch.toLowerCase().trim();
                          const groups: Record<string, InventoryItem[]> = {};
                          let totalItems = 0;

                          inventory.forEach(item => {
                            const cat = item.category || 'Uncategorized';
                            
                            if (term) {
                              const nameMatch = item.name.toLowerCase().includes(term);
                              const skuMatch = item.sku ? item.sku.toLowerCase().includes(term) : false;
                              const catMatch = cat.toLowerCase().includes(term);
                              if (!nameMatch && !skuMatch && !catMatch) return;
                            }

                            if (!groups[cat]) {
                              groups[cat] = [];
                            }
                            groups[cat].push(item);
                            totalItems++;
                          });

                          if (totalItems === 0) {
                            return (
                              <div className="p-4 text-center text-xs text-zinc-500 font-mono uppercase">
                                No products found
                              </div>
                            );
                          }

                          const sortedCategories = Object.keys(groups).sort();

                          return sortedCategories.map(cat => {
                            const catColor = getCategoryColor(cat);
                            return (
                              <div key={cat} className="space-y-0.5">
                                {/* Category Header */}
                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 py-2 px-3.5 bg-[#0F1714] flex items-center gap-2 border-y border-white/5 sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                                  <span>{cat}</span>
                                  <span className="text-[9px] text-zinc-500 ml-auto font-normal font-mono normal-case">
                                    {groups[cat].length} item{groups[cat].length !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                {/* Category Items */}
                                <div className="divide-y divide-white/5">
                                  {groups[cat].map(item => {
                                    const outOfStock = item.quantity <= 0;
                                    const isSelected = selectedItemId === item.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        disabled={outOfStock}
                                        onClick={() => {
                                          setSelectedItemId(item.id);
                                          setIsDropdownOpen(false);
                                          setDropdownSearch('');
                                          setTillSuccess('');
                                          setTillError('');
                                        }}
                                        className={`w-full text-left py-2 px-4 transition-all flex justify-between items-center ${
                                          outOfStock 
                                            ? 'opacity-40 cursor-not-allowed bg-black/10' 
                                            : isSelected
                                              ? 'bg-[#141C19] hover:bg-[#1C2622]'
                                              : 'hover:bg-white/5'
                                        }`}
                                      >
                                        <div className="min-w-0 pr-3">
                                          <div className="flex items-center gap-1.5">
                                            {isSelected && <span className="w-1 h-1 rounded-full bg-[#4ADE80]" />}
                                            <span 
                                              className="text-xs font-semibold truncate block"
                                              style={{ color: outOfStock ? '#71717A' : catColor }}
                                            >
                                              {item.name}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                          {outOfStock ? (
                                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-900/20 text-red-400 font-bold uppercase tracking-wide">
                                              Out of Stock
                                            </span>
                                          ) : (
                                            <span className="text-xs font-mono text-[#F5C71A] font-bold">
                                              R{item.pricePerUnit}/{item.unit}
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DISPENSE PORTION MEASURE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2 font-semibold">
                    3. Portion weight/units to dispense
                  </label>
                  <div className="flex gap-2">
                    <input
                      required={orderLines.length === 0}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={dispenseAmt}
                      onChange={(e) => setDispenseAmt(e.target.value)}
                      className="flex-1 bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white text-center font-mono focus:outline-none focus:border-[#4ADE80]/30 animate-none"
                    />
                    <span className="bg-[#0A0F0D] border border-white/5 px-4 rounded-xl text-xs text-zinc-400 font-mono flex items-center justify-center shrink-0">
                      {selectedItemId ? inventory.find(i => i.id === selectedItemId)?.unit : 'units'}
                    </span>
                  </div>
                </div>

                {/* Contribution Estimator */}
                <div className="bg-[#0A0F0D] rounded-xl border border-white/5 p-3.5 flex flex-col justify-center">
                  <span className="text-[9px] uppercase font-mono text-zinc-600 tracking-wider">Estimated Cost</span>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-zinc-500 text-xs">Total:</span>
                    <div>
                      {(() => {
                        const selRef = members.find(m => m.id === selectedMemberId);
                        const baseDiscountSel = selRef ? getMemberBaseDiscount(selRef) : 0;
                        const discountFactorSel = 1 - (baseDiscountSel / 100);
                        
                        const baseVal = parseFloat(dispenseAmt || '0') * (selectedItemId ? inventory.find(i => i.id === selectedItemId)?.pricePerUnit || 0 : 0);
                        const itemDiscPercent = getItemPromoPercent(selectedItemId);
                        const itemPromoFactorSel = 1 - (itemDiscPercent / 100);

                        const finalVal = baseVal * discountFactorSel * itemPromoFactorSel;
                        const hasDiscount = (baseDiscountSel > 0 || itemDiscPercent > 0) && baseVal > 0;
                        return (
                          <>
                            {hasDiscount && (
                              <span className="text-[10px] text-zinc-500 line-through mr-1.5 font-mono">
                                R{baseVal.toFixed(2)}
                              </span>
                            )}
                            <span className="text-lg font-bold text-[#4ADE80] font-mono">
                              R{finalVal.toFixed(2)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* MULTI-VARIATION BASKET BUILDER (Step 4) */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
                    4. Add Multiple Variations (Optional)
                  </label>
                  {orderLines.length > 0 && (
                    <span className="text-[9px] text-[#4ADE80] font-mono px-2 py-0.5 rounded bg-[#141C19] border border-[#4ADE80]/15 uppercase font-bold animate-pulse">
                      Multi-basket active
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className="flex-1 cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-[#4ADE80]/30 py-3 rounded-xl text-xs font-bold text-white text-center flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 text-[#4ADE80]" />
                    <span>Add to List</span>
                  </button>
                </div>

                {/* Basket List */}
                {orderLines.length > 0 && (
                  <div className="bg-[#0A0F0D] border border-white/5 rounded-xl p-3.5 space-y-3">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">Basket Variations List:</span>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {orderLines.map((line) => (
                        <div key={line.id} className="flex justify-between items-center bg-[#0C1210] p-2.5 rounded-lg border border-white/5 text-xs">
                          <div className="min-w-0">
                            {(() => {
                              const matchingItem = inventory.find(i => i.id === line.itemId);
                              const matchedCatColor = matchingItem ? getCategoryColor(matchingItem.category) : '#22C55E';
                              return (
                                <p className="font-serif italic truncate font-semibold" style={{ color: matchedCatColor }}>
                                  {line.itemName}
                                </p>
                              );
                            })()}
                            <p className="text-[9px] text-zinc-550 font-mono">
                              {line.quantity} {line.unit} • R{line.pricePerUnit}/{line.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-zinc-200 font-bold font-mono text-xs">
                              R{(line.quantity * line.pricePerUnit).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariation(line.id)}
                              className="text-red-400 hover:text-red-350 p-1 rounded hover:bg-red-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-white/5 pt-2 flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-500">Cumulative Order Cost:</span>
                      <div>
                        {(() => {
                          const selRef = members.find(m => m.id === selectedMemberId);
                          const vCount = selRef ? (selRef.visitedDates ? selRef.visitedDates.length : selRef.visitsCount) : 0;
                          const loyaltyDiscPercent = getLoyaltyDiscountPercent(vCount);
                          const discountFactorSel = 1 - (loyaltyDiscPercent / 100);

                          const baseTotal = orderLines.reduce((acc, l) => acc + (l.quantity * l.pricePerUnit), 0);
                          const actualTotal = orderLines.reduce((acc, l) => {
                            const itemDiscPercent = getItemPromoPercent(l.itemId);
                            const lineItemPromoFactor = 1 - (itemDiscPercent / 100);
                            return acc + (l.quantity * l.pricePerUnit * lineItemPromoFactor);
                          }, 0) * discountFactorSel;

                          const showCutPercent = actualTotal < baseTotal;
                          return (
                            <>
                              {showCutPercent && baseTotal > 0 && (
                                <span className="text-[11px] text-zinc-500 line-through mr-1.5 font-mono">
                                  R{baseTotal.toFixed(2)}
                                </span>
                              )}
                              <span className="text-sm font-bold text-amber-400">
                                R{actualTotal.toFixed(2)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* TILL SUBMIT BUTTON */}
              <button
                type="submit"
                className="w-full mt-4 cursor-pointer bg-[#4ADE80] text-[#0A0F0D] font-bold py-3.5 rounded-xl text-xs hover:brightness-110 active:scale-[0.99] transition duration-200 tracking-wider uppercase text-center flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="w-4.5 h-4.5" />
                <span>Complete Order</span>
              </button>
            </form>
          </div>
        )}

      </div>

      {/* MIDDLE SECTION: Member Club Card (Full-width, stretches elegantly) */}
      <div className="w-full">
        <motion.div
          id="member-scannable-pass-container"
          whileHover={{ y: -4, scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className={`relative rounded-2xl overflow-hidden shadow-2xl group cursor-default border transition-all duration-300 w-full ${
            currentMember.isVip
              ? 'bg-gradient-to-br from-[#1c180e] via-[#12100a] to-[#251f11] border-[#D4AF37]/45'
              : 'bg-gradient-to-br from-[#0c1210] via-[#0E1512] to-[#121c17] border-white/5'
          }`}
        >
          {/* Futuristic chips and circles */}
          <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            currentMember.isVip ? 'bg-[#D4AF37]/10' : 'bg-[#4ADE80]/5'
          }`} />
          
          <div className="p-6 flex flex-col justify-between min-h-[230px]">
            {/* Card Header */}
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className={`text-[9px] uppercase tracking-widest font-mono font-bold ${
                  currentMember.isVip ? 'text-[#F5C71A]' : 'text-[#4ADE80]'
                }`}>
                  {currentMember.isVip ? '👑 GOLDEN VIP CLUB CARD' : 'MEMBER CLUB CARD'}
                </p>
                <h3 
                  className="text-2xl font-rage tracking-widest mt-0.5 transform -rotate-1 leading-none graffiti-text-glow-sm animate-pulse-slow"
                >
                  SMOKING GOBLIN
                </h3>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-toggle-qr-flip"
                  type="button"
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className={`flex items-center gap-1.5 px-3 py-1 bg-[#101614] hover:bg-[#16201c] border text-[9px] font-mono font-bold tracking-wider rounded-full select-none cursor-pointer transition duration-200 uppercase ${
                    isCardFlipped
                      ? 'border-[#4ADE80]/40 text-[#4ADE80]'
                      : 'border-white/10 text-zinc-400'
                  }`}
                  title={isCardFlipped ? "Flip to chip front view" : "Flip to scan credentials QR"}
                >
                  <QrCode className="w-3 h-3 text-[#4ADE80]" />
                  <span>{isCardFlipped ? "Show Chip" : "Scan Pass"}</span>
                </button>
                
                <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full ${
                  currentMember.isVip
                    ? 'bg-[#1a170f] border-[#D4AF37]/30'
                    : 'bg-[#0A0F0D] border-white/5'
                }`}>
                  {(() => {
                    const isSassy = currentMember.name.toLowerCase() === 'sassy';
                    const expiresMs = currentMember.membershipExpiresDate
                      ? new Date(currentMember.membershipExpiresDate).getTime()
                      : (new Date(currentMember.lastMembershipPaidDate || currentMember.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000));
                    const isExpired = Date.now() > expiresMs;

                    let displayStatus: string = currentMember.status;
                    let displayDotColor = currentMember.isVip ? 'bg-[#F5C71A]' : 'bg-[#4ADE80]';
                    let displayTextColor = currentMember.isVip ? 'text-[#F5C71A]' : 'text-[#4ADE80]';

                    if (currentMember.role === 'owner' || currentMember.role === 'budtender' || currentMember.role === 'trusted_budtender') {
                      displayStatus = 'STAFF • ACTIVE';
                    } else if (currentMember.isVip) {
                      if (isSassy) {
                        displayStatus = 'VIP • HONORARY';
                      } else {
                        displayStatus = isExpired ? 'VIP • EXPIRED' : 'VIP • ACTIVE';
                        displayDotColor = isExpired ? 'bg-red-500' : 'bg-[#F5C71A]';
                        displayTextColor = isExpired ? 'text-red-400' : 'text-[#F5C71A]';
                      }
                    } else {
                      displayStatus = isExpired ? 'EXPIRED' : 'ACTIVE';
                      displayDotColor = isExpired ? 'bg-red-500' : 'bg-[#4ADE80]';
                      displayTextColor = isExpired ? 'text-red-400' : 'text-[#4ADE80]';
                    }

                    return (
                      <>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${displayDotColor}`} />
                        <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${displayTextColor}`}>
                          {displayStatus}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {!isCardFlipped ? (
              /* CARD FRONT - RFID CHIP VIEW */
              <div id="member-pass-front-face" className="mt-4">
                {/* Chip Graphic */}
                <div className={`my-5 w-10 h-8 rounded opacity-80 border relative flex items-center justify-center overflow-hidden ${
                  currentMember.isVip
                    ? 'bg-gradient-to-br from-[#D4AF37]/40 to-[#D4AF37]/10 border-[#D4AF37]/50'
                    : 'bg-gradient-to-br from-[#4ADE80]/40 to-[#4ADE80]/10 border-[#4ADE80]/30'
                }`}>
                  <div className="absolute inset-0 grid grid-cols-3 gap-1 p-1 opacity-20">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/60 rounded-[1px]" />
                    ))}
                  </div>
                  <Award className={`w-4 h-4 ${
                    currentMember.isVip ? 'text-[#F5C71A]' : 'text-emerald-300'
                  }`} />
                </div>

                {/* Card Footer Details */}
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Cardholder Name</p>
                    <span className={`text-sm font-semibold tracking-wider font-mono uppercase ${
                      currentMember.isVip ? 'text-[#F5C71A]' : 'text-white'
                    }`}>{currentMember.name}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Membership Tier</p>
                    <span className={`text-sm font-bold tracking-wider font-mono uppercase ${
                      currentMember.isVip ? 'text-[#F5C71A]' : 'text-white'
                    }`}>
                      {currentMember.isVip ? 'GOLD ∞' : 'STANDARD'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono text-right font-bold">Pass ID</p>
                    <span className={`text-sm font-mono font-medium ${
                      currentMember.isVip ? 'text-[#E6AD12]' : 'text-zinc-300'
                    }`}>{currentMember.memberNumber}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* CARD BACK - VERIFIED DYNAMIC QR CREDENTIALS */
              <div id="member-pass-back-face" className="mt-4 flex flex-col md:flex-row items-center gap-4 bg-[#0A0E0D]/60 p-3.5 rounded-xl border border-white/5">
                <div className="flex-1 space-y-2 min-w-0">
                  <span className="text-[9px] font-mono bg-zinc-900/80 px-2 py-0.5 border border-white/5 rounded text-zinc-500 uppercase tracking-wider block w-max">
                    Secure Credentials
                  </span>
                  
                  <div>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Decoded Payload</p>
                    <p className="text-xs font-mono font-semibold text-zinc-200 truncate" title={currentMember.id}>
                      SG-ID: {currentMember.id.substring(0, 10)}...
                    </p>
                  </div>
                  
                  {/* Cooldown & Success Scan status */}
                  {scanSuccess && (
                    <div className="text-[9.5px] font-sans text-emerald-400 bg-emerald-950/20 border border-emerald-500/25 px-2 py-1 rounded">
                      ✓ {scanSuccess}
                    </div>
                  )}
                  {scanError && (
                    <div className="text-[9.5px] font-sans text-amber-500 bg-amber-950/20 border border-amber-500/25 px-2 py-1 rounded">
                      ⚡ {scanError}
                    </div>
                  )}

                  {(currentMember.role === 'owner' || isOwnerObserving) && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-white/5">
                      <div className="space-y-1">
                        <label className="block text-[8px] font-mono tracking-wider text-zinc-500 uppercase">
                          Select Person to Sign In:
                        </label>
                        <select
                          value={targetScanMemberId}
                          onChange={(e) => {
                            setTargetScanMemberId(e.target.value);
                            setScanSuccess('');
                            setScanError('');
                          }}
                          className="w-full bg-[#0E1412] border border-white/5 rounded-lg py-1 px-2 text-[10px] text-white focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                        >
                          <option value="">-- Select card to scan --</option>
                          {members.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role === 'owner' ? 'Owner' : m.role === 'trusted_budtender' ? 'Trusted Budtender' : m.role === 'budtender' ? 'Budtender' : 'Member'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        id="btn-simulate-qr-scan"
                        type="button"
                        onClick={handleSimulateQRScan}
                        className="w-full text-center bg-emerald-500/10 hover:bg-[#4ADE80]/15 border border-[#4ADE80]/30 hover:border-[#4ADE80]/50 text-white font-mono text-[9px] py-1.5 px-2.5 rounded-lg font-bold uppercase transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3 text-[#4ADE80]" />
                        <span>Sign In</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* QR Code Graphic Frame */}
                <div className={`p-1.5 rounded-xl border bg-black shrink-0 flex items-center justify-center ${
                  currentMember.isVip ? 'border-[#D4AF37]/30' : 'border-[#4ADE80]/20'
                }`}>
                  <img
                    id="member-qr-scannable-pass"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=${
                      currentMember.isVip ? "f5c71a" : "4ade80"
                    }&bgcolor=000000&data=${encodeURIComponent(
                      JSON.stringify({
                        auth: "Smoking-Goblin-Club",
                        memberId: currentMember.id,
                        memberNo: currentMember.memberNumber,
                        role: currentMember.role,
                        vip: currentMember.isVip
                      })
                    )}`}
                    alt="Member Secure QR Code Credentials"
                    className="w-24 h-24 select-none object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Monospace Barcode pattern - HTML/CSS rendered natively */}
          <div className={`border-t px-6 py-2.5 flex justify-between items-center ${
            currentMember.isVip
              ? 'bg-[#15120a] border-[#D4AF37]/15'
              : 'bg-[#0A0F0D] border-white/5'
          }`}>
            <span className="text-[9px] text-zinc-500 font-mono text-scannable">
              Member Since: {currentMember.joinedDate} {currentMember.email ? `• ${currentMember.email}` : ''} {currentMember.phone ? `• Cell: ${currentMember.phone}` : ''}
            </span>
            <div className={`flex items-center gap-0.5 opacity-65 tracking-tighter font-mono text-sm leading-none select-none ${
              currentMember.isVip ? 'text-[#F5C71A]' : 'text-[#4ADE80]'
            }`}>
              ||| | ||| || ||| | ||| ||| | || |||| | | || ||
            </div>
          </div>
        </motion.div>
      </div>

      {/* VISITOR CALENDAR */}
      <div className="bg-[#0C1210] border border-white/5 rounded-2xl p-6 space-y-6 w-full">
        <div className="border-b border-white/5 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-serif italic text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#4ADE80]" />
              <span>Visitor Calendar</span>
            </h3>
            <p className="text-xs text-zinc-500 font-sans">
              Green illuminated days display a verified check. Registered automatically via digital credentials sign in.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Scroll Navigation controls for months */}
            <div className="flex items-center gap-1 bg-[#0A0F0D] border border-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-200 min-w-[110px] text-center">
                {currentMonthName} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now.getMonth());
                setCurrentYear(now.getFullYear());
              }}
              className="px-2.5 py-1.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-xl bg-[#141C19] border border-[#4ADE80]/20 text-[#4ADE80] hover:bg-[#4ADE80]/15 transition-colors cursor-pointer active:scale-95"
              title="Return to real-time current month"
            >
              Today
            </button>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-zinc-500">Total:</span>
              <span className="bg-[#141C19] text-[#4ADE80] border border-[#4ADE80]/30 font-bold px-3 py-1 rounded-full text-xs">
                {currentMember.visitedDates?.length || currentMember.visitsCount} Days
              </span>
            </div>
          </div>
        </div>

        {/* Days of the Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Calendar start date padding */}
          {Array.from({ length: startDayOffset }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 md:h-20 bg-transparent border border-transparent" />
          ))}

          {/* Calendar Day tiles */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = formatCalendarDate(dayNum);
            const isVisited = (currentMember.visitedDates || []).includes(dateStr);
            const isToday = todayVal.getDate() === dayNum && todayVal.getMonth() === currentMonth && todayVal.getFullYear() === currentYear;
            const list = currentMember.visitedDates || [];
            const pos = list.indexOf(dateStr) + 1;
            const dPercent = getLoyaltyDiscountPercent(pos);
            const hasDiscount = dPercent > 0;

            return (
              <div
                key={`day-${dayNum}`}
                className={`w-full text-left p-1 sm:p-2 h-16 md:h-20 rounded-xl border flex flex-col justify-between transition-all relative cursor-default ${
                  isVisited
                    ? 'bg-[#141C19] border-[#4ADE80] shadow-[0_0_15px_rgba(74,222,128,0.15)] shadow-[#4ADE80]/10 text-[#4ADE80]'
                    : 'bg-[#0A0F0D] border-white/5 text-zinc-500'
                }`}
              >
                {/* Top Row: Day number selection */}
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] md:text-sm font-mono font-bold leading-none ${
                    isToday 
                      ? 'text-[#4ADE80] font-extrabold underline decoration-2' 
                      : isVisited 
                        ? (hasDiscount ? 'text-amber-400' : 'text-[#4ADE80]') 
                        : 'text-zinc-600'
                  }`}>
                    {dayNum}
                  </span>
                  {isVisited && (
                    <span className={`w-1.2 h-1.2 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${hasDiscount ? 'bg-amber-400' : 'bg-[#4ADE80]'} animate-pulse`} />
                  )}
                </div>

                {/* Middle Row: Value (Discount amount or Visited label) */}
                <div className="min-w-0">
                  {isVisited && hasDiscount ? (
                    <div className="flex flex-col leading-none">
                      <span className="font-extrabold text-[9px] sm:text-[11px] md:text-sm font-mono tracking-tighter sm:tracking-normal text-amber-400">
                        {dPercent}%
                      </span>
                      <span className="text-[7.5px] sm:text-[9.5px] md:text-xs font-mono font-medium tracking-tighter sm:tracking-normal text-amber-400/90 block mt-0.5">
                        Off
                      </span>
                      <span className="text-[6.5px] sm:text-[7.5px] md:text-[8px] uppercase font-mono font-extrabold tracking-tighter text-amber-400/85 block mt-0.5">
                        ★ Reward
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] md:text-xs font-mono leading-none text-zinc-700">
                      -
                    </span>
                  )}
                </div>

                {/* Bottom Row: Detail Label */}
                <div className="min-w-0 truncate">
                  {isVisited && hasDiscount ? (
                    <div className="h-0" />
                  ) : (
                    <span className="text-[6.5px] sm:text-[7.5px] md:text-[8px] uppercase font-mono tracking-tighter text-zinc-700/45 leading-none block truncate select-none">
                      {isVisited ? '' : 'Empty'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Informative explanation text box at bottom of calendar */}
        <div className="p-4 bg-[#141C19] border border-[#4ADE80]/20 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-[#4ADE80]/10 border border-[#4ADE80]/20 rounded-xl text-[#4ADE80] shrink-0">
            <Award className="w-4 h-4 text-[#4ADE80]" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-serif italic text-white leading-none">
              Smoking Goblin Loyalty Check-in Reward Protocols
            </p>
            <div className="text-[11px] text-zinc-400 font-sans leading-relaxed space-y-1 pt-1">
              {visitDiscountRules && visitDiscountRules.length > 0 ? (
                <div>
                  <p className="mb-1 text-zinc-450 text-[10px]">Active automated milestone rewards for your membership:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-400 font-mono text-[10px]">
                    {visitDiscountRules.map((rule, idx) => (
                      <li key={idx}>Every <strong className="text-white">{rule.threshold}th unique day</strong> gets <strong className="text-white">{rule.discountPercent}% OFF</strong></li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>
                  Every <strong>{visitThreshold}th unique day</strong> a member checks in, a premium <strong>{visitDiscountPercent}% Discount</strong> is activated for their cart purchase contributions. Checked-in days are registered automatically via credentials sign in.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Passcode Change & Purchase Ledger (Side by side on md/lg screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        
        {/* Change Passcode Block */}
        <div className="bg-[#0C1210] border border-white/5 rounded-2xl p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#4ADE80]" />
            <h3 className="text-sm font-semibold text-white">Change Security Passcode</h3>
          </div>

          <p className="text-xs text-zinc-500 mb-4 font-sans">
            Update your password below. Any member can customize their passcode immediately.
          </p>

          {successMsg && (
            <div className="mb-4 p-2.5 bg-[#141C19] border border-[#4ADE80]/20 text-[#4ADE80] rounded-xl text-xs flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-950/20 border border-red-500/20 text-red-300 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 flex justify-between items-center">
                <span>Current Password</span>
                {isOwnerObserving && (
                  <span className="text-[#F5C71A] font-mono font-bold text-[8px] uppercase tracking-wider bg-[#F5C71A]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20 select-none">Owner Visible PIN</span>
                )}
              </label>
              <input
                type={isOwnerObserving ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Current PIN code (e.g. 1111)"
                className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 px-3.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 flex justify-between items-center">
                <span>New Security Code/Pass</span>
                {isOwnerObserving && (
                  <span className="text-[#F5C71A] font-mono font-bold text-[8px] uppercase tracking-wider bg-[#F5C71A]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20 select-none">Clear Editor</span>
                )}
              </label>
              <input
                type={isOwnerObserving ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New passcode"
                className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 px-3.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 flex justify-between items-center">
                <span>Confirm New Password</span>
                {isOwnerObserving && (
                  <span className="text-[#F5C71A] font-mono font-bold text-[8px] uppercase tracking-wider bg-[#F5C71A]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20 select-none font-bold">Matches PIN</span>
                )}
              </label>
              <input
                type={isOwnerObserving ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2 px-3.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#4ADE80] text-[#0A0F0D] hover:brightness-110 active:scale-[0.99] text-xs font-bold tracking-wider rounded-xl transition-all duration-200 cursor-pointer text-center"
            >
              Update Security PIN
            </button>
          </form>
        </div>

        {/* My Activity & Purchase History */}
        <div className="bg-[#0C1210] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#4ADE80]" />
              <span>Your Purchase Ledger</span>
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Recent Entries</span>
          </div>

          {myActivities.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
              <p className="text-zinc-500 text-xs text-center px-4 leading-normal font-sans">
                No past dispense entries recorded in state for your account this session. Purchases will display here dynamically.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {myActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 bg-[#0A0F0D] border border-white/5 rounded-xl text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-300">Dispense Confirmation</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed font-sans">{act.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
