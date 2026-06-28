import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  Plus, Minus, Search, Leaf, Users, ClipboardList, ShoppingCart, 
  HelpCircle, Archive, AlertCircle, RefreshCw, PlusCircle, CheckCircle, Clock, Trash2, ShieldCheck, FolderCog, Tag, Edit3, TrendingUp, BarChart3, Coins, Banknote,
  Calendar, ChevronLeft, ChevronRight, X, Download, FileSpreadsheet, Percent
} from 'lucide-react';
import { InventoryItem, Member, ActivityLog, StrainType, VisitDiscountRule, ItemDiscountCampaign } from '../types';

interface DispensaryConsoleProps {
  inventory: InventoryItem[];
  members: Member[];
  activities: ActivityLog[];
  currentUser: string;
  currentUserRole?: 'owner' | 'trusted_budtender' | 'budtender' | 'member';
  onUpdateInventory: (updatedInv: InventoryItem[]) => void;
  onUpdateMembers: (updatedMembers: Member[]) => void;
  onUpdateActivities?: (updatedActivities: ActivityLog[]) => void;
  onAddActivity: (type: ActivityLog['type'], message: string, details?: string, undoPayload?: ActivityLog['undoPayload']) => void;
  onEnterMemberPage?: (member: Member) => void;
  activeTab?: 'stock' | 'members' | 'history' | 'budtenders' | 'sales';
  onActiveTabChange?: (tab: 'stock' | 'members' | 'history' | 'budtenders' | 'sales') => void;
  visitThreshold: number;
  visitDiscountPercent: number;
  discountItemId: string;
  itemDiscountPercent: number;
  visitDiscountRules?: VisitDiscountRule[];
  itemDiscountCampaigns?: ItemDiscountCampaign[];
  employeeBudtenderDiscount?: number;
  employeeTrustedBudtenderDiscount?: number;
  onChangeDiscountSettings?: (settings: {
    visitThreshold?: number;
    visitDiscountPercent?: number;
    discountItemId?: string;
    itemDiscountPercent?: number;
    visitDiscountRules?: VisitDiscountRule[];
    itemDiscountCampaigns?: ItemDiscountCampaign[];
    employeeBudtenderDiscount?: number;
    employeeTrustedBudtenderDiscount?: number;
  }) => void;
}

// 24 premium, distinct, gorgeous professional dark-mode-friendly neon pastel hex colors
const PRODUCT_PALETTE = [
  '#34D399', // Emerald/Mint
  '#22D3EE', // Cyan
  '#C084FC', // Purple
  '#FB923C', // Orange
  '#FBBF24', // Amber/Yellow
  '#EC4899', // Pink
  '#60A5FA', // Blue
  '#A3E635', // Lime
  '#F87171', // Red/Coral
  '#E879F9', // Magenta
  '#2DD4BF', // Teal
  '#FB7185', // Rose
  '#93C5FD', // Light Blue
  '#F9A8D4', // Light Pink
  '#F59E0B', // Dark Amber
  '#10B981', // Dark Emerald
  '#06B6D4', // Dark Cyan
  '#8B5CF6', // Dark Purple
  '#EF4444', // Dark Red
  '#14B8A6', // Dark Teal
  '#D946EF', // Fuchsia
  '#84CC16', // Dark Lime
  '#FF7A59', // Terpenes/Persimmon
  '#8B5CF6'  // Deep Violet
];

function getProductColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRODUCT_PALETTE.length;
  return PRODUCT_PALETTE[index];
}

export default function DispensaryConsole({
  inventory,
  members,
  activities,
  currentUser,
  currentUserRole,
  onUpdateInventory,
  onUpdateMembers,
  onUpdateActivities,
  onAddActivity,
  onEnterMemberPage,
  activeTab: activeTabProp,
  onActiveTabChange,
  visitThreshold,
  visitDiscountPercent,
  discountItemId,
  itemDiscountPercent,
  visitDiscountRules = [],
  itemDiscountCampaigns = [],
  employeeBudtenderDiscount = 20,
  employeeTrustedBudtenderDiscount = 25,
  onChangeDiscountSettings
}: DispensaryConsoleProps) {
  
  // Tabs for sub-controls
  const [localActiveTab, setLocalActiveTab] = useState<'stock' | 'members' | 'history' | 'budtenders' | 'sales'>('stock');
  const [showDiscountSettings, setShowDiscountSettings] = useState(false);
  const activeTab = activeTabProp !== undefined ? activeTabProp : localActiveTab;
  const setActiveTab = (tab: 'stock' | 'members' | 'history' | 'budtenders' | 'sales') => {
    setLocalActiveTab(tab);
    if (onActiveTabChange) {
      onActiveTabChange(tab);
    }
  };

  useEffect(() => {
    if (currentUserRole === 'budtender') {
      if (activeTab === 'stock' || activeTab === 'budtenders' || activeTab === 'sales') {
        setActiveTab('members');
      }
    } else if (currentUserRole === 'trusted_budtender') {
      if (activeTab === 'budtenders' || activeTab === 'sales') {
        setActiveTab('stock');
      }
    }
  }, [currentUserRole, activeTab]);

  // Calendar Ledger/Sales Reset System
  const [lastSalesResetTime, setLastSalesResetTime] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_last_sales_reset_time');
    return saved ? Number(saved) : 0;
  });

  const [dailyResetTime, setDailyResetTime] = useState<string>(() => {
    const saved = localStorage.getItem('greenhouse_daily_reset_time');
    return saved ? saved : '22:00';
  });

  const [closedDays, setClosedDays] = useState<any[]>(() => {
    const saved = localStorage.getItem('greenhouse_closed_days');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [selectedClosedDay, setSelectedClosedDay] = useState<any | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState<'all' | 'monthly' | 'weekly' | 'daily'>('all');
  const [activeDayPopup, setActiveDayPopup] = useState<{
    dateStr: string;
    salesList: any[];
    totalReturns: number;
    isClosed: boolean;
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  
  // Stock Search & Filters
  const [stockSearch, setStockSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const categoriesScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 140;
      categoriesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  // Add Product Form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [admissionTimeframe, setAdmissionTimeframe] = useState<'30days' | 'alltime'>('30days');
  const [historyFilterDate, setHistoryFilterDate] = useState<string>('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState<string>('Flower');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [newProdStrain, setNewProdStrain] = useState<StrainType>('Hybrid');
  const [newProdTHC, setNewProdTHC] = useState<string>('20');
  const [newProdCBD, setNewProdCBD] = useState<string>('0.2');
  const [newProdQty, setNewProdQty] = useState<string>('100');
  const [newProdUnit, setNewProdUnit] = useState<'g' | 'pcs'>('g');
  const [newProdPrice, setNewProdPrice] = useState<string>('12');
  const [newProdCost, setNewProdCost] = useState<string>('4.0');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdImage, setNewProdImage] = useState<string>('');

  // Detailed Stock Adjustment Drawer/Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustingItemImage, setAdjustingItemImage] = useState<string>('');
  const [adjustCategory, setAdjustCategory] = useState<string>('');
  const [adjustAmount, setAdjustAmount] = useState<string>('10');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('Shipment Restock');

  // Customer Check-in Search
  const [memberSearch, setMemberSearch] = useState('');
  const [editingNotesMember, setEditingNotesMember] = useState<Member | null>(null);
  const [notesTemp, setNotesTemp] = useState('');

  // Add Member Form (inside Member tab)
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemName, setNewMemName] = useState('');
  const [newMemPass, setNewMemPass] = useState('');
  const [newMemEmail, setNewMemEmail] = useState('');
  const [newMemPhone, setNewMemPhone] = useState('');
  const [newMemIsVip, setNewMemIsVip] = useState(false);
  const [newMemNotes, setNewMemNotes] = useState('');
  const [newMemIdCardNum, setNewMemIdCardNum] = useState('');

  // Membership extension/reduction selector states
  const [extendingMemberId, setExtendingMemberId] = useState<string | null>(null);
  const [extensionMonths, setExtensionMonths] = useState<number>(1);
  const [membershipAction, setMembershipAction] = useState<'extend' | 'reduce'>('extend');

  // Dynamic Category States
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('greenhouse_stock_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return ['Flower', 'Pre-rolls', 'Edibles', 'Concentrates', 'Vapes'];
  });

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('greenhouse_category_colors');
    if (saved) {
      try {
        return JSON.parse(saved);
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
  });

  const DIVERSE_COLORS = [
    '#22C55E', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#EF4444',
    '#06B6D4', '#F97316', '#10B981', '#14B8A6', '#D946EF', '#6366F1'
  ];

  const [newCategoryColor, setNewCategoryColor] = useState('#22C55E');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');

  const getCategoryColor = (cat: string) => {
    return categoryColors[cat] || categoryColors[cat.trim()] || '#4ADE80';
  };

  // --- MULTI-DISCOUNT PANEL FORM STATES ---
  const [newRuleThreshold, setNewRuleThreshold] = useState<number>(3);
  const [newRuleDiscount, setNewRuleDiscount] = useState<number | ''>(10);
  const [newCampaignItemId, setNewCampaignItemId] = useState<string>('');
  const [newCampaignDiscount, setNewCampaignDiscount] = useState<number | ''>(15);

  const saveCategories = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem('greenhouse_stock_categories', JSON.stringify(newCats));
  };

  const [selectedSaleProduct, setSelectedSaleProduct] = useState<string | null>(null);
  const [salesFilter, setSalesFilter] = useState<string>('All');
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Close day & save returns ledger list
  const handleCloseAndResetDay = (customDateStr?: string) => {
    const activeActivities = activities.filter(act => {
      const actTime = new Date(act.timestamp).getTime();
      return actTime > lastSalesResetTime && act.type === 'Dispensed';
    });

    let totalRevenue = 0;
    const salesList: any[] = [];

    activeActivities.forEach(act => {
      const match = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+?)\s+to\s+([^.]+)/i);
      let buyerName = 'Unknown Member';
      let itemName = 'Unknown Product';
      let quantity = 0;
      let unit = 'g';
      let revenue = 0;

      if (match) {
        quantity = parseFloat(match[1]);
        unit = match[2] || 'g';
        itemName = match[3].trim();
        buyerName = match[4].trim();
        
        const contribMatch = act.message.match(/Contribution:\s*R?([\d.]+)/i);
        revenue = contribMatch ? parseFloat(contribMatch[1]) : 0;
      } else {
        const fallback = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+)/i);
        if (fallback) {
          quantity = parseFloat(fallback[1]);
          unit = fallback[2] || 'g';
          let remainder = fallback[3];
          const toIndex = remainder.toLowerCase().indexOf(' to ');
          if (toIndex !== -1) {
            buyerName = remainder.substring(toIndex + 4).trim();
            itemName = remainder.substring(0, toIndex).trim();
          } else {
            itemName = remainder.trim();
          }
        }
      }

      // Fallback calculation for revenue if 0 but we have price
      if (revenue === 0 && quantity > 0) {
        const itemInfo = inventory.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        revenue = itemInfo ? itemInfo.pricePerUnit * quantity : 0;
      }

      totalRevenue += revenue;
      salesList.push({
        id: act.id,
        timestamp: act.timestamp,
        buyerName,
        itemName,
        quantity,
        unit,
        revenue,
        budtender: act.user
      });
    });

    const dateObj = new Date();
    const dateStr = customDateStr || dateObj.toISOString().split('T')[0];

    // Check if we already have this date in closedDays
    const existingClosed = closedDays.find(d => d.date === dateStr);
    const updatedClosed = closedDays.filter(d => d.date !== dateStr);
    
    let finalSalesList = [...salesList];
    if (existingClosed && existingClosed.salesList) {
      existingClosed.salesList.forEach((closedItem: any) => {
        const isDuplicate = finalSalesList.some((newItem: any) => {
          if (closedItem.id && newItem.id && closedItem.id === newItem.id) {
            return true;
          }
          return (
            closedItem.buyerName === newItem.buyerName &&
            closedItem.itemName === newItem.itemName &&
            Math.abs(new Date(closedItem.timestamp).getTime() - new Date(newItem.timestamp).getTime()) < 5000
          );
        });
        if (!isDuplicate) {
          finalSalesList.push(closedItem);
        }
      });
    }

    const calculatedTotalReturns = finalSalesList.reduce((sum, item) => sum + (item.revenue || 0), 0);

    const newClosedDay = {
      date: dateStr,
      totalReturns: parseFloat(calculatedTotalReturns.toFixed(2)),
      salesList: finalSalesList
    };

    const finalClosedDays = [...updatedClosed, newClosedDay].sort((a, b) => b.date.localeCompare(a.date));
    setClosedDays(finalClosedDays);
    localStorage.setItem('greenhouse_closed_days', JSON.stringify(finalClosedDays));

    const nextResetTime = Date.now();
    setLastSalesResetTime(nextResetTime);
    localStorage.setItem('greenhouse_last_sales_reset_time', String(nextResetTime));

    onAddActivity(
      'Security',
      `Closed trading day ${dateStr}. Calculated R${totalRevenue.toFixed(2)} total returns posted to Owner Calendar, sales period reset.`,
      `Owner closed sales tracking session. Setting new ledger session marker.`
    );
  };

  useEffect(() => {
    const checkAutoReset = () => {
      const now = new Date();
      const [hours, minutes] = dailyResetTime.split(':').map(Number);
      
      const resetTimeToday = new Date();
      resetTimeToday.setHours(hours || 22, minutes || 0, 0, 0);

      const todayStr = now.toISOString().split('T')[0];

      if (now.getTime() > resetTimeToday.getTime() && lastSalesResetTime < resetTimeToday.getTime()) {
        const activeCount = activities.filter(act => {
          const actTime = new Date(act.timestamp).getTime();
          return actTime > lastSalesResetTime && act.type === 'Dispensed';
        }).length;

        if (activeCount > 0) {
          handleCloseAndResetDay(todayStr);
        } else {
          const nowTs = Date.now();
          setLastSalesResetTime(nowTs);
          localStorage.setItem('greenhouse_last_sales_reset_time', String(nowTs));
        }
      }
    };

    checkAutoReset();
    const interval = setInterval(checkAutoReset, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [dailyResetTime, lastSalesResetTime, activities, closedDays]);

  // Configurable low inventory stock threshold trigger
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(() => {
    const saved = localStorage.getItem('greenhouse_low_stock_threshold');
    return saved ? Number(saved) : 5; // default to 5
  });

  const handleThresholdChange = (val: number | '') => {
    if (val === '') {
      setLowStockThreshold('');
    } else {
      const valid = Math.max(0, val);
      setLowStockThreshold(valid);
      localStorage.setItem('greenhouse_low_stock_threshold', String(valid));
    }
  };

  // Membership pricing state edited by owners & budtenders
  const [membershipFee, setMembershipFee] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_membership_fee_amount');
    return saved ? Number(saved) : 150; // default to 150
  });

  const [pendingMembershipFee, setPendingMembershipFee] = useState<number | ''>(membershipFee);

  useEffect(() => {
    setPendingMembershipFee(membershipFee);
  }, [membershipFee]);

  const handleUpdateMembershipFee = (newFee: number) => {
    const valid = Math.max(0, newFee);
    setMembershipFee(valid);
    localStorage.setItem('greenhouse_membership_fee_amount', String(valid));
    const position = currentUserRole === 'owner' ? 'Owner' : (currentUserRole === 'trusted_budtender' ? 'Trusted Budtender' : 'Budtender');
    onAddActivity('MemberUpdate', `Standard membership rate updated to R${valid} by ${position} ${currentUser}.`);
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSalesCSV = () => {
    const records = getAllSalesRecords();
    const headers = [
      'Date',
      'Timestamp',
      'Transaction ID',
      'Buyer (Member)',
      'Dispensed Product',
      'Quantity',
      'Unit',
      'Contribution Value (ZAR)',
      'Served By (Operator)',
      'Ledger Session State'
    ];

    const rows = records.map(r => [
      r.date || '',
      r.timestamp || '',
      r.id || '',
      r.buyerName || '',
      r.itemName || '',
      String(r.quantity || 0),
      r.unit || '',
      String(r.revenue || 0),
      r.budtender || '',
      r.isClosed ? 'Closed & Posted Ledger' : 'Active Open Session'
    ]);

    downloadCSV('greenhouse_sales_ledger_history.csv', headers, rows);
    onAddActivity('Security', `Owner ${currentUser} exported itemized Sales Ledger to CSV.`, `Extracted ${records.length} sales rows.`);
  };

  const handleExportActivityCSV = () => {
    const headers = [
      'Timestamp',
      'Event ID',
      'Type',
      'Audit Log Message',
      'System Operator',
      'Confidential Reference Details'
    ];

    const rows = activities.slice().reverse().map(act => [
      act.timestamp || '',
      act.id || '',
      act.type || '',
      act.message || '',
      act.user || '',
      act.details || ''
    ]);

    downloadCSV('greenhouse_audit_trail_history.csv', headers, rows);
    onAddActivity('Security', `Owner ${currentUser} exported complete Dispensary Event Log to CSV.`, `Extracted ${activities.length} activity rows.`);
  };

  const handleExportFullBackupJSON = () => {
    if (currentUserRole !== 'owner') return;
    const backupData = {
      backupVersion: '1.0',
      timestamp: new Date().toISOString(),
      exportedBy: currentUser,
      inventory,
      members,
      activities,
      discountSettings: {
        visitThreshold,
        visitDiscountPercent,
        discountItemId,
        itemDiscountPercent,
        visitDiscountRules,
        itemDiscountCampaigns,
        employeeBudtenderDiscount,
        employeeTrustedBudtenderDiscount
      }
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `greenhouse_all_data_backup_${dateStr}_${timeStr}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddActivity('Security', `Owner ${currentUser} exported a complete secure JSON database backup.`, `Extracted ${inventory.length} inventory products, ${members.length} members, and ${activities.length} activity transactions.`);
  };

  const handleExportMembersCSV = () => {
    if (currentUserRole !== 'owner') return;
    const standardMembers = members.filter(m => m.role !== 'owner' && m.role !== 'budtender' && m.role !== 'trusted_budtender');
    const headers = [
      'Member Number',
      'Full Name',
      'Role',
      'Status',
      'Email Address',
      'Cellphone Number',
      'National ID / Passport Number',
      'Joined Date',
      'Total Spent (ZAR)',
      'Grams Consumed (g)',
      'Total Visits',
      'Last Visit Date',
      'Is VIP',
      'Notes'
    ];

    const rows = standardMembers.map(m => [
      m.memberNumber || '',
      m.name || '',
      m.role || 'member',
      m.status || 'Active',
      m.email || '',
      m.phone || '',
      m.idCardNumber || '',
      m.joinedDate || '',
      String(m.totalSpent || 0),
      String(m.consumedGrams || 0),
      String(m.visitsCount || 0),
      m.lastVisit || '',
      m.isVip ? 'Yes' : 'No',
      m.notes || ''
    ]);

    downloadCSV('greenhouse_members_registry.csv', headers, rows);
    onAddActivity('Security', `Owner ${currentUser} exported Active Member Registry to CSV.`, `Extracted ${standardMembers.length} standard member records.`);
  };

  const handleExportBudtendersCSV = () => {
    const staffMembers = members.filter(m => m.role === 'owner' || m.role === 'budtender' || m.role === 'trusted_budtender');
    const headers = [
      'Staff Member Number',
      'Full Name',
      'Assigned Role',
      'Credentials Status',
      'Cellphone Number',
      'National ID / Passport Number',
      'Date Enlisted',
      'Active Pin Passcode',
      'System Log Notes'
    ];

    const rows = staffMembers.map(m => [
      m.memberNumber || '',
      m.name || '',
      m.role === 'owner' ? 'Owner' : m.role === 'trusted_budtender' ? 'Trusted Budtender' : 'Standard Budtender',
      m.status || 'Active',
      m.phone || '',
      m.idCardNumber || '',
      m.joinedDate || '',
      m.passwordHash || '',
      m.notes || ''
    ]);

    downloadCSV('greenhouse_budtenders_registry.csv', headers, rows);
    onAddActivity('Security', `Owner ${currentUser} exported Staff & Budtender Security Registry to CSV.`, `Extracted ${staffMembers.length} authorized personnel entries.`);
  };

  const handleExportStockCSV = () => {
    if (currentUserRole !== 'owner') return;
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Strain Type',
      'THC (%)',
      'CBD (%)',
      'In Stock Quantity',
      'Unit',
      'Cost per Unit (ZAR)',
      'Contribution Price per Unit (ZAR)',
      'Description'
    ];

    const rows = inventory.map(item => [
      item.sku || '',
      item.name || '',
      item.category || '',
      item.strainType || 'None',
      String(item.thc || 0),
      String(item.cbd || 0),
      String(item.quantity || 0),
      item.unit || 'g',
      String(item.costPerGram || 0),
      String(item.pricePerUnit || 0),
      item.description || ''
    ]);

    downloadCSV('greenhouse_inventory_catalog.csv', headers, rows);
    onAddActivity('Security', `Owner ${currentUser} exported active Catalog Inventory Stock to CSV.`, `Extracted ${inventory.length} active inventory rows.`);
  };

  const getLast30DaysData = () => {
    const result = [];
    const today = new Date();
    
    const counts: Record<string, number> = {};
    let earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - 29); // minimum of 30 days ago to keep it neat

    members.forEach(m => {
      if (m.joinedDate) {
        counts[m.joinedDate] = (counts[m.joinedDate] || 0) + 1;
        const d = new Date(m.joinedDate);
        if (!isNaN(d.getTime()) && d < earliestDate) {
          earliestDate = d;
        }
      }
    });

    if (admissionTimeframe === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const month = d.toLocaleString('en-US', { month: 'short' });
        const day = String(d.getDate()).padStart(2, '0');
        const label = `${month} ${day}`;
        
        result.push({
          date: dateStr,
          label,
          count: counts[dateStr] || 0
        });
      }
    } else {
      // All-time daily registration trend
      const start = new Date(earliestDate);
      start.setHours(0,0,0,0);
      const end = new Date(today);
      end.setHours(0,0,0,0);

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Safeguard: up to 365 days of history for high density detail
      const maxDays = Math.min(diffDays, 365);
      
      for (let i = maxDays; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const month = d.toLocaleString('en-US', { month: 'short' });
        const day = String(d.getDate()).padStart(2, '0');
        const label = `${month} ${day}`;
        
        result.push({
          date: dateStr,
          label,
          count: counts[dateStr] || 0
        });
      }
    }
    return result;
  };

  const CustomRegistrationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0C1210] border border-white/10 p-3 rounded-xl shadow-2xl font-mono text-xs z-50">
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{data.date}</p>
          <p className="font-bold text-white mt-1">
            Admissions: <span className="text-[#4ADE80]">{data.count} new {data.count === 1 ? 'member' : 'members'}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getMembershipCalculations = () => {
    const standardMembers = members.filter(m => m.role !== 'owner' && m.role !== 'budtender' && m.role !== 'trusted_budtender');
    let activeNoSassyCount = 0;
    let expiredNoSassyCount = 0;
    let sassyCount = 0;

    standardMembers.forEach(m => {
      const isSassy = m.name.toLowerCase() === 'sassy';
      if (isSassy) {
        sassyCount++;
      } else {
        const expiresMs = m.membershipExpiresDate
          ? new Date(m.membershipExpiresDate).getTime()
          : (new Date(m.lastMembershipPaidDate || m.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000));
        const isExpired = expiresMs < Date.now();
        if (isExpired) {
          expiredNoSassyCount++;
        } else {
          activeNoSassyCount++;
        }
      }
    });

    const expectedActive = activeNoSassyCount * membershipFee;
    const expectedExpired = expiredNoSassyCount * membershipFee;
    const expectedTotal = expectedActive + expectedExpired;

    // Track total renewal payments from activities
    let totalManualRenewalsCount = 0;
    activities.forEach(act => {
      if (act.message && act.message.includes('Membership Renewed/Extended')) {
        const monthMatch = act.message.match(/by\s+(\d+)\s+month/i);
        const months = monthMatch ? parseInt(monthMatch[1], 10) : 1;
        const isSassy = act.message.toLowerCase().includes('for sassy ');
        if (!isSassy) {
          totalManualRenewalsCount += months;
        }
      }
    });

    const initialFeesCollected = (standardMembers.length - sassyCount) * membershipFee;
    const renewalsCollected = totalManualRenewalsCount * membershipFee;
    const totalMembershipRevenue = initialFeesCollected + renewalsCollected;

    // Total product sales revenue
    const productSalesRevenue = parseSalesData().reduce((acc, curr) => acc + curr.totalRevenue, 0);
    const totalCollectedOverall = totalMembershipRevenue + productSalesRevenue;

    return {
      expectedActive,
      expectedExpired,
      expectedTotal,
      activeCount: activeNoSassyCount,
      expiredCount: expiredNoSassyCount,
      sassyCount,
      initialFeesCollected,
      renewalsCollected,
      totalMembershipRevenue,
      productSalesRevenue,
      totalCollectedOverall
    };
  };

  const parseSalesData = () => {
    const dataMap: { [productName: string]: { quantity: number; unit: string; totalRevenue: number } } = {};

    activities.forEach(act => {
      if (new Date(act.timestamp).getTime() <= lastSalesResetTime) return;

      if (act.type === 'Dispensed') {
        const dispenseMatch = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+?)\s+to\s+([^.]+)/i);
        if (dispenseMatch) {
          const qty = parseFloat(dispenseMatch[1]);
          const unit = dispenseMatch[2] || 'g';
          const pName = dispenseMatch[3].trim();

          const contribMatch = act.message.match(/Contribution:\s*R?([\d.]+)/i);
          const revenue = contribMatch ? parseFloat(contribMatch[1]) : 0;

          if (!dataMap[pName]) {
            dataMap[pName] = { quantity: 0, unit, totalRevenue: 0 };
          }
          dataMap[pName].quantity += qty;
          dataMap[pName].totalRevenue += revenue;
        } else {
          const fallbackMatch = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+)/i);
          if (fallbackMatch) {
            const qty = parseFloat(fallbackMatch[1]);
            const unit = fallbackMatch[2] || 'g';
            let remainder = fallbackMatch[3];
            const toIndex = remainder.toLowerCase().indexOf(' to ');
            if (toIndex !== -1) {
              remainder = remainder.substring(0, toIndex);
            }
            const pName = remainder.trim();
            if (!dataMap[pName]) {
              dataMap[pName] = { quantity: 0, unit, totalRevenue: 0 };
            }
            dataMap[pName].quantity += qty;
          }
        }
      }
    });

    inventory.forEach(item => {
      if (!dataMap[item.name]) {
        dataMap[item.name] = { quantity: 0, unit: item.unit, totalRevenue: 0 };
      }
    });

    return Object.entries(dataMap).map(([name, info]) => {
      const catalogItem = inventory.find(item => item.name.toLowerCase() === name.toLowerCase());
      const category = catalogItem ? catalogItem.category : 'General';
      const pricePerUnit = catalogItem ? catalogItem.pricePerUnit : 0;
      const costPerGram = catalogItem ? (catalogItem.costPerGram || 4.0) : 4.0; // fallback default of 4.0 matching R3-R5 stock

      let estRevenue = info.totalRevenue;
      if (estRevenue === 0 && info.quantity > 0 && pricePerUnit > 0) {
        estRevenue = info.quantity * pricePerUnit;
      }

      const totalCost = info.quantity * costPerGram;
      const totalProfit = estRevenue - totalCost;

      return {
        name,
        quantity: parseFloat(info.quantity.toFixed(1)),
        unit: info.unit,
        totalRevenue: parseFloat(estRevenue.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        costPerGram,
        category
      };
    }).sort((a, b) => b.quantity - a.quantity);
  };

  const getSalesForCalendarDay = (dateStr: string) => {
    // Check if we have a closedDays record matching dateStr
    const closedRecord = closedDays.find((c: any) => c.date === dateStr);

    // Gather any Dispensed activities whose date matches dateStr!
    const matchingActivities = activities.filter(act => {
      if (act.type !== 'Dispensed') return false;
      const actDate = new Date(act.timestamp);
      const year = actDate.getFullYear();
      const month = String(actDate.getMonth() + 1).padStart(2, '0');
      const day = String(actDate.getDate()).padStart(2, '0');
      const actDateStr = `${year}-${month}-${day}`;
      return actDateStr === dateStr;
    });

    const parsedLiveSales: any[] = [];

    matchingActivities.forEach(act => {
      const match = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+?)\s+to\s+([^.]+)/i);
      let buyerName = 'Unknown Member';
      let itemName = 'Unknown Product';
      let quantity = 0;
      let unit = 'g';
      let revenue = 0;

      if (match) {
        quantity = parseFloat(match[1]);
        unit = match[2] || 'g';
        itemName = match[3].trim();
        buyerName = match[4].trim();
        
        const contribMatch = act.message.match(/Contribution:\s*R?([\d.]+)/i);
        revenue = contribMatch ? parseFloat(contribMatch[1]) : 0;
      } else {
        const fallback = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+)/i);
        if (fallback) {
          quantity = parseFloat(fallback[1]);
          unit = fallback[2] || 'g';
          let remainder = fallback[3];
          const toIndex = remainder.toLowerCase().indexOf(' to ');
          if (toIndex !== -1) {
            buyerName = remainder.substring(toIndex + 4).trim();
            itemName = remainder.substring(0, toIndex).trim();
          } else {
            itemName = remainder.trim();
          }
        }
      }

      if (revenue === 0 && quantity > 0) {
        const itemInfo = inventory.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        revenue = itemInfo ? itemInfo.pricePerUnit * quantity : 0;
      }

      parsedLiveSales.push({
        id: act.id,
        timestamp: act.timestamp,
        buyerName,
        itemName,
        quantity,
        unit,
        revenue,
        budtender: act.user
      });
    });

    // Gather and parse any membership registration/renewal activities on dateStr
    const matchingMemberActivities = activities.filter(act => {
      if (act.type !== 'MemberUpdate') return false;
      const actDate = new Date(act.timestamp);
      const year = actDate.getFullYear();
      const month = String(actDate.getMonth() + 1).padStart(2, '0');
      const day = String(actDate.getDate()).padStart(2, '0');
      const actDateStr = `${year}-${month}-${day}`;
      return actDateStr === dateStr;
    });

    matchingMemberActivities.forEach(act => {
      // 1. Check for standard member registration initial dues
      if (act.message.includes('Registered member profile:')) {
        const match = act.message.match(/Registered member profile:\s*(.+?)\s*\(([A-Z0-9-]+)\)/i);
        if (match) {
          const name = match[1].trim();
          const memberNum = match[2].trim();
          
          const mInfo = members.find(m => m.memberNumber === memberNum || m.name.toLowerCase() === name.toLowerCase());
          const isStaff = mInfo ? (mInfo.role === 'owner' || mInfo.role === 'budtender' || mInfo.role === 'trusted_budtender') : false;
          const isSassy = name.toLowerCase() === 'sassy';

          if (!isStaff) {
            parsedLiveSales.push({
              id: act.id,
              timestamp: act.timestamp,
              buyerName: name,
              itemName: 'Admission & 1st Month Dues',
              quantity: 1,
              unit: 'month',
              revenue: isSassy ? 0 : membershipFee,
              budtender: act.user || 'System'
            });
          }
        }
      }

      // 2. Check for manual renewals/extensions
      if (act.message.includes('Membership Renewed/Extended') || act.message.includes('Membership Renewed') || act.message.includes('Membership Extended')) {
        const match = act.message.match(/for\s+(.+?)\s+\((.+?)\)\s+by\s+(\d+)\s+month/i);
        if (match) {
          const name = match[1].trim();
          const memberNum = match[2].trim();
          const months = parseInt(match[3], 10) || 1;
          const isSassy = name.toLowerCase() === 'sassy';

          parsedLiveSales.push({
            id: act.id,
            timestamp: act.timestamp,
            buyerName: name,
            itemName: `Membership Renewal (${months} mo)`,
            quantity: months,
            unit: 'month',
            revenue: isSassy ? 0 : (months * membershipFee),
            budtender: act.user || 'System'
          });
        }
      }
    });

    // Merge closedRecord sales and live parsed sales
    const mergedSales: any[] = [...parsedLiveSales];
    if (closedRecord && closedRecord.salesList) {
      closedRecord.salesList.forEach((closedItem: any) => {
        const isDuplicate = mergedSales.some((liveItem: any) => {
          if (closedItem.id && liveItem.id && closedItem.id === liveItem.id) {
            return true;
          }
          return (
            closedItem.buyerName === liveItem.buyerName &&
            closedItem.itemName === liveItem.itemName &&
            Math.abs(new Date(closedItem.timestamp).getTime() - new Date(liveItem.timestamp).getTime()) < 5000
          );
        });
        if (!isDuplicate) {
          mergedSales.push(closedItem);
        }
      });
    }

    const totalReturns = mergedSales.reduce((sum, item) => sum + (item.revenue || 0), 0);

    return {
      salesList: mergedSales,
      totalReturns: parseFloat(totalReturns.toFixed(2)),
      isClosed: closedRecord ? true : false,
    };
  };

  const getAllSalesRecords = () => {
    const list: any[] = [];
    
    // 1. Gather closed days sales
    closedDays.forEach((cd: any) => {
      if (cd.salesList && Array.isArray(cd.salesList)) {
        cd.salesList.forEach((s: any) => {
          list.push({
            ...s,
            isClosed: true,
            date: cd.date
          });
        });
      }
    });

    // 2. Gather active unclosed sales (since lastSalesResetTime)
    const activeActivities = activities.filter(act => {
      const actTime = new Date(act.timestamp).getTime();
      return actTime > lastSalesResetTime && act.type === 'Dispensed';
    });

    activeActivities.forEach(act => {
      const match = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+?)\s+to\s+([^.]+)/i);
      let buyerName = 'Unknown Member';
      let itemName = 'Unknown Product';
      let quantity = 0;
      let unit = 'g';
      let revenue = 0;

      if (match) {
        quantity = parseFloat(match[1]);
        unit = match[2] || 'g';
        itemName = match[3].trim();
        buyerName = match[4].trim();
        
        const contribMatch = act.message.match(/Contribution:\s*R?([\d.]+)/i);
        revenue = contribMatch ? parseFloat(contribMatch[1]) : 0;
      } else {
        const fallback = act.message.match(/Dispensed\s+([\d.]+)([a-zA-Z]*)\s+of\s+(.+)/i);
        if (fallback) {
          quantity = parseFloat(fallback[1]);
          unit = fallback[2] || 'g';
          let remainder = fallback[3];
          const toIndex = remainder.toLowerCase().indexOf(' to ');
          if (toIndex !== -1) {
            buyerName = remainder.substring(toIndex + 4).trim();
            itemName = remainder.substring(0, toIndex).trim();
          } else {
            itemName = remainder.trim();
          }
        }
      }

      if (revenue === 0 && quantity > 0) {
        const itemInfo = inventory.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        revenue = itemInfo ? itemInfo.pricePerUnit * quantity : 0;
      }

      const actDate = new Date(act.timestamp);
      const year = actDate.getFullYear();
      const month = String(actDate.getMonth() + 1).padStart(2, '0');
      const day = String(actDate.getDate()).padStart(2, '0');
      const actDateStr = `${year}-${month}-${day}`;

      list.push({
        id: act.id,
        timestamp: act.timestamp,
        buyerName,
        itemName,
        quantity,
        unit,
        revenue,
        budtender: act.user,
        isClosed: false,
        date: actDateStr
      });
    });

    return list;
  };

  const getFilteredSalesRecords = (period: 'all' | 'monthly' | 'weekly' | 'daily') => {
    const allRecords = getAllSalesRecords();
    if (period === 'all') return allRecords;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    
    const getStartOfWeek = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay(); // 0 is Sunday, 1 is Monday
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0,0,0,0);
      return monday;
    };
    
    const startOfWeek = getStartOfWeek(now);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return allRecords.filter(r => {
      const rDate = new Date(r.timestamp);
      if (period === 'monthly') {
        return rDate.getFullYear() === curYear && rDate.getMonth() === curMonth;
      } else if (period === 'weekly') {
        return rDate >= startOfWeek && rDate < endOfWeek;
      } else if (period === 'daily') {
        return (
          rDate.getFullYear() === curYear &&
          rDate.getMonth() === curMonth &&
          rDate.getDate() === now.getDate()
        );
      }
      return true;
    });
  };

  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'flower': return { dot: 'bg-emerald-400 shadow-emerald-400/50', text: 'text-emerald-400', border: 'border-emerald-500/20' };
      case 'pre-rolls': return { dot: 'bg-amber-400 shadow-amber-400/50', text: 'text-amber-400', border: 'border-amber-500/20' };
      case 'edibles': return { dot: 'bg-purple-400 shadow-purple-400/50', text: 'text-purple-400', border: 'border-purple-500/20' };
      case 'concentrates': return { dot: 'bg-orange-400 shadow-orange-400/50', text: 'text-orange-400', border: 'border-orange-500/20' };
      case 'vapes': return { dot: 'bg-cyan-400 shadow-cyan-400/50', text: 'text-cyan-400', border: 'border-cyan-500/20' };
      default: return { dot: 'bg-sky-400 shadow-sky-400/50', text: 'text-sky-400', border: 'border-sky-500/20' };
    }
  };

  // Budtender Management States
  const [showAddBudtender, setShowAddBudtender] = useState(false);
  const [newBtName, setNewBtName] = useState('');
  const [newBtPass, setNewBtPass] = useState('');
  const [newBtRole, setNewBtRole] = useState<'owner' | 'budtender' | 'trusted_budtender'>('budtender');
  const [newBtNotes, setNewBtNotes] = useState('');
  const [newBtIdCardNum, setNewBtIdCardNum] = useState('');
  const [newBtPhone, setNewBtPhone] = useState('');
  const [btError, setBtError] = useState('');

  // Custom Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    type: 'delete_member' | 'delete_stock' | 'revoke_staff' | 'delete_category' | 'close_day';
    title: string;
    message: string;
    targetId: string;
    targetName?: string;
  } | null>(null);

  const handleExecuteConfirmedAction = () => {
    if (!confirmModal) return;

    const { type, targetId, targetName } = confirmModal;

    if (type === 'delete_stock') {
      const itemToDelete = inventory.find(i => i.id === targetId);
      const updated = inventory.filter(i => i.id !== targetId);
      onUpdateInventory(updated);
      onAddActivity(
        'InventoryAdjust',
        `Permanently deleted inventory product variation: ${targetName} from active catalogue shelving.`,
        `Removed by Owner: ${currentUser}`,
        {
          type: 'delete_stock',
          previousItemState: itemToDelete,
          itemId: targetId
        }
      );
    } else if (type === 'delete_member') {
      const member = members.find(m => m.id === targetId);
      if (member) {
        const updated = members.filter(m => m.id !== targetId);
        onUpdateMembers(updated);
        onAddActivity(
          'Security',
          `Permanently deleted membership: ${member.name} (${member.memberNumber}).`,
          `Executed by Owner: ${currentUser}. Complete data ledger removed.`,
          {
            type: 'delete_member',
            previousMemberState: member
          }
        );
      }
    } else if (type === 'revoke_staff') {
      const updated = members.filter(m => m.id !== targetId);
      onUpdateMembers(updated);
      onAddActivity(
        'Security',
        `De-authorized and fully revoked staff credentials for: ${targetName}.`,
        `Revoked by: ${currentUser}`
      );
    } else if (type === 'delete_category') {
      const name = targetId;
      const updatedCats = categories.filter(c => c !== name);
      saveCategories(updatedCats);

      // Reassign inventory items to "Uncategorized"
      const updatedInv = inventory.map(item => {
        if (item.category === name) {
          return { ...item, category: 'Uncategorized' };
        }
        return item;
      });
      onUpdateInventory(updatedInv);

      onAddActivity(
        'InventoryAdjust',
        `Owner ${currentUser} deleted stock category "${name}".`,
        `Product items reassigned to Uncategorized: ${inventory.filter(i => i.category === name).length}`
      );
    } else if (type === 'close_day') {
      handleCloseAndResetDay(targetId);
      setActiveDayPopup(null);
    }

    setConfirmModal(null);
  };

  // -- STOCK ACTIONS --
  // Direct Quick Count Update (+/- 1 token adjustments for budtenders)
  const handleQuickAdjust = (itemId: string, increment: boolean) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const change = increment ? 1 : -1;
    const newQuantity = Math.max(0, parseFloat((item.quantity + change).toFixed(2)));
    
    const updated = inventory.map(i => {
      if (i.id === itemId) {
        return { ...i, quantity: newQuantity };
      }
      return i;
    });

    onUpdateInventory(updated);
    onAddActivity(
      'InventoryAdjust',
      `Budtender quick count update: ${item.name} adjusted by ${change > 0 ? '+' : ''}${change}${item.unit}. New Stock: ${newQuantity}${item.unit}.`,
      `Product: ${item.name} (${item.sku})`,
      {
        type: 'inventory_count',
        itemId,
        previousQuantity: item.quantity
      }
    );
  };

  // Detailed batch Adjustment
  const handleSaveDetailedAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const rawAmt = parseFloat(adjustAmount);
    if (isNaN(rawAmt) || rawAmt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const direction = adjustType === 'add' ? 1 : -1;
    const finalChange = direction * rawAmt;
    const newQuantity = Math.max(0, parseFloat((adjustingItem.quantity + finalChange).toFixed(2)));

    const updated = inventory.map(i => {
      if (i.id === adjustingItem.id) {
        return { 
          ...i, 
          quantity: newQuantity,
          imageUrl: adjustingItemImage.trim() !== '' ? adjustingItemImage.trim() : i.imageUrl,
          category: adjustCategory.trim() !== '' ? adjustCategory.trim() : i.category
        };
      }
      return i;
    });

    onUpdateInventory(updated);
    onAddActivity(
      'InventoryAdjust',
      `Manual stockpile adjustment: ${adjustingItem.name} [Shelf: ${adjustCategory || adjustingItem.category}] ${adjustType === 'add' ? 'increased' : 'reduced'} by ${rawAmt}${adjustingItem.unit} due to "${adjustReason}". New Stock: ${newQuantity}${adjustingItem.unit}.`,
      `Adjusted by: ${currentUser}`,
      {
        type: 'inventory_count',
        itemId: adjustingItem.id,
        previousQuantity: adjustingItem.quantity
      }
    );

    setAdjustingItem(null);
    setAdjustingItemImage('');
    setAdjustCategory('');
    setAdjustAmount('10');
  };

  const handleUndoActivity = (act: ActivityLog) => {
    if (currentUserRole !== 'owner') {
      alert("Access Denied: Only Owners are authorized to revert event logs.");
      return;
    }

    if (!act.undoPayload || act.undoPayload.undone) return;

    const { type, previousItemState, previousMemberState, itemId, previousQuantity } = act.undoPayload;

    if (type === 'inventory_count') {
      if (itemId !== undefined && previousQuantity !== undefined) {
        const itemExists = inventory.some(i => i.id === itemId);
        if (!itemExists) {
          alert(`Undo Failed: This product variation no longer exists in stock. If it was deleted, you must undo that deletion first.`);
          return;
        }

        const updatedInv = inventory.map(i => {
          if (i.id === itemId) {
            return { ...i, quantity: previousQuantity };
          }
          return i;
        });
        onUpdateInventory(updatedInv);

        onAddActivity(
          'InventoryAdjust',
          `Owner ${currentUser} reverted stock quantity of listing. Restored prior count of ${previousQuantity}.`,
          `Undone Event ID: ${act.id}`
        );
      }
    } else if (type === 'delete_stock') {
      if (previousItemState) {
        const itemExists = inventory.some(i => i.id === previousItemState.id || i.sku === previousItemState.sku);
        if (itemExists) {
          alert(`Undo Info: Product listing already exists in inventory or has an active SKU conflict.`);
          return;
        }

        onUpdateInventory([...inventory, previousItemState]);

        onAddActivity(
          'InventoryAdjust',
          `Owner ${currentUser} undid deletion of product listing: "${previousItemState.name}" (${previousItemState.sku}). Product restored to active catalog.`,
          `Undone Event ID: ${act.id}`
        );
      }
    } else if (type === 'delete_member') {
      if (previousMemberState) {
        const memExists = members.some(m => m.id === previousMemberState.id || m.memberNumber === previousMemberState.memberNumber);
        if (memExists) {
          alert(`Undo Info: Membership profile already exists in association records.`);
          return;
        }

        onUpdateMembers([...members, previousMemberState]);

        onAddActivity(
          'Security',
          `Owner ${currentUser} undid deletion of membership profile: "${previousMemberState.name}" (${previousMemberState.memberNumber}). Restored full membership credentials.`,
          `Undone Event ID: ${act.id}`
        );
      }
    }

    if (onUpdateActivities) {
      const updatedActs = activities.map(a => {
        if (a.id === act.id) {
          return {
            ...a,
            undoPayload: {
              ...a.undoPayload!,
              undone: true,
              undoneBy: currentUser,
              undoneTimestamp: new Date().toISOString()
            }
          };
        }
        return a;
      });
      onUpdateActivities(updatedActs);
    }
  };

  // -- CATEGORY ACTIONS --
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'owner') {
      alert("Access Denied: Only Owners can manage categories.");
      return;
    }
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert(`Category "${name}" already exists.`);
      return;
    }
    const updated = [...categories, name];
    saveCategories(updated);

    // Save color to categoryColors map
    const updatedColors = { ...categoryColors, [name]: newCategoryColor };
    setCategoryColors(updatedColors);
    localStorage.setItem('greenhouse_category_colors', JSON.stringify(updatedColors));

    setNewCategoryName('');
    // choose a new random color for next one
    const randomNext = DIVERSE_COLORS[Math.floor(Math.random() * DIVERSE_COLORS.length)];
    setNewCategoryColor(randomNext);

    onAddActivity(
      'InventoryAdjust',
      `Owner ${currentUser} created a new inventory stock category: "${name}".`,
      `Created at ${new Date().toLocaleTimeString()}`
    );
  };

  const handleEditCategorySubmit = (oldName: string) => {
    if (currentUserRole !== 'owner') {
      alert("Access Denied: Only Owners can manage categories.");
      return;
    }
    const val = editingCategoryValue.trim();
    if (!val) {
      alert('Category name cannot be empty.');
      return;
    }
    if (val.toLowerCase() !== oldName.toLowerCase() && categories.some(c => c.toLowerCase() === val.toLowerCase())) {
      alert(`Another category with name "${val}" already exists.`);
      return;
    }

    // Update categories list
    const updatedCats = categories.map(c => c === oldName ? val : c);
    saveCategories(updatedCats);

    // Save color to categoryColors map
    const updatedColors = { ...categoryColors };
    if (oldName !== val) {
      delete updatedColors[oldName];
    }
    updatedColors[val] = editingCategoryColor;
    setCategoryColors(updatedColors);
    localStorage.setItem('greenhouse_category_colors', JSON.stringify(updatedColors));

    // Relabel all inventory items with old category name to new category name
    const updatedInv = inventory.map(item => {
      if (item.category === oldName) {
        return { ...item, category: val };
      }
      return item;
    });
    onUpdateInventory(updatedInv);

    onAddActivity(
      'InventoryAdjust',
      `Owner ${currentUser} modified stock category "${oldName}" to "${val}" and updated color. Updated matching product associations.`,
      `Count of products re-mapped: ${inventory.filter(i => i.category === oldName).length}`
    );

    setEditingCategory(null);
    setEditingCategoryValue('');
    setEditingCategoryColor('');
  };

  const handleRemoveCategory = (name: string) => {
    if (currentUserRole !== 'owner') {
      alert("Access Denied: Only Owners can manage categories.");
      return;
    }
    const hasItems = inventory.some(item => item.category === name);
    const confirmMessage = hasItems 
      ? `Category "${name}" contains active stock products. Removing this category will reassign these items to "Uncategorized". \n\nAre you sure you want to proceed?` 
      : `Are you sure you want to permanently delete the category "${name}"?`;

    setConfirmModal({
      type: 'delete_category',
      title: 'Delete Category',
      message: confirmMessage,
      targetId: name,
      targetName: name
    });
  };

  // Process and convert image files to inline Base64 or mock URLs
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isAdjust: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image upload limit exceeded. Please choose a photo smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isAdjust) {
            setAdjustingItemImage(reader.result);
          } else {
            setNewProdImage(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Create Product Submit
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSku.trim()) {
      alert('Please enter a product name and SKU.');
      return;
    }

    // Check SKU collision
    if (inventory.some(i => i.sku.toLowerCase() === newProdSku.trim().toLowerCase())) {
      alert('E-SKU already exists in catalog.');
      return;
    }

    const resolvedCategory = newProdCat === 'custom' ? (customCategory.trim() || 'Accessories') : newProdCat;
    if (newProdCat === 'custom' && resolvedCategory && !categories.some(c => c.toLowerCase() === resolvedCategory.toLowerCase())) {
      saveCategories([...categories, resolvedCategory]);
    }

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newProdName.trim(),
      category: resolvedCategory,
      strainType: (resolvedCategory === 'Flower' || resolvedCategory === 'Pre-rolls') ? newProdStrain : 'None',
      thc: Number(newProdTHC),
      cbd: Number(newProdCBD),
      quantity: Number(newProdQty),
      unit: newProdUnit,
      pricePerUnit: Number(newProdPrice),
      costPerGram: Number(newProdCost),
      description: newProdDesc.trim() || 'No description provided.',
      sku: newProdSku.trim().toUpperCase(),
      imageUrl: newProdImage.trim() || undefined
    };

    onUpdateInventory([...inventory, newItem]);
    onAddActivity(
      'InventoryAdjust',
      `Registered a new shelf item: ${newItem.name} (${newItem.sku}) - [${newItem.category}] - Initial Batch: ${newItem.quantity}${newItem.unit}.`,
      `Strains: ${newItem.strainType || 'N/A'}`
    );

    // Reset Form
    setNewProdName('');
    setNewProdSku('');
    setNewProdQty('100');
    setNewProdTHC('20');
    setNewProdCBD('0.2');
    setNewProdPrice('10');
    setNewProdCost('4.0');
    setNewProdDesc('');
    setNewProdImage('');
    setCustomCategory('');
    setShowAddProduct(false);
  };

  const handleRemoveProduct = (itemId: string, itemName: string) => {
    if (currentUserRole !== 'owner') {
      alert("Access Denied: Only Owners can remove inventory items from catalog.");
      return;
    }

    setConfirmModal({
      type: 'delete_stock',
      title: 'Delete Product Listing',
      message: `Are you sure you want to permanently delete "${itemName}" from the digital stock catalogue shelving? This action cannot be undone.`,
      targetId: itemId,
      targetName: itemName
    });
  };

  // -- REGISTER NEW MEMBERS --
  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemName.trim() || !newMemPass.trim()) {
      alert('Provide a Name and passcode to register member');
      return;
    }
    if (!newMemEmail.trim()) {
      alert('Provide a valid email address to complete registration');
      return;
    }
    if (!newMemPhone.trim()) {
      alert('Provide a valid cellphone number to complete registration');
      return;
    }
    if (!newMemIdCardNum.trim()) {
      alert('Provide a valid National ID or Passport Number to complete registration');
      return;
    }

    const deservesVip = currentUserRole === 'owner' ? newMemIsVip : false;

    const newMem: Member = {
      id: `mem-${Date.now()}`,
      name: newMemName.trim(),
      email: newMemEmail.trim(),
      phone: newMemPhone.trim(),
      idCardNumber: newMemIdCardNum.trim(),
      isVip: deservesVip,
      memberNumber: `C-0420-${members.length + 1 + 10}`,
      joinedDate: new Date().toISOString().split('T')[0],
      totalSpent: 0,
      consumedGrams: 0,
      status: 'Active',
      passwordHash: newMemPass.trim(),
      lastVisit: null,
      visitsCount: 0,
      notes: newMemNotes.trim()
    };

    onUpdateMembers([...members, newMem]);
    onAddActivity(
      'MemberUpdate',
      `Registered member profile: ${newMem.name} (${newMem.memberNumber})` + (deservesVip ? ' [VIP GOLD STATUS CODES ENABLED]' : '') + '.',
      `Registered with ID: ${newMem.idCardNumber} • Phone: ${newMem.phone} • Email: ${newMem.email}`
    );

    setNewMemName('');
    setNewMemPass('');
    setNewMemEmail('');
    setNewMemPhone('');
    setNewMemIdCardNum('');
    setNewMemIsVip(false);
    setNewMemNotes('');
    setShowAddMember(false);
  };

  // -- REGISTER NEW BUDTENDERS / STAFF --
  const handleCreateBudtender = (e: React.FormEvent) => {
    e.preventDefault();
    setBtError('');

    if (!newBtName.trim() || !newBtPass.trim()) {
      setBtError('Provide a Name and Passcode to register or upgrade staff');
      return;
    }
    if (!newBtPhone.trim()) {
      setBtError('Provide a valid Phone Number to register or upgrade staff');
      return;
    }
    if (!newBtIdCardNum.trim()) {
      setBtError('Provide a valid Identity / Passport Number to register or upgrade staff');
      return;
    }

    const existingMember = members.find(m => m.name.toLowerCase() === newBtName.trim().toLowerCase());

    if (existingMember) {
      // Warm upgrade/promote existing member profile to standard budtender/trusted budtender/owner credentials
      const prefix = newBtRole === 'owner' ? 'O' : (newBtRole === 'trusted_budtender' ? 'TB' : 'B');
      const updatedMembers = members.map(m => {
        if (m.id === existingMember.id) {
          return {
            ...m,
            role: newBtRole,
            passwordHash: newBtPass.trim(),
            phone: newBtPhone.trim() || m.phone,
            idCardNumber: newBtIdCardNum.trim() || m.idCardNumber,
            status: 'Active' as const,
            notes: newBtNotes.trim() || `Profile upgraded to ${newBtRole === 'owner' ? 'Co-owner' : newBtRole === 'trusted_budtender' ? 'Trusted Budtender' : 'Standard Budtender'} security credentials.`
          };
        }
        return m;
      });

      onUpdateMembers(updatedMembers);
      onAddActivity(
        'Security',
        `Upgraded credentials for: ${existingMember.name} (${existingMember.memberNumber}) to [${newBtRole.toUpperCase()}].`,
        `Authorized by: ${currentUser} • Phone: ${newBtPhone.trim()} • ID Number: ${newBtIdCardNum.trim()}`
      );
    } else {
      // Standard registration for completely new staff member
      const prefix = newBtRole === 'owner' ? 'O' : (newBtRole === 'trusted_budtender' ? 'TB' : 'B');
      const newStaff: Member = {
        id: `mem-${Date.now()}`,
        name: newBtName.trim(),
        phone: newBtPhone.trim(),
        idCardNumber: newBtIdCardNum.trim(),
        memberNumber: `${prefix}-0420-${members.length + 1 + 10}`,
        joinedDate: new Date().toISOString().split('T')[0],
        totalSpent: 0,
        consumedGrams: 0,
        status: 'Active' as const,
        passwordHash: newBtPass.trim(),
        lastVisit: null,
        visitsCount: 0,
        role: newBtRole,
        notes: newBtNotes.trim() || `${newBtRole === 'owner' ? 'Co-owner' : newBtRole === 'trusted_budtender' ? 'Trusted Budtender' : 'Standard Budtender'} security credentials generated.`
      };

      onUpdateMembers([...members, newStaff]);
      onAddActivity(
        'Security',
        `Credentialed new staff profile: ${newStaff.name} (${newStaff.memberNumber}) as [${newBtRole.toUpperCase()}].`,
        `Authorized by: ${currentUser} • Phone: ${newStaff.phone} • ID Number: ${newStaff.idCardNumber}`
      );
    }

    setNewBtName('');
    setNewBtPass('');
    setNewBtNotes('');
    setNewBtIdCardNum('');
    setNewBtPhone('');
    setNewBtRole('budtender');
    setShowAddBudtender(false);
  };

  const handleRemoveBudtender = (id: string, name: string) => {
    setConfirmModal({
      type: 'revoke_staff',
      title: 'Revoke Staff Credentials',
      message: `Are you sure you want to revoke all credentials and permanently erase "${name}" from association staff records?`,
      targetId: id,
      targetName: name
    });
  };

  // -- MEMBER CHECK-IN --
  const handleMemberCheckIn = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // Check if membership has expired (for non-Sassy standard and VIP members)
    let isGraceCheckIn = false;
    if (member.role !== 'owner' && member.role !== 'budtender' && member.role !== 'trusted_budtender' && !(member.isVip && member.name.toLowerCase() === 'sassy')) {
      const expiresMs = member.membershipExpiresDate
        ? new Date(member.membershipExpiresDate).getTime()
        : (new Date(member.lastMembershipPaidDate || member.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000));
      if (Date.now() > expiresMs || member.status === 'Expired') {
        isGraceCheckIn = true;
      }
    }

    const isoNow = new Date().toISOString();
    const currentDateStr = isoNow.split('T')[0];
    const timeString = isoNow.replace('T', ' ').substring(0, 16);
    
    let nextVisitsCount = 1;
    const updated = members.map(m => {
      if (m.id === memberId) {
        const visited = m.visitedDates || [];
        const isAlreadyCheckedInToday = visited.includes(currentDateStr);
        const newVisited = isAlreadyCheckedInToday ? visited : [...visited, currentDateStr].sort();
        nextVisitsCount = newVisited.length;

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
    onAddActivity(
      'MemberCheckIn',
      `${member.name} checked in at Smoking Goblin reception.${isGraceCheckIn ? ' (Expired Membership Grace Allowed)' : ''} (Total visits: ${nextVisitsCount})`,
      `Activity check-in badge verified`
    );
  };

  // Delete member/membership profile (owner-only action)
  const handleDeleteMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    if (currentUserRole !== 'owner') {
      alert("Access Denied: Only Owners can delete membership profiles.");
      return;
    }

    if (member.role === 'owner') {
      alert("Security Constraint: You cannot delete an Owner membership.");
      return;
    }

    setConfirmModal({
      type: 'delete_member',
      title: 'Delete Membership Profile',
      message: `CRITICAL ACTION: Are you sure you want to permanently DELETE the membership profile for ${member.name} (${member.memberNumber})? This will wipe their records entirely.`,
      targetId: memberId,
      targetName: member.name
    });
  };

  // Renew or reduce membership term
  const handleRenewMember = (memberId: string, months: number = 1) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const staffName = currentUserRole === 'owner' ? 'Owner' : 'Budtender';

    // Calculate expiration date
    let currentExpires = new Date();
    if (member.membershipExpiresDate) {
      currentExpires = new Date(member.membershipExpiresDate);
    } else {
      const joinOrPaid = member.lastMembershipPaidDate || member.joinedDate;
      currentExpires = new Date(new Date(joinOrPaid).getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    let baseDate = new Date();
    if (months > 0) {
      // Extending: if currentExpires is in the future, extend from currentExpires, otherwise from today
      if (currentExpires.getTime() > Date.now()) {
        baseDate = currentExpires;
      } else {
        baseDate = new Date();
      }
    } else {
      // Reducing: subtract directly from currentExpires
      baseDate = currentExpires;
    }

    const newExpireDate = new Date(baseDate.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
    const newExpireStr = newExpireDate.toISOString().split('T')[0];
    
    // Determine new status dynamically
    const isNowExpired = newExpireDate.getTime() <= Date.now();
    const newStatus = isNowExpired ? ('Expired' as const) : ('Active' as const);

    const updated = members.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          status: newStatus,
          lastMembershipPaidDate: todayStr,
          membershipExpiresDate: newExpireStr
        };
      }
      return m;
    });

    onUpdateMembers(updated);

    const actionName = months > 0 ? 'Renewed/Extended' : 'Reduced';
    const amountAbs = Math.abs(months);
    onAddActivity(
      'MemberUpdate',
      `Membership ${actionName} for ${member.name} (${member.memberNumber}) by ${amountAbs} month${amountAbs > 1 ? 's' : ''}.`,
      `New expiry set to ${newExpireStr} by ${staffName}.`
    );

    // Reset inline navigation setting states
    setExtendingMemberId(null);
  };

  // Modify individual Notes
  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotesMember) return;

    const updated = members.map(m => {
      if (m.id === editingNotesMember.id) {
        return { ...m, notes: notesTemp.trim() };
      }
      return m;
    });

    onUpdateMembers(updated);
    onAddActivity(
      'MemberUpdate',
      `Updated confidential records/notes for member ${editingNotesMember.name}.`,
      `Review: ${notesTemp}`
    );

    setEditingNotesMember(null);
    setNotesTemp('');
  };

  // Filter Catalog
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase()) || 
                          item.sku.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter Members (exclude owners, trusted_budtenders, and budtenders)
  const filteredMembers = members.filter(m => 
    m.role !== 'owner' && m.role !== 'budtender' && m.role !== 'trusted_budtender' && (
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
      m.memberNumber.toLowerCase().includes(memberSearch.toLowerCase())
    )
  );

  const dynCategories = ['All', ...Array.from(new Set([
    ...categories,
    ...inventory.map(item => item.category)
  ]))];

  return (
    <div className="space-y-6 selection:bg-[#4ADE80] selection:text-[#0A0F0D]">
      
      {/* 2. SUB NAVIGATION CONTROL SWITCHERS */}
      {(() => {
        const subTabs = [];
        if (currentUserRole === 'owner') {
          subTabs.push({ id: 'stock' as const, label: 'Stock-Taking & Catalog', icon: Leaf });
          subTabs.push({ id: 'members' as const, label: 'Member Reception & Check-In', icon: Users });
          subTabs.push({ id: 'history' as const, label: 'Dispensary History Ledger', icon: ClipboardList });
          subTabs.push({ id: 'budtenders' as const, label: 'Budtender Management', icon: ShieldCheck });
          subTabs.push({ id: 'sales' as const, label: 'System Sales & Tracking', icon: Banknote });
        } else if (currentUserRole === 'trusted_budtender') {
          subTabs.push({ id: 'stock' as const, label: 'Stock-Taking & Catalog', icon: Leaf });
          subTabs.push({ id: 'members' as const, label: 'Member Reception & Check-In', icon: Users });
          subTabs.push({ id: 'history' as const, label: 'Dispensary History Ledger', icon: ClipboardList });
        } else {
          // Normal budtenders cannot see stock-taking and catalog
          subTabs.push({ id: 'members' as const, label: 'Member Reception & Check-In', icon: Users });
          subTabs.push({ id: 'history' as const, label: 'Dispensary History Ledger', icon: ClipboardList });
        }

        const gridColsClass = 
          subTabs.length === 5 
            ? 'grid-cols-5' 
            : subTabs.length === 3 
              ? 'grid-cols-3' 
              : 'grid-cols-2';

        return (
          <div className={`grid ${gridColsClass} gap-1 min-[480px]:gap-2 md:gap-3 pb-4 mb-6 border-b border-white/5`}>
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isSales = tab.id === 'sales';
              const isBudtenders = tab.id === 'budtenders';
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-1 py-2 sm:px-4 sm:py-3 text-[9px] min-[400px]:text-[10px] sm:text-xs font-semibold rounded-xl border transition-all flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 cursor-pointer text-center md:text-left ${
                    isActive
                      ? isSales
                        ? 'text-amber-400 border-amber-500/30 bg-amber-955/15 shadow-lg shadow-amber-500/5'
                        : 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#14221A] shadow-lg shadow-[#4ADE80]/5'
                      : isSales
                        ? 'text-zinc-400 border-white/5 bg-[#0C1210]/60 hover:text-amber-400 hover:bg-[#0C1210]/95 hover:border-amber-500/10'
                        : 'text-zinc-400 border-white/5 bg-[#0C1210]/60 hover:text-white hover:bg-[#0C1210]/95 hover:border-[#4ADE80]/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    isSales ? 'text-amber-500' : isBudtenders ? 'text-[#4ADE80]' : ''
                  }`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* 3. ACTIVE TAB PANEL RENDERING */}
      <div className="min-h-[400px]">
        {activeTab === 'stock' && (
          <div className="space-y-6">
            
            {/* Filter Bar Controls & Add Product trigger */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              
              <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
                <div className="flex-1 max-w-full sm:max-w-md items-center relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search strains, edibles, prepackaging formulas, SKU..."
                    className="w-full bg-[#0C1210] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                  />
                </div>

                {/* Category Pills with PC Horizontal Scroll Mechanic */}
                <div className="relative flex items-center gap-1.5 max-w-full sm:max-w-xs md:max-w-sm shrink-0 overflow-hidden">
                  {/* Scroll Left Trigger */}
                  <button
                    type="button"
                    onClick={() => scrollCategories('left')}
                    className="hidden sm:flex items-center justify-center w-7 h-7 rounded-xl bg-[#0E1512] border border-white/5 hover:border-[#4ADE80]/30 text-zinc-455 hover:text-[#4ADE80] cursor-pointer transition shrink-0 active:scale-95 shadow-sm"
                    title="Scroll Left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Main Scroll Area */}
                  <div 
                    ref={categoriesScrollRef}
                    className="flex gap-1.5 overflow-x-auto py-1.5 sm:py-0.5 font-sans custom-category-scrollbar scroll-smooth"
                  >
                    {dynCategories.map((cat) => {
                      const isAll = cat === 'All';
                      const catColor = isAll ? '#4ADE80' : getCategoryColor(cat);
                      const isActive = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className="px-3 py-2 text-xs rounded-xl transition-all cursor-pointer shrink-0 font-medium flex items-center gap-1.5 border"
                          style={isActive ? {
                            backgroundColor: `${catColor}15`,
                            color: catColor,
                            borderColor: `${catColor}50`
                          } : {
                            backgroundColor: '#0E1512',
                            borderColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'rgb(113, 113, 122)'
                          }}
                        >
                          {!isAll && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: catColor }} />
                          )}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Scroll Right Trigger */}
                  <button
                    type="button"
                    onClick={() => scrollCategories('right')}
                    className="hidden sm:flex items-center justify-center w-7 h-7 rounded-xl bg-[#0E1512] border border-white/5 hover:border-[#4ADE80]/30 text-zinc-455 hover:text-[#4ADE80] cursor-pointer transition shrink-0 active:scale-95 shadow-sm"
                    title="Scroll Right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end shrink-0">
                {/* Visual warning threshold setting */}
                <div className="flex items-center gap-1 bg-[#0C1210] border border-amber-500/15 hover:border-amber-500/25 px-2 md:px-2.5 py-2 rounded-xl text-xs transition duration-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                  <span className="text-zinc-500 text-[9px] uppercase font-mono tracking-wider font-semibold">
                    <span className="hidden sm:inline">Low Alert:</span>
                    <span className="sm:hidden">Low:</span>
                  </span>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => handleThresholdChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                    min="1"
                    max="100"
                    step="1"
                    className="w-8 md:w-10 bg-transparent text-amber-400 font-extrabold text-center focus:outline-none font-mono text-[11px] md:text-sm"
                    title="Configurable threshold for low stock alert indicator"
                  />
                  <span className="text-zinc-600 font-mono text-[9px]">g/pcs</span>
                </div>

                {currentUserRole === 'owner' && (
                  <button
                    type="button"
                    onClick={handleExportStockCSV}
                    className="px-3 py-2 bg-[#0E1512] text-zinc-400 border border-white/5 hover:text-white hover:bg-[#0C1210]/95 hover:border-[#4ADE80]/20 rounded-xl text-xs font-semibold font-mono tracking-wide flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    title="Export complete active catalog inventory and stock records to CSV format"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
                    <span>Stock CSV</span>
                  </button>
                )}

                {currentUserRole === 'owner' && (
                  <button
                    onClick={() => {
                      setShowManageCategories(!showManageCategories);
                      setShowAddProduct(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                      showManageCategories
                        ? 'bg-amber-500 text-black border-amber-500 font-bold'
                        : 'bg-[#0E1512] border-amber-500/20 text-amber-500 hover:text-amber-400 hover:border-amber-500/40'
                    }`}
                  >
                    <FolderCog className="w-3.5 h-3.5" />
                    <span>Categories</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowAddProduct(!showAddProduct);
                    setShowManageCategories(false);
                  }}
                  className="px-3 py-2 bg-[#4ADE80] text-[#0A0F0D] hover:brightness-110 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock</span>
                </button>
              </div>

            </div>

            {/* Owner Category Management Panel */}
            {currentUserRole === 'owner' && showManageCategories && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-5 bg-amber-950/10 border border-amber-500/20 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-serif italic text-amber-400 tracking-wide">Manage Stock Categories</h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">Owner Configuration Console</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManageCategories(false)}
                    className="text-xs text-zinc-500 hover:text-white cursor-pointer px-2.5 py-1 rounded-xl bg-zinc-900 border border-white/5 active:scale-95"
                  >
                    Close Panel
                  </button>
                </div>

                {/* Add Category Form */}
                <form onSubmit={handleAddCategory} className="flex gap-2.5 max-w-lg items-end bg-[#0A0F0D]/30 p-3.5 border border-white/5 rounded-xl">
                  <div className="flex-1">
                    <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 mb-1">Create New Category</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Concentrates, Accessories, Merch"
                      className="w-full bg-[#0A0F0D] border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-amber-500/30 font-sans outline-none"
                    />
                  </div>

                  {/* Dynamic Color Wheel input */}
                  <div className="flex flex-col items-center shrink-0">
                    <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 mb-1">Color Wheel</label>
                    <div 
                      className="relative w-8 h-8 rounded-full border border-white/10 flex items-center justify-center cursor-pointer transition-all active:scale-95 hover:border-white/20 overflow-hidden"
                      style={{ backgroundColor: newCategoryColor }}
                    >
                      <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        title="Pick dynamic category color from the wheel"
                      />
                      <span className="text-xs pointer-events-none drop-shadow-sm select-none" style={{ color: '#ffffff', mixBlendMode: 'difference' }}>🎨</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 text-[#0A0F0D] font-bold text-xs rounded-xl hover:bg-amber-400 transition cursor-pointer flex items-center gap-1 shrink-0 h-[34px] active:scale-[0.98] font-sans"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                </form>

                {/* Categories List */}
                <div className="space-y-2">
                  <h4 className="text-[9px] uppercase font-mono tracking-wider text-zinc-400">Active Classification Shelves ({categories.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-sans">
                    {categories.map((cat) => (
                      <div 
                        key={cat} 
                        className="flex items-center justify-between p-3 bg-[#0A0F0D] border rounded-xl transition-all duration-350"
                        style={{
                          borderColor: `${getCategoryColor(cat)}60`,
                          boxShadow: `0 0 10px ${getCategoryColor(cat)}20, inset 0 0 4px ${getCategoryColor(cat)}10`
                        }}
                      >
                        {editingCategory === cat ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={editingCategoryValue}
                              onChange={(e) => setEditingCategoryValue(e.target.value)}
                              className="bg-zinc-950 border border-amber-500/40 text-xs text-white px-2 py-1 rounded-lg w-full focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditCategorySubmit(cat);
                                if (e.key === 'Escape') setEditingCategory(null);
                              }}
                            />

                            {/* Color picker for editing */}
                            <div 
                              className="relative w-7 h-7 rounded-full border border-white/10 flex items-center justify-center cursor-pointer shrink-0 transition-all active:scale-95"
                              style={{ backgroundColor: editingCategoryColor }}
                            >
                              <input
                                type="color"
                                value={editingCategoryColor}
                                onChange={(e) => setEditingCategoryColor(e.target.value)}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                title="Change category color"
                              />
                              <span className="text-[10px] pointer-events-none select-none" style={{ color: '#ffffff', mixBlendMode: 'difference' }}>🎨</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleEditCategorySubmit(cat)}
                              className="p-1 px-2.5 bg-green-950 text-[#4ADE80] rounded-lg transition-all text-xs font-bold font-mono shrink-0"
                              title="Save Changes"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategory(null)}
                              className="p-1 px-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-all text-xs font-serif shrink-0 font-bold"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              {/* Dynamic category color badge */}
                              <span 
                                className="w-3 h-3 rounded-full border border-white/10 shrink-0" 
                                style={{ backgroundColor: getCategoryColor(cat) }}
                              />
                              <span className="text-xs text-zinc-200 font-medium">{cat}</span>
                              <span className="text-[8px] text-zinc-600 font-mono bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded">
                                {inventory.filter(i => i.category === cat).length} items
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setEditingCategoryValue(cat);
                                  setEditingCategoryColor(getCategoryColor(cat));
                                }}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                                title="Rename & Color Category"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCategory(cat)}
                                className="px-2 py-1 bg-zinc-900 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                                title="Delete Category"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Expander Drawer to Add Stocks */}
            {showAddProduct && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-6 bg-[#0C1210] border border-white/5 rounded-2xl space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">License New Inventory Shipment</h3>
                  <p className="text-xs text-zinc-500">Record imported stock batches into Smoking Goblin catalog.</p>
                </div>

                <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Strain / Product Name</label>
                    <input
                      required
                      type="text"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="e.g. Super Silver Haze"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">SKU Code</label>
                    <input
                      required
                      type="text"
                      value={newProdSku}
                      onChange={(e) => setNewProdSku(e.target.value)}
                      placeholder="e.g. FL-SSH-02"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Category</label>
                    <select
                      value={newProdCat}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setNewProdCat(cat);
                        setNewProdUnit(cat === 'Flower' ? 'g' : 'pcs');
                      }}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="custom">+ Create Custom Category...</option>
                    </select>

                    {/* Dynamic 'Add Button' Under Catalog Category */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewProdCat('custom');
                        setNewProdUnit('pcs');
                      }}
                      className="mt-1.5 text-[10px] text-zinc-500 hover:text-[#4ADE80] font-semibold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:translate-x-0.5"
                    >
                      <PlusCircle className="w-3 h-3 text-[#4ADE80]" />
                      <span>+ Custom Category</span>
                    </button>
                  </div>

                  {newProdCat === 'custom' && (
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-[#4ADE80] mb-1.5 font-bold">Custom Category Title</label>
                      <input
                        required
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="e.g. Bongs, Masks, Papers"
                        className="w-full bg-[#0A0F0D] border border-[#4ADE80]/30 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Unit of Measure</label>
                    <select
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value as any)}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30"
                    >
                      <option value="pcs">Pieces (pcs) 📦</option>
                      <option value="g">Grams (g) ⚖️</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Strain Profile Badge</label>
                    <select
                      disabled={newProdCat !== 'Flower' && newProdCat !== 'Pre-rolls'}
                      value={newProdStrain}
                      onChange={(e) => setNewProdStrain(e.target.value as any)}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30 disabled:opacity-40"
                    >
                      <option value="Sativa">Sativa 🟡</option>
                      <option value="Indica">Indica 🟣</option>
                      <option value="Hybrid">Hybrid 🟢</option>
                      <option value="None">Non-Flower/None ⚪</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">THC Concentration (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProdTHC}
                      onChange={(e) => setNewProdTHC(e.target.value)}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 text-right focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">CBD Concentration (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProdCBD}
                      onChange={(e) => setNewProdCBD(e.target.value)}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 text-right focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">Batch Weight / Count ({newProdUnit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProdQty}
                      onChange={(e) => setNewProdQty(e.target.value)}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 text-right focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">Sell Price to Customer</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 text-right focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">Cost Price / Gram (or Unit)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProdCost}
                      onChange={(e) => setNewProdCost(e.target.value)}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 text-right focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Batch Description Notes</label>
                    <input
                      type="text"
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      placeholder="Organically grown under soil matrices, notes of lavender and fuel..."
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  {/* SUPABASE-LINKED STOCK IMAGE UPLOADER */}
                  <div className="md:col-span-3 bg-[#080D0B]/80 border border-[#EAB308]/20 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="text-[10px] uppercase tracking-wider font-mono text-[#F5C71A] font-bold">
                        Image Attachment & Supabase Sync
                      </span>
                      <span className="text-[9px] text-[#4ADE80]/70 font-mono">Supabase Ready</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">
                          File Upload (Max 2MB)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, false)}
                          className="w-full text-[10px] text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-mono file:bg-[#141C19] file:text-[#4ADE80] file:cursor-pointer hover:file:brightness-110"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">
                          Or Paste Web Image URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://supabase-storage-bucket.com/..."
                          value={newProdImage}
                          onChange={(e) => setNewProdImage(e.target.value)}
                          className="w-full bg-[#0A0F0D] border border-white/5 rounded-lg py-1 px-2 text-[10px] text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#EAB308]/50 font-mono"
                        />
                      </div>
                    </div>

                    {/* Image Preview Area */}
                    {newProdImage && (
                      <div className="flex items-center gap-3 bg-[#0A0F0D] p-2 rounded-lg border border-white/5">
                        <div className="w-10 h-10 rounded overflow-hidden bg-black flex-shrink-0">
                          <img src={newProdImage} alt="Attachment template preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Active Image Hex/Data Reference</span>
                          <span className="text-[9px] text-zinc-300 font-mono truncate block" title={newProdImage}>{newProdImage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewProdImage('')}
                          className="text-[10px] text-red-400 hover:text-red-500 font-mono cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="text-[8px] text-zinc-500 bg-[#0A0F0D]/50 p-2 rounded border border-white/[0.03] font-mono space-y-1">
                      <p className="text-[#EAB308] font-bold">💡 Supabase Integrator API Code Prepared:</p>
                      <p>
                        Image state uploads convert to binary chunks matching Supabase storage policies. Sync key links: <code className="text-zinc-300 bg-white/5 px-1 py-0.5 rounded">supabase.storage.from("images").upload(sku, file)</code>
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="submit"
                      className="w-full cursor-pointer bg-[#4ADE80] text-[#0A0F0D] font-bold py-2.5 rounded-xl text-xs hover:brightness-110 transition duration-200"
                    >
                      Confirm Stock
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* main Inventory Shelf Catalog */}
            {(() => {
              const isOnlyTwoProductsDifferentCats = 
                filteredInventory.length === 2 && 
                filteredInventory[0].category !== filteredInventory[1].category;

              // Group filtered products by category
              const usedCategories: string[] = [];
              const groupedInventory: Record<string, typeof filteredInventory> = {};

              filteredInventory.forEach(item => {
                if (!groupedInventory[item.category]) {
                  groupedInventory[item.category] = [];
                  usedCategories.push(item.category);
                }
                groupedInventory[item.category].push(item);
              });

              if (filteredInventory.length === 0) {
                return (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-[#0C1210]">
                    <Leaf className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-500 text-xs text-center px-4 leading-normal font-sans">
                      No cannabis varieties match your current query or filter criteria in the storage vaults.
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-6 w-full">
                  {usedCategories.map(cat => {
                    const items = groupedInventory[cat];
                    const catColor = getCategoryColor(cat);
                    return (
                      <div 
                        key={cat} 
                        className="border rounded-2xl bg-[#090F0D]/40 p-5 space-y-5 shadow-xl w-full"
                        style={{
                          borderColor: `${catColor}77`,
                          boxShadow: `0 0 22px ${catColor}15, 0 0 2px ${catColor}40, inset 0 0 12px ${catColor}05`
                        }}
                      >
                        {/* Category Heading */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <h3 
                            className="text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-2"
                            style={{ color: catColor }}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                            {cat}
                          </h3>
                          <span className="text-[10px] text-zinc-500 font-sans">
                            {items.length} {items.length === 1 ? 'variety' : 'varieties'}
                          </span>
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((item) => {
                            // Style colors based on strain profiles
                            const getStrainColor = (st: StrainType) => {
                              switch(st) {
                                case 'Sativa': return 'from-amber-400/20 to-orange-400/10 text-orange-400 border-orange-500/20';
                                case 'Indica': return 'from-purple-500/20 to-indigo-500/10 text-purple-300 border-purple-500/20';
                                case 'Hybrid': return 'from-[#4ADE80]/20 to-[#4ADE80]/5 text-[#4ADE80] border-[#4ADE80]/30';
                                default: return 'from-zinc-800/40 to-zinc-900/10 border-white/5 text-zinc-400';
                              }
                            };

                            const capMax = item.unit === 'g' ? 500 : 100;
                            const stockFill = Math.min(100, Math.round((item.quantity / capMax) * 100));
                            const isLowStock = item.quantity < lowStockThreshold;

                            return (
                              <div
                                key={item.id}
                                className="bg-[#0C1210] rounded-2xl p-5 relative flex flex-col justify-between transition-all duration-300 shadow-sm group border"
                                style={{
                                  borderColor: isLowStock ? '#F59E0B' : `${catColor}55`,
                                  boxShadow: isLowStock
                                    ? `0 0 12px rgba(245, 158, 11, 0.2), inset 0 0 4px rgba(245, 158, 11, 0.1)`
                                    : `0 0 10px ${catColor}15, inset 0 0 4px ${catColor}05`
                                }}
                              >
                                {/* item Header */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase font-semibold">{item.sku}</span>
                                    
                                    {item.strainType !== 'None' && (
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getStrainColor(item.strainType)} font-bold font-sans`}>
                                        {item.strainType}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm font-serif italic text-white tracking-wide group-hover:text-[#4ADE80] transition-colors pt-1 flex items-center justify-between gap-1.5 min-w-0">
                                    <span className="truncate">{item.name}</span>
                                    {isLowStock && (
                                      <span 
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/35 text-amber-500 text-[8px] font-mono font-bold tracking-wider shrink-0 animate-pulse"
                                        title={`Below configurable alert threshold of ${lowStockThreshold}${item.unit}`}
                                      >
                                        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                        LOW
                                      </span>
                                    )}
                                  </h4>
                                  
                                  <span 
                                    className="text-[10px] inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-0.5 rounded-lg border font-mono"
                                    style={{
                                      color: catColor,
                                      borderColor: `${catColor}35`,
                                      backgroundColor: `${catColor}10`
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                                    {item.category}
                                  </span>
                                </div>

                                {/* Cannabinoid percentages */}
                                <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-[#0A0F0D] rounded-xl border border-white/5 text-[11px] font-mono">
                                  <div>
                                    <span className="text-zinc-600 block text-[10px] uppercase font-semibold">THC Potency</span>
                                    <p className="text-zinc-300 font-medium mt-0.5">{item.thc}%</p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-600 block text-[10px] uppercase font-semibold">CBD Potency</span>
                                    <p className="text-zinc-300 font-medium mt-0.5">{item.cbd}%</p>
                                  </div>
                                </div>

                                {/* Pricing & Profitability analysis */}
                                <div className="grid grid-cols-3 gap-2 my-3 p-2 bg-[#0A0F0D] rounded-xl border border-white/5 text-[11px] font-mono text-center">
                                  <div className="border-r border-white/5">
                                    <span className="text-zinc-500 block text-[9px] uppercase font-bold text-left pl-1">Sell Price</span>
                                    <p className="text-[#4ADE80] font-bold mt-0.5">R{item.pricePerUnit.toFixed(1)}</p>
                                  </div>
                                  <div className="border-r border-white/5">
                                    <span className="text-zinc-500 block text-[9px] uppercase font-semibold">Cost Price</span>
                                    <p className="text-red-400 font-medium mt-0.5">R{(item.costPerGram || 0).toFixed(1)}</p>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block text-[9px] uppercase font-bold text-right pr-1">Profit</span>
                                    <p className="text-amber-400 font-bold mt-0.5">R{(item.pricePerUnit - (item.costPerGram || 0)).toFixed(1)}</p>
                                  </div>
                                </div>

                                {/* Jar Stock Level Meter Bar */}
                                <div className="space-y-1.5 mb-4 font-sans">
                                  <div className="flex justify-between items-end text-xs font-mono">
                                    <span className="text-zinc-500">Jar Count Level:</span>
                                    <span className={`font-bold ${isLowStock ? 'text-amber-400 animate-pulse font-extrabold' : 'text-slate-200'}`}>
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-[#0A0F0D] rounded-full overflow-hidden p-[1px] border border-white/5">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isLowStock ? 'bg-amber-400' : 'bg-[#4ADE80]'
                                      }`}
                                      style={{ width: `${stockFill}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Budtender Shelf Actions */}
                                <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3.5 mt-2 text-xs">

                                  <div className="flex gap-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        if (adjustingItem && adjustingItem.id === item.id) {
                                          setAdjustingItem(null);
                                          setAdjustingItemImage('');
                                          setAdjustCategory('');
                                        } else {
                                          setAdjustingItem(item);
                                          setAdjustingItemImage(item.imageUrl || '');
                                          setAdjustCategory(item.category || '');
                                          setTimeout(() => {
                                            const el = document.getElementById(`adjust-section-${item.id}`);
                                            if (el) {
                                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }
                                          }, 100);
                                        }
                                      }}
                                      className="px-2 py-1.5 bg-[#0E1512] hover:bg-[#141C19] text-zinc-400 hover:text-white border border-white/5 hover:border-[#4ADE80]/30 text-[9px] font-bold rounded-lg tracking-wider uppercase transition cursor-pointer"
                                    >
                                      Adjust
                                    </button>
                                    {currentUserRole === 'owner' && (
                                      <button
                                        onClick={() => handleRemoveProduct(item.id, item.name)}
                                        title={`Permanently remove ${item.name} from stock listing`}
                                        className="p-1.5 bg-red-950/20 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white rounded-lg transition cursor-pointer flex items-center justify-center transition-all duration-150"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Integrated Physical Inventory Adjustment Audit Panel */}
                                {adjustingItem && adjustingItem.id === item.id && (
                                  <div 
                                    id={`adjust-section-${item.id}`}
                                    className="mt-4 pt-4 border-t border-white/10 space-y-3 bg-[#0A0F0D]/80 p-3 rounded-xl border border-white/5 animate-fade-in"
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-emerald-400" />
                                        <span>Stock Adjustment Audit</span>
                                      </span>
                                      <button 
                                        onClick={() => setAdjustingItem(null)} 
                                        type="button" 
                                        className="text-[10px] text-zinc-500 hover:text-white cursor-pointer transition font-sans"
                                      >
                                        Cancel
                                      </button>
                                    </div>

                                    <form onSubmit={handleSaveDetailedAdjustment} className="space-y-3">
                                      {(currentUserRole === 'owner' || currentUserRole === 'trusted_budtender') && (
                                        <div className="bg-[#141C19]/80 border border-[#4ADE80]/30 p-2.5 rounded-lg space-y-1">
                                          <div className="flex items-center justify-between">
                                            <label className="block text-[9px] uppercase font-mono tracking-wider text-[#4ADE80] font-bold">
                                              Shelf Classification Category
                                            </label>
                                            <span className="text-[7px] font-mono bg-[#4ADE80]/20 text-[#4ADE80] px-1 py-0.5 rounded uppercase font-bold">
                                              Auth Granted
                                            </span>
                                          </div>
                                          <select
                                            value={adjustCategory}
                                            onChange={(e) => setAdjustCategory(e.target.value)}
                                            className="w-full bg-[#0C1210] border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/40 font-mono font-medium"
                                          >
                                            {categories.map((cat) => (
                                              <option key={cat} value={cat}>
                                                {cat} {cat === item.category ? '(Current)' : ''}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      <div>
                                        <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">Adjustment Action</label>
                                        <select
                                          value={adjustType}
                                          onChange={(e) => setAdjustType(e.target.value as any)}
                                          className="w-full bg-[#0C1210] border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30"
                                        >
                                          <option value="add">Add Stock (+)</option>
                                          <option value="subtract">Deduct Discrepancy (-)</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">
                                          Quantity Amount ({item.unit})
                                        </label>
                                        <input
                                          required
                                          type="number"
                                          step="0.1"
                                          value={adjustAmount}
                                          onChange={(e) => setAdjustAmount(e.target.value)}
                                          className="w-full bg-[#0C1210] border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 text-right focus:outline-none focus:border-[#4ADE80]/30 font-mono"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">Audit / Physical Count Reason</label>
                                        <select
                                          value={adjustReason}
                                          onChange={(e) => setAdjustReason(e.target.value)}
                                          className="w-full bg-[#0C1210] border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30"
                                        >
                                          <option value="Shipment Restock">New Container Shipment Receipt</option>
                                          <option value="Inventory Audit Adjust">Physical Count Count / Audit Discrepancy</option>
                                          <option value="Weighing Dry Loss">Natural Dry Loss / Desiccation Weight Loss</option>
                                          <option value="Damaged Molded Spoiled">Damaged / Contaminated / Disposed Stock</option>
                                          <option value="Promo Campaign Gift">Private Promo / Quality Control Sample</option>
                                        </select>
                                      </div>

                                      {/* IMAGE UPDATER IN AUDIT SECTION */}
                                      <div className="border border-white/10 p-2.5 rounded-lg bg-black/60 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-mono text-[#F5C71A] font-bold uppercase tracking-wider">Update Stock Picture</span>
                                          <span className="text-[8px] px-1 py-0.2 bg-[#EAB308]/10 text-[#F5C71A]/90 rounded text-[7px] font-mono uppercase font-bold">Supabase Link</span>
                                        </div>

                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-[8px] uppercase font-mono tracking-wider text-zinc-500 mb-0.5">Upload file</label>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => handleImageUpload(e, true)}
                                              className="w-full text-[9px] text-zinc-400 file:mr-1.5 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[8px] file:font-mono file:bg-[#141C19] file:text-[#4ADE80] file:cursor-pointer"
                                            />
                                          </div>
                                          
                                          <div>
                                            <p className="text-[8px] font-mono text-zinc-500 uppercase mb-0.5">Or Paste Web URL</p>
                                            <input
                                              type="text"
                                              placeholder="https://..."
                                              value={adjustingItemImage}
                                              onChange={(e) => setAdjustingItemImage(e.target.value)}
                                              className="w-full bg-[#0C1210] border border-white/5 rounded py-1 px-1.5 text-[9px] text-slate-200 font-mono focus:outline-none focus:border-[#EAB308]/50"
                                            />
                                          </div>
                                        </div>

                                        {adjustingItemImage && (
                                          <div className="flex items-center gap-2 bg-[#0A0F0D] p-1.5 rounded border border-white/5">
                                            <img src={adjustingItemImage} alt="Adjust preview" className="w-10 h-10 object-cover rounded bg-black flex-shrink-0" referrerPolicy="no-referrer" />
                                            <div className="flex-1 min-w-0">
                                              <span className="text-[8px] font-mono text-zinc-300 truncate block">{adjustingItemImage}</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setAdjustingItemImage('')}
                                              className="text-[9px] text-red-400 hover:text-red-500 font-mono cursor-pointer"
                                            >
                                              Clear
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      <button
                                        type="submit"
                                        className="w-full py-2 bg-[#4ADE80] text-[#0A0F0D] font-bold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer hover:brightness-110 transition-all text-center border-none"
                                      >
                                        Confirm
                                      </button>
                                    </form>
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            
            {/* Search and Register Member Bar */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
              
              <div className="flex flex-1 max-w-md items-center relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members by Name, registered pass number..."
                  className="w-full bg-[#0C1210] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {currentUserRole === 'owner' && (
                  <button
                    onClick={() => setShowDiscountSettings(!showDiscountSettings)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 transition-all border cursor-pointer ${
                      showDiscountSettings
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/35 shadow-lg'
                        : 'bg-[#0C1210]/60 text-zinc-400 border-white/5 hover:text-white hover:bg-[#0C1210]/95 hover:border-[#4ADE80]/20'
                    }`}
                    title="Configure loyalty and active product campaigns"
                  >
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <span>Discount Settings</span>
                  </button>
                )}

                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="px-4 py-2.5 bg-[#4ADE80] text-[#0A0F0D] hover:brightness-110 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register Walk-in</span>
                </button>

                {currentUserRole === 'owner' && (
                  <button
                    type="button"
                    onClick={handleExportMembersCSV}
                    className="px-4 py-2.5 bg-[#0C1210]/60 text-zinc-400 border border-white/5 hover:text-white hover:bg-[#0C1210]/95 hover:border-[#4ADE80]/20 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Export complete active member registry list to CSV format"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#4ADE80]" />
                    <span>Download Registry CSV</span>
                  </button>
                )}
              </div>

            </div>

            {/* EXPANDABLE DISCOUNT SETTINGS PANEL */}
            {showDiscountSettings && currentUserRole === 'owner' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#0E1713] border-l-2 border-[#4ADE80] rounded-2xl space-y-6 shadow-2xl"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#4ADE80] tracking-widest font-semibold flex items-center gap-2">
                      <Percent className="w-3.5 h-3.5" />
                      <span>Loyalty campaigns and discount profiles</span>
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-1">Dispensary Reward & Promo Configurator</h3>
                    <p className="text-xs text-zinc-400 font-sans">Configure multiple automated loyalty incentives and apply catalog-wide campaign spotlights.</p>
                  </div>
                  <button
                    onClick={() => setShowDiscountSettings(false)}
                    className="p-1 rounded-lg bg-zinc-900/65 border border-white/5 hover:border-red-500/20 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Part A: Visit milestone reward */}
                  <div className="bg-[#0C1210] p-5 rounded-xl border border-white/5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between text-[#4ADE80] border-b border-white/5 pb-2">
                        <span>✦ Milestone Visit Incentives</span>
                        <span className="text-[9px] font-mono font-normal text-[#4ADE80]/70 uppercase">Multiple Active</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                        Specify multiple check-in frequency targets to reward loyal members with automatic cart reductions.
                      </p>

                      {/* Configured milestones list */}
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {visitDiscountRules.length === 0 ? (
                          <div className="p-3 text-center border border-dashed border-white/5 rounded-lg text-zinc-600 text-[10px] font-mono">
                            No Active Visit Milestones
                          </div>
                        ) : (
                          visitDiscountRules.map((rule) => (
                            <div key={rule.id} className="flex justify-between items-center bg-[#070B09] p-2.5 rounded-lg border border-white/5 text-[11px] font-mono">
                              <span className="text-zinc-300">
                                Every <strong className="text-amber-400">{rule.threshold}th unique Day</strong> log:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
                                  {rule.discountPercent}% OFF
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onChangeDiscountSettings) {
                                      const updated = visitDiscountRules.filter(r => r.id !== rule.id);
                                      onChangeDiscountSettings({ visitDiscountRules: updated });
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-350 p-1.5 rounded hover:bg-red-500/10 transition cursor-pointer"
                                  title="Remove incentive tier"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add Milestone rule form block */}
                    <div className="bg-[#080D0B] p-3 rounded-lg border border-[#4ADE80]/15 space-y-2 text-xs mt-3">
                      <span className="block text-[9px] uppercase font-mono tracking-wider text-[#4ADE80]/80 font-semibold">
                        Add Visit Milestone Reward Tier
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-mono text-zinc-400">Frequency</label>
                          <select
                            value={newRuleThreshold}
                            onChange={(e) => setNewRuleThreshold(parseInt(e.target.value, 10))}
                            className="w-full bg-[#030504] border border-white/5 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100"
                          >
                            <option value="2">2nd Visit</option>
                            <option value="3">3rd Visit</option>
                            <option value="4">4th Visit</option>
                            <option value="5">5th Visit</option>
                            <option value="6">6th Visit</option>
                            <option value="7">7th Visit</option>
                            <option value="8">8th Visit</option>
                            <option value="10">10th Visit</option>
                            <option value="12">12th Visit</option>
                            <option value="15">15th Visit</option>
                            <option value="20">20th Visit</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-mono text-zinc-400">Discount %</label>
                          <div className="flex gap-1.55 items-center">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={newRuleDiscount}
                              onChange={(e) => setNewRuleDiscount(e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#030504] border border-white/5 rounded-lg py-1 px-2 text-[11px] text-amber-400 text-center font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (onChangeDiscountSettings) {
                                  const ruleId = 'rule-' + Date.now();
                                  const ruleDisc = Number(newRuleDiscount) || 0;
                                  const updated = [
                                    ...visitDiscountRules,
                                    { id: ruleId, threshold: newRuleThreshold, discountPercent: ruleDisc }
                                  ];
                                  onChangeDiscountSettings({ visitDiscountRules: updated });
                                  onAddActivity('MemberUpdate', 'Added automatic visit loyalty threshold', `Every ${newRuleThreshold}th check-in qualifies for a ${ruleDisc}% discount.`);
                                }
                              }}
                              className="bg-[#4ADE80] hover:bg-[#34D399] text-[#0A0F0D] p-2 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 min-w-8 cursor-pointer"
                              title="Add milestone incentive"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part B: Product campaign discount */}
                  <div className="bg-[#0C1210] p-5 rounded-xl border border-white/5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between text-amber-400 border-b border-white/5 pb-2">
                        <span>✦ Product Campaign Spotlights</span>
                        <span className="text-[9px] font-mono font-normal text-amber-500 uppercase font-bold">Catalog Specials</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                        Designate specific products in the dispensary catalog for distinct discount campaigns.
                      </p>

                      {/* Configured Item Campaigns list */}
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {itemDiscountCampaigns.length === 0 ? (
                          <div className="p-3 text-center border border-dashed border-white/5 rounded-lg text-zinc-650 text-[10px] font-mono">
                            No Active Product Campaigns
                          </div>
                        ) : (
                          itemDiscountCampaigns.map((campaign) => {
                            const item = inventory.find(i => i.id === campaign.itemId);
                            return (
                              <div key={campaign.id} className="flex justify-between items-center bg-[#070B09] p-2.5 rounded-lg border border-white/5 text-[11px] font-mono">
                                <span className="text-zinc-300 truncate max-w-[140px]" title={item?.name || 'Unknown item'}>
                                  🔥 {item?.name || 'Discounted Item'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                                    {campaign.discountPercent}% OFF
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onChangeDiscountSettings) {
                                        const updated = itemDiscountCampaigns.filter(c => c.id !== campaign.id);
                                        onChangeDiscountSettings({ itemDiscountCampaigns: updated });
                                      }
                                    }}
                                    className="text-red-400 hover:text-red-350 p-1.5 rounded hover:bg-red-500/10 transition cursor-pointer"
                                    title="Remove campaign code"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Add Product Promo rule form block */}
                    <div className="bg-[#080D0B] p-3 rounded-lg border border-amber-500/15 space-y-2 text-xs mt-3">
                      <span className="block text-[9px] uppercase font-mono tracking-wider text-amber-500 font-semibold">
                        Add Product Campaign Promotion
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-mono text-zinc-400">Inventory Product</label>
                          <select
                            value={newCampaignItemId}
                            onChange={(e) => setNewCampaignItemId(e.target.value)}
                            className="w-full bg-[#030504] border border-white/5 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100 font-sans truncate"
                          >
                            <option value="">-- Choose Item --</option>
                            {inventory.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} (R{item.pricePerUnit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-mono text-zinc-400">Discount %</label>
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={newCampaignDiscount}
                              onChange={(e) => setNewCampaignDiscount(e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0))}
                              className="w-full bg-[#030504] border border-white/5 rounded-lg py-1 px-2 text-[11px] text-emerald-400 text-center font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newCampaignItemId) return;
                                const itemObj = inventory.find(i => i.id === newCampaignItemId);
                                if (onChangeDiscountSettings) {
                                  const campaignId = 'campaign-' + Date.now();
                                  const campaignDisc = Number(newCampaignDiscount) || 0;
                                  const updated = [
                                    ...itemDiscountCampaigns,
                                    { id: campaignId, itemId: newCampaignItemId, discountPercent: campaignDisc }
                                  ];
                                  onChangeDiscountSettings({ itemDiscountCampaigns: updated });
                                  onAddActivity('MemberUpdate', 'Added item-specific promo campaign', `${itemObj?.name || 'Product'} promo initialized at ${campaignDisc}% off.`);
                                  setNewCampaignItemId(''); // reset field
                                }
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-[#0A0F0D] p-2 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 min-w-8 cursor-pointer"
                              title="Add campaign item"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part C: Employee role discounts */}
                  <div className="bg-[#0C1210] p-5 rounded-xl border border-white/5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between text-[#4ADE80] border-b border-white/5 pb-2">
                        <span>✦ Employee Discounts</span>
                        <span className="text-[9px] font-mono font-normal text-emerald-400 uppercase font-bold">Staff Perks</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                        Designate default percentage discounts authorized for standard and trusted budtenders during member cart checkouts.
                      </p>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between bg-[#070B09] p-3 rounded-lg border border-white/5">
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-slate-200 font-sans">Standard Budtender</span>
                            <span className="block text-[10px] text-zinc-500 font-sans">Role base discount rate</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={employeeBudtenderDiscount === 0 ? '' : employeeBudtenderDiscount}
                              onChange={(e) => {
                                if (onChangeDiscountSettings) {
                                  const val = e.target.value;
                                  onChangeDiscountSettings({ employeeBudtenderDiscount: val === '' ? 0 : (parseInt(val, 10) || 0) });
                                }
                              }}
                              className="w-16 bg-[#030504] border border-white/5 rounded-lg py-1 px-1.5 text-xs text-amber-500 text-center font-bold font-mono focus:outline-none"
                            />
                            <span className="text-[11px] text-zinc-500 font-mono">%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-[#070B09] p-3 rounded-lg border border-white/5">
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-slate-200 font-sans">Trusted Budtender</span>
                            <span className="block text-[10px] text-zinc-500 font-sans">Superuser employee discount rate</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={employeeTrustedBudtenderDiscount === 0 ? '' : employeeTrustedBudtenderDiscount}
                              onChange={(e) => {
                                if (onChangeDiscountSettings) {
                                  const val = e.target.value;
                                  onChangeDiscountSettings({ employeeTrustedBudtenderDiscount: val === '' ? 0 : (parseInt(val, 10) || 0) });
                                }
                              }}
                              className="w-16 bg-[#030504] border border-white/5 rounded-lg py-1 px-1.5 text-xs text-amber-500 text-center font-bold font-mono focus:outline-none"
                            />
                            <span className="text-[11px] text-zinc-500 font-mono">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-500 italic leading-snug font-sans pt-2 border-t border-white/5">
                      ⚠️ Staff discounts bypass standard check-in counters and override standard rules when checking out members of staff.
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[11px]">
                  <span className="text-zinc-500 font-mono italic">
                    All adjustments are synced instantly to the membership verification tables.
                  </span>
                  <button
                    onClick={() => {
                      setShowDiscountSettings(false);
                      onAddActivity('MemberUpdate', 'Configured active discount matrix', 'Loyalty adjustments updated.');
                    }}
                    className="px-5 py-2 cursor-pointer bg-[#0A0F0D] border border-white/10 hover:border-[#4ADE80]/40 text-white rounded-xl text-xs font-mono font-medium hover:bg-zinc-800 transition active:scale-95"
                  >
                    Apply & Save Rules
                  </button>
                </div>
              </motion.div>
            )}

            {/* Expandable Register Member Form */}
            {showAddMember && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-6 bg-[#0C1210] border border-white/5 rounded-2xl space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">Issue Member Credential ID</h3>
                  <p className="text-xs text-zinc-500">Record verification protocol details for custom user passport access.</p>
                </div>

                <form onSubmit={handleAddNewMember} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">New Member Full Name</label>
                    <input
                      required
                      type="text"
                      value={newMemName}
                      onChange={(e) => setNewMemName(e.target.value)}
                      placeholder="e.g. David Stark"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">Set Passcode PIN</label>
                    <input
                      required
                      type="password"
                      value={newMemPass}
                      onChange={(e) => setNewMemPass(e.target.value)}
                      placeholder="e.g. 5555"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">Email Address</label>
                    <input
                      required
                      type="email"
                      value={newMemEmail}
                      onChange={(e) => setNewMemEmail(e.target.value)}
                      placeholder="e.g. david@domain.com"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">Cellphone Number</label>
                    <input
                      required
                      type="tel"
                      value={newMemPhone}
                      onChange={(e) => setNewMemPhone(e.target.value)}
                      placeholder="e.g. +27 82 123 4567"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">ID / Passport Number</label>
                    <input
                      required
                      type="text"
                      value={newMemIdCardNum}
                      onChange={(e) => setNewMemIdCardNum(e.target.value)}
                      placeholder="e.g. ID9908123445"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  <div className={currentUserRole === 'owner' ? "md:col-span-1" : "md:col-span-2"}>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-sans">Dispensary Consultation Notes</label>
                    <input
                      type="text"
                      value={newMemNotes}
                      onChange={(e) => setNewMemNotes(e.target.value)}
                      placeholder="Recommended therapeutic extracts..."
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-[#4ADE80]/30"
                    />
                  </div>

                  {currentUserRole === 'owner' && (
                    <div className="flex items-center gap-3 bg-[#1c180e] p-2.5 border border-[#D4AF37]/25 rounded-xl self-center h-10">
                      <input
                        type="checkbox"
                        id="newMemIsVip"
                        checked={newMemIsVip}
                        onChange={(e) => setNewMemIsVip(e.target.checked)}
                        className="w-4 h-4 accent-[#E9C46A] cursor-pointer"
                      />
                      <label htmlFor="newMemIsVip" className="text-xs font-semibold text-[#F5C71A] font-mono cursor-pointer flex items-center gap-1 select-none">
                        <span>👑 Golden VIP Status</span>
                      </label>
                    </div>
                  )}

                  <div className="md:col-span-3 flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#4ADE80] text-[#0A0F0D] hover:brightness-110 transition-all font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Register Member Account
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Note Editor Modal Drawer */}
            {editingNotesMember && (
              <div className="p-5 bg-[#0C1210] border border-[#4ADE80]/20 rounded-2xl relative shadow-lg">
                <h4 className="text-xs font-semibold text-white mb-2">Edit consultation notes for {editingNotesMember.name}</h4>
                <form onSubmit={handleSaveNotes} className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={notesTemp}
                    onChange={(e) => setNotesTemp(e.target.value)}
                    placeholder="Enter patient diagnosis, strain favorites, limits overrides..."
                    className="flex-1 bg-[#0A0F0D] border border-white/5 rounded-xl py-2 px-3.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30"
                  />
                  <button type="submit" className="px-4 py-2 bg-[#4ADE80] text-[#0A0F0D] font-bold rounded-xl text-xs cursor-pointer">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingNotesMember(null)} className="px-4 py-2 bg-[#0E1512] text-zinc-400 rounded-xl text-xs cursor-pointer border border-white/5">
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {/* Member Registry Cards List */}
            <div className="space-y-4">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/5 rounded-xl bg-[#0C1210]">
                  <p className="text-zinc-500 text-xs font-sans">No registered club members match that search query.</p>
                </div>
              ) : (
                filteredMembers.map(member => {
                  const isStaffOrOwner = member.role === 'owner' || member.role === 'budtender' || member.role === 'trusted_budtender';
                  const isMembershipVip = member.isVip;
                  const isSassy = member.name.toLowerCase() === 'sassy';

                  let renewButtonNeeded = false;
                  let statusLabel = "";
                  let statusStyle = "";
                  let subLabel = "";
                  let isExpiredMember = false;

                  if (isStaffOrOwner) {
                    statusLabel = "Lifetime Access";
                    statusStyle = "text-zinc-500 bg-zinc-950 border-white/5";
                  } else if (isMembershipVip && isSassy) {
                    statusLabel = "Lifetime VIP Paid";
                    statusStyle = "text-[#F5C71A] bg-[#221c0e] border-[#D4AF37]/30 font-bold";
                  } else {
                    const expiresMs = member.membershipExpiresDate
                      ? new Date(member.membershipExpiresDate).getTime()
                      : (new Date(member.lastMembershipPaidDate || member.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000));
                    const daysLeft = Math.ceil((expiresMs - Date.now()) / (1000 * 60 * 60 * 24));

                    if (daysLeft < 0) {
                      const overdueDays = Math.abs(daysLeft);
                      const deleteCountdown = Math.max(0, 365 - overdueDays);
                      renewButtonNeeded = true;
                      statusLabel = `Expired ${overdueDays} day${overdueDays !== 1 ? 's' : ''} ago`;
                      statusStyle = "text-red-400 bg-red-950/25 border-red-900/30 font-extrabold";
                      subLabel = `Auto-deletes in ${deleteCountdown} days if unpaid`;
                      isExpiredMember = true;
                    } else {
                      statusLabel = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
                      statusStyle = daysLeft <= 5 
                        ? "text-amber-400 bg-amber-950/20 border-amber-900/30 font-bold animate-pulse" 
                        : "text-emerald-400 bg-emerald-950/10 border-emerald-900/15 font-semibold";
                      
                      renewButtonNeeded = true;
                    }
                  }

                  const isNormalMember = !isStaffOrOwner && !isMembershipVip;

                  return (
                    <div
                      key={member.id}
                      className="p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 transition-all duration-300 border"
                      style={
                        member.isVip
                          ? {
                              backgroundColor: '#15120a',
                              borderColor: 'rgba(212, 175, 55, 0.35)',
                              boxShadow: '0 0 15px rgba(212, 175, 55, 0.08)'
                            }
                          : isNormalMember
                            ? {
                                backgroundColor: '#0C1210',
                                borderColor: 'rgba(59, 130, 246, 0.5)',
                                boxShadow: '0 0 12px rgba(59, 130, 246, 0.2), inset 0 0 4px rgba(59, 130, 246, 0.05)'
                              }
                            : {
                                backgroundColor: '#0C1210',
                                borderColor: 'rgba(255, 255, 255, 0.05)'
                              }
                      }
                    >
                      {/* Member Info */}
                      <div className="space-y-1.5 md:max-w-xs font-sans">
                        <div className="flex items-center gap-2">
                          {currentUserRole === 'owner' ? (
                            <button
                              onClick={() => onEnterMemberPage?.(member)}
                              className="text-left cursor-pointer hover:opacity-80 transition flex items-center gap-2 group/m focus:outline-none"
                              title="Owner Action: Click to enter member's page"
                            >
                              <span className={`text-base font-serif italic leading-none ${member.isVip ? 'text-[#F5C71A] font-extrabold' : 'text-slate-100'} group-hover/m:underline group-hover/m:text-[#4ADE80]`}>
                                {member.name}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono border ${
                                member.isVip
                                  ? 'bg-[#211b0e] text-[#F5C71A] border-[#D4AF37]/30'
                                  : 'bg-[#0A0F0D] text-[#4ADE80] border border-white/5'
                              }`}>
                                {member.memberNumber}
                              </span>
                              <span className="text-[10px] text-[#F5C71A] font-mono leading-none bg-[#1C180E] border border-[#D4AF37]/35 px-2 py-0.5 rounded-full font-bold select-all flex items-center gap-1 shrink-0" title="Secure member passcode PIN">
                                🔑 PIN: {member.passwordHash}
                              </span>
                              <span className="text-[10px] text-[#4ADE80] font-mono leading-none bg-[#141C19] border border-[#4ADE80]/20 px-2 py-0.5 rounded-full scale-90 opacity-0 group-hover/m:opacity-100 transition-all">
                                👁️ Enter Page
                              </span>
                            </button>
                          ) : (
                            <>
                              <span className={`text-base font-serif italic leading-none ${member.isVip ? 'text-[#F5C71A] font-extrabold' : 'text-slate-100'}`}>{member.name}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono border ${
                                member.isVip
                                  ? 'bg-[#211b0e] text-[#F5C71A] border-[#D4AF37]/30'
                                  : 'bg-[#0A0F0D] text-[#4ADE80] border border-white/5'
                              }`}>
                                {member.memberNumber}
                              </span>
                            </>
                          )}
                          {member.isVip && (
                            <span className="text-[9px] bg-gradient-to-r from-[#D4AF37] to-[#F1C40F] text-[#0A0F0D] font-extrabold px-1.5 py-0.5 rounded-full font-sans flex items-center gap-0.5 shadow-sm">
                              👑 VIP
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Joined {member.joinedDate} • Visited <strong className="text-zinc-300 font-bold">{member.visitsCount}</strong> times
                        </p>
                        {member.email && (
                          <p className="text-[10px] text-zinc-400 font-mono">
                            <span className="text-zinc-600">Email:</span> {member.email}
                          </p>
                        )}
                        {member.phone && (
                          <p className="text-[10px] text-zinc-400 font-mono">
                            <span className="text-zinc-600">Cell:</span> {member.phone}
                          </p>
                        )}
                        {member.idCardNumber && (
                          <p className="text-[10px] text-zinc-400 font-mono">
                            <span className="text-zinc-600">ID / Passport:</span> {member.idCardNumber}
                          </p>
                        )}
                        
                        {/* Membership Status Badge */}
                        <div className="pt-1 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 font-mono text-[9px]">
                            <span className="text-zinc-500">Dues Term:</span>
                            <span className={`px-2 py-0.5 rounded border text-[9px] leading-none ${statusStyle}`}>
                              {statusLabel}
                            </span>
                          </div>
                          {subLabel && (
                            <p className="text-[9px] text-red-400 font-mono leading-none flex items-center gap-1">
                              <span>⚠️</span> <span>{subLabel}</span>
                            </p>
                          )}
                        </div>

                        {member.notes ? (
                          <div className={`text-[10px] px-2.5 py-1.5 rounded-xl mt-2 leading-relaxed font-sans border ${
                            member.isVip
                              ? 'text-[#F5C71A] bg-[#221c0e] border-[#D4AF37]/20 font-medium'
                              : 'text-[#4ADE80] bg-[#141C19] border-[#4ADE80]/15'
                          }`}>
                            <strong>Care Directives:</strong> {member.notes}
                          </div>
                        ) : (
                          <p className="text-[10px] text-zinc-600 italic mt-2 bg-[#0A0F0D] p-1.5 px-2.5 rounded-xl border border-white/5">No consultation notes registered yet.</p>
                        )}
                      </div>

                      {/* Dispensation Summary */}
                      <div className="flex-1 md:max-w-md flex flex-col justify-center space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-zinc-400">Total Consumed: <strong className={member.isVip ? 'text-[#F5C71A]' : 'text-[#4ADE80]'}>{member.consumedGrams}g</strong></span>
                        </div>
                        <div className={`flex justify-between text-[9px] font-mono pt-2 border-t ${
                          member.isVip ? 'text-zinc-400 border-[#D4AF37]/15' : 'text-zinc-500 border-white/5'
                        }`}>
                          <span>{member.totalSpent > 0 ? `Total Contributions: R${member.totalSpent}` : 'No transaction record'}</span>
                          <span>Last Active Entrance: {member.lastVisit ? member.lastVisit : 'Never recorded'}</span>
                        </div>
                      </div>

                      {/* Budtender Reception Options */}
                      <div className="flex flex-col gap-2 shrink-0 md:items-end self-center w-full md:w-auto font-sans">
                        {renewButtonNeeded && (
                          <div className="relative w-full">
                            <button
                              onClick={() => {
                                if (extendingMemberId === member.id) {
                                  setExtendingMemberId(null);
                                } else {
                                  setExtendingMemberId(member.id);
                                  setExtensionMonths(1);
                                  setMembershipAction('extend');
                                }
                              }}
                              className={`w-full cursor-pointer px-3 py-2 font-mono font-bold text-[10px] rounded-xl active:scale-[0.99] transition-all flex items-center justify-center gap-1 shrink-0 ${
                                extendingMemberId === member.id
                                  ? 'bg-zinc-850 text-white border border-white/20'
                                  : 'bg-zinc-900/80 border border-white/5 hover:border-white/15 text-zinc-300 hover:bg-zinc-800'
                              }`}
                              title="Select duration and record membership status update"
                            >
                              <span>💸 Payed Membership</span>
                            </button>

                            {extendingMemberId === member.id && (
                              <div className="absolute bottom-11 right-0 z-50 w-64 p-3.5 bg-[#0A0F0D] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2.5 font-sans">
                                {currentUserRole === 'owner' && (
                                  <div className="flex bg-[#0A0F0D] rounded-xl p-0.5 border border-white/5 font-mono text-[9px] mb-1">
                                    <button
                                      type="button"
                                      onClick={() => setMembershipAction('extend')}
                                      className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                                        membershipAction === 'extend' ? 'bg-[#4ADE80] text-[#0A0F0D]' : 'text-zinc-500 hover:text-zinc-300'
                                      }`}
                                    >
                                      Extend
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setMembershipAction('reduce')}
                                      className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                                        membershipAction === 'reduce' ? 'bg-red-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                      }`}
                                    >
                                      Reduce
                                    </button>
                                  </div>
                                )}
                                <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                                  <span className="text-zinc-500">
                                    {membershipAction === 'reduce' ? 'Subtract Duration:' : 'Duration:'}
                                  </span>
                                  <span className={`font-extrabold ${membershipAction === 'reduce' ? 'text-red-400' : 'text-[#4ADE80]'}`}>
                                    {membershipAction === 'reduce' ? 'Subtract ' : ''}{extensionMonths} Month{extensionMonths > 1 ? 's' : ''}
                                    {extensionMonths === 12 ? ' (1 Year)' : ''}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="12"
                                  value={extensionMonths}
                                  onChange={(e) => setExtensionMonths(parseInt(e.target.value))}
                                  className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${
                                    membershipAction === 'reduce' ? 'bg-zinc-800 accent-red-500' : 'bg-zinc-800 accent-[#4ADE80]'
                                  }`}
                                />
                                <div className="flex justify-between text-[9px] text-zinc-500 font-mono -mt-1 scale-90 origin-left">
                                  <span>1m</span>
                                  <span>6m</span>
                                  <span>12m (1y)</span>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleRenewMember(member.id, membershipAction === 'reduce' ? -extensionMonths : extensionMonths)}
                                    className={`flex-1 py-1.5 font-bold text-[10px] rounded-lg transition-colors font-mono cursor-pointer ${
                                      membershipAction === 'reduce'
                                        ? 'bg-red-500 hover:bg-red-450 text-white'
                                        : 'bg-[#4ADE80] hover:bg-emerald-400 text-[#0A0F0D]'
                                    }`}
                                  >
                                    {membershipAction === 'reduce' ? 'Confirm Reduction' : 'Confirm Paid'}
                                  </button>
                                  <button
                                    onClick={() => setExtendingMemberId(null)}
                                    className="px-2 py-1.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 font-bold text-[10px] rounded-lg transition-colors font-mono cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 w-full sm:w-72 shrink-0">
                          <button
                            onClick={() => handleMemberCheckIn(member.id)}
                            className={`w-full cursor-pointer px-3 py-2 font-bold text-xs rounded-xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 ${
                              isExpiredMember
                                ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-600/30'
                                : 'bg-[#4ADE80] text-[#0A0F0D]'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Check-In Badge</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingNotesMember(member);
                              setNotesTemp(member.notes || '');
                            }}
                            className="w-full px-3 py-2 bg-[#0E1512] hover:bg-[#141C19] text-zinc-400 hover:text-white font-bold text-xs border border-white/5 rounded-xl transition cursor-pointer text-center truncate"
                          >
                            Notes
                          </button>

                          {currentUserRole === 'owner' && (
                            <button
                              onClick={() => onEnterMemberPage?.(member)}
                              className="w-full px-3 py-2 bg-gradient-to-r from-teal-900/40 to-[#141C19] hover:from-teal-850/50 text-[#4ADE80] font-bold text-xs border border-[#4ADE80]/30 rounded-xl transition cursor-pointer flex items-[#0A0F0D] justify-center gap-1.5 truncate"
                              title="Owner Only: View member's private portal dashboard layout"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
                              <span className="truncate">Enter Page</span>
                            </button>
                          )}

                          {currentUserRole === 'owner' && member.role !== 'owner' && (
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="w-full px-3 py-2 bg-red-950/20 hover:bg-red-900/35 text-red-400 font-bold text-xs border border-red-900/25 hover:border-red-850/40 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 truncate"
                              title="Owner Only: Permanently delete member from Smoking Goblin ledger"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Membership Tracker Moved to Bottom of Reception & Check-In */}
            <div className="pt-8 border-t border-white/5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#4ADE80] flex items-center gap-1.5 font-bold">
                    <Users className="w-4 h-4 text-amber-505" />
                    <span>Membership Tracker & Billing Settings</span>
                  </h4>
                  <p className="text-xs text-zinc-500">Monitor standard dues policy, special exemptions, and live payments tracking.</p>
                </div>
                <span className="text-[9px] font-mono bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20 px-2.5 py-1 rounded self-start md:self-auto uppercase tracking-wide">
                  Desk Billing Manager
                </span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
                {/* Standard Club Dues (Lg:col-span-5) */}
                <div className="lg:col-span-5 bg-[#0C1210] border border-white/5 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
                  
                  <span className="text-[10px] text-zinc-450 font-mono uppercase tracking-wider block border-b border-white/5 pb-2">Dues Policy</span>
                  
                  {/* Pricing Settings (Owner & Budtenders to Edit with Confirmation) */}
                  <div className="bg-[#0A0F0D] border border-white/5 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase block">Standard Club Dues</span>
                          <span className="text-xs text-zinc-400">Monthly membership cost</span>
                        </div>
                        
                        {currentUserRole === 'owner' || currentUserRole === 'budtender' || currentUserRole === 'trusted_budtender' ? (
                          <div className="flex items-center gap-1.5 bg-[#0C1210] border border-white/5 rounded-xl p-1 font-mono">
                            <button
                              type="button"
                              onClick={() => setPendingMembershipFee(prev => Math.max(0, (typeof prev === 'number' ? prev : 0) - 10))}
                              className="w-7 h-7 flex items-center justify-center bg-zinc-900 border border-white/10 hover:border-white/20 hover:bg-zinc-800 rounded-lg text-zinc-300 text-xs hover:text-white cursor-pointer transition select-none font-bold"
                              title="Decrement R10"
                            >
                              -
                            </button>
                            
                            <div className="flex items-center gap-1 px-1">
                              <span className="text-[10px] text-amber-500 font-serif font-bold">R</span>
                              <input 
                                type="number" 
                                value={pendingMembershipFee} 
                                onChange={(e) => setPendingMembershipFee(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-14 bg-transparent border-none text-center font-mono font-bold text-xs text-amber-400 focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setPendingMembershipFee(prev => (typeof prev === 'number' ? prev : 0) + 10)}
                              className="w-7 h-7 flex items-center justify-center bg-zinc-900 border border-white/10 hover:border-white/20 hover:bg-zinc-800 rounded-lg text-zinc-300 text-xs hover:text-white cursor-pointer transition select-none font-bold"
                              title="Increment R10"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="bg-zinc-950 px-3 py-1 rounded-lg border border-white/5 text-xs font-mono text-zinc-500 flex items-center gap-1.5 font-mono">
                            <ShieldCheck className="w-3 h-3 text-[#4ADE80]" />
                            <span>R {membershipFee}/mo</span>
                          </div>
                        )}
                      </div>

                      {/* Confirmation Button for Dues Rate Changes (Prevents calculation errors) */}
                      {(currentUserRole === 'owner' || currentUserRole === 'budtender' || currentUserRole === 'trusted_budtender') && pendingMembershipFee !== membershipFee && (
                        <div className="pt-1.5 border-t border-white/5 flex flex-col gap-1.5">
                          <p className="text-[9px] text-amber-450 text-amber-500/90 font-mono leading-normal">
                            ⚠ WARNING: You are altering standard membership fee rate. Please ensure total ledger calculations match current pricing policies before committing.
                          </p>
                          <div className="flex items-center gap-1.5 font-mono">
                            <button
                              type="button"
                              onClick={() => handleUpdateMembershipFee(pendingMembershipFee)}
                              className="flex-1 py-1 px-2.5 bg-amber-500 hover:bg-amber-400 text-[#0c1210] font-bold text-[10px] rounded-lg transition-all cursor-pointer text-center"
                            >
                              Confirm Rate Change
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingMembershipFee(membershipFee)}
                              className="py-1 px-2.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 text-[10px] rounded-lg transition-all cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Notice about Sassy */}
                    <div className="text-[10px] text-zinc-500 bg-amber-950/10 border border-amber-500/10 p-2.5 rounded-lg space-y-1">
                      <p className="font-semibold text-zinc-400 flex items-center gap-1">
                        ✨ <span>Special Membership Exemption</span>
                      </p>
                      <p className="leading-normal italic text-zinc-400">
                        <strong>Sassy</strong>'s customized membership fee is hardcoded to <strong>R0</strong> and strictly uneditable (Honorary club privilege).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Enrolled Members tracking list (Lg:col-span-7) */}
                <div className="lg:col-span-7 bg-[#0C1210] border border-white/5 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block border-b border-white/5 pb-2">Active Dues Registry Ledger</span>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {(() => {
                      const standardMembers = members.filter(m => m.role !== 'owner' && m.role !== 'budtender' && m.role !== 'trusted_budtender');
                      if (standardMembers.length === 0) {
                        return (
                          <div className="text-center py-6 text-zinc-700 italic text-xs font-serif">
                            No standard active members registered.
                          </div>
                        );
                      }

                      return standardMembers.map(m => {
                        const isSassy = m.name.toLowerCase() === 'sassy';
                        const relativeFee = isSassy ? 0 : membershipFee;
                        
                        // Expiration check
                        const expiresMs = m.membershipExpiresDate
                          ? new Date(m.membershipExpiresDate).getTime()
                          : (new Date(m.lastMembershipPaidDate || m.joinedDate).getTime() + (30 * 24 * 60 * 60 * 1000));
                        const daysLeft = Math.ceil((expiresMs - Date.now()) / (1000 * 60 * 60 * 24));
                        const isExpired = daysLeft < 0;

                        return (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isSassy 
                                ? 'bg-gradient-to-r from-amber-950/20 to-[#0A0F0D] border-amber-500/20 shadow-md shadow-amber-500/5' 
                                : 'bg-[#0A0F0D] border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1.5 flex-wrap sm:flex-nowrap">
                              <div className="truncate">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={`text-xs font-serif italic text-white font-bold truncate ${isSassy ? 'text-amber-400 animate-pulse' : ''}`}>
                                    {m.name} {isSassy && '🌟'}
                                  </span>
                                  <span className="text-[8px] text-zinc-500 font-mono bg-zinc-950/80 border border-white/5 px-1.5 py-0.5 rounded truncate">
                                    {m.memberNumber}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {isExpired ? (
                                    <span className="text-[8px] font-mono bg-red-950/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                                      Expired
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-mono bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                      {daysLeft} days left
                                    </span>
                                  )}
                                  <span className="text-zinc-700 text-[9px] font-mono">•</span>
                                  <span className="text-[9px] text-[#4ADE80] font-mono font-semibold">
                                    Fee: R{relativeFee}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0 font-sans mt-2 sm:mt-0">
                                {isSassy ? (
                                  <span className="text-[7.5px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2 py-1 rounded uppercase font-bold select-none block text-center font-bold">
                                    Exempt
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRenewMember(m.id, 1)}
                                    title={`Extend term by +30 days (Record payment of R${relativeFee})`}
                                    className="px-2 py-1 bg-[#4ADE80] hover:brightness-110 text-[#0A0F0D] text-[9px] font-sans font-bold rounded transition-all cursor-pointer select-none"
                                  >
                                    Renew R{relativeFee}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'history' && (() => {
          const filteredActivities = activities.filter(act => {
            if (!historyFilterDate) return true;
            try {
              const actDate = new Date(act.timestamp);
              if (isNaN(actDate.getTime())) return false;
              const year = actDate.getFullYear();
              const month = String(actDate.getMonth() + 1).padStart(2, '0');
              const day = String(actDate.getDate()).padStart(2, '0');
              const actDateStr = `${year}-${month}-${day}`;
              return actDateStr === historyFilterDate;
            } catch (e) {
              return false;
            }
          });

          return (
            <div className="space-y-4 max-w-4xl mx-auto">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 font-serif italic">Smoking Goblin Event Log</h3>
                  <p className="text-xs text-zinc-500">Legal audit log ledger containing state transactions and adjustments.</p>
                </div>
                <div className="flex items-center gap-2">
                  {currentUserRole === 'owner' && (
                    <>
                      <button
                        type="button"
                        onClick={handleExportActivityCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141C19] border border-[#4ADE80]/30 hover:border-[#4ADE80] text-[#4ADE80] hover:bg-[#4ADE80] hover:text-[#0A0F0D] text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                        title="Export complete dispensary activity logs to CSV format"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Audit CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportFullBackupJSON}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A140F] border border-amber-500/30 hover:border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-[#0A0F0D] text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                        title="Export a complete and secure copy of all system data to JSON format"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Secure JSON Backup</span>
                      </button>
                    </>
                  )}
                  <span className="text-[8px] bg-[#141C19] text-[#4ADE80] border border-[#4ADE80]/20 px-2.5 py-1 rounded-full uppercase font-mono font-bold tracking-wider">
                    Read-Only Audit Trail
                  </span>
                </div>
              </div>

              {/* Owner Query Filter Bar */}
              {currentUserRole === 'owner' && (
                <div 
                  className="bg-[#0C1210]/60 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs shadow-sm"
                  style={{
                    borderColor: '#EAB30877',
                    boxShadow: '0 0 22px rgba(234, 179, 8, 0.15), 0 0 2px rgba(234, 179, 8, 0.40), inset 0 0 12px rgba(234, 179, 8, 0.05)'
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-zinc-500 uppercase text-[9px] font-extrabold tracking-wider">Audit Operations:</span>
                    <div className="flex items-center gap-2 bg-[#050807] px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
                      <span className="text-[10px] text-[#4ADE80] font-bold flex items-center gap-1">
                        <span>📆</span> Query Date:
                      </span>
                      <input
                        type="date"
                        value={historyFilterDate}
                        onChange={(e) => setHistoryFilterDate(e.target.value)}
                        className="bg-transparent text-[11px] text-[#4ADE80] focus:outline-none cursor-pointer font-bold border-none p-0 [color-scheme:dark] select-none"
                      />
                      {historyFilterDate && (
                        <button
                          type="button"
                          onClick={() => setHistoryFilterDate('')}
                          className="text-red-400 hover:text-red-300 ml-1.5 font-extrabold cursor-pointer transition select-none hover:scale-110 active:scale-95 text-[10px]"
                          title="Clear date filter to restore standard complete ledger view"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-450 self-end sm:self-auto uppercase tracking-wider font-bold">
                    {historyFilterDate && (
                      <span>
                        Matching Records: <strong className="text-amber-400 font-bold font-mono">{filteredActivities.length}</strong> entries
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-[#0C1210] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                {filteredActivities.length === 0 ? (
                  <div className="p-10 text-center font-mono space-y-2">
                    <p className="text-zinc-500 text-xs">🔍 No activity log entries recorded for {historyFilterDate}.</p>
                    <p className="text-[10px] text-zinc-600">Consider searching for a different date or clearing the query parameters above.</p>
                  </div>
                ) : (
                  filteredActivities.slice().reverse().map((act) => {
                    
                    const getActStyle = (tp: ActivityLog['type']) => {
                      switch(tp) {
                        case 'InventoryAdjust': return { label: 'Inventory Count', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
                        case 'Dispensed': return { label: 'Dispensed', color: 'text-[#4ADE80] bg-[#4ADE80]/15 border-[#4ADE80]/20' };
                        case 'MemberCheckIn': return { label: 'Check-In', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
                        case 'MemberUpdate': return { label: 'Update Info', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
                        default: return { label: 'Security', color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
                      }
                    };

                    const style = getActStyle(act.type);

                    const staffMember = members.find(m => m.name.toLowerCase() === act.user.toLowerCase());
                    const staffRole = staffMember?.role || 'budtender';
                    const isOwner = staffRole === 'owner';
                    const isTrusted = staffRole === 'trusted_budtender';
                    const userGlowColor = isOwner 
                      ? '#D4AF37' 
                      : isTrusted 
                        ? '#A855F7' 
                        : '#3B82F6';

                    return (
                      <div key={act.id} className="p-4 hover:bg-white/[0.01] transition-all text-xs flex items-start gap-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[8px] uppercase font-bold border ${style.color} mt-0.5 shrink-0`}>
                          {style.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-300 font-medium leading-relaxed font-sans">{act.message}</p>
                          {act.details && <p className="text-[10px] text-zinc-600 mt-1 font-mono">{act.details}</p>}
                          
                          {/* Undo Action controls restricted to Owner role */}
                          {currentUserRole === 'owner' && act.undoPayload && (
                            <div className="mt-2 flex items-center gap-2">
                              {act.undoPayload.undone ? (
                                <span className="text-[9px] text-zinc-500 font-mono italic flex items-center gap-1.5 bg-[#121A16] border border-[#4ADE80]/10 px-2.5 py-0.5 rounded-lg select-none">
                                  <span className="text-[#4ADE80] font-bold">✓</span>
                                  <span>State Restored by {act.undoPayload.undoneBy || 'Owner'}</span>
                                  {act.undoPayload.undoneTimestamp && (
                                    <span className="text-[8px] opacity-60">
                                      ({new Date(act.undoPayload.undoneTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleUndoActivity(act)}
                                  className="px-2.5 py-1 bg-amber-950/20 hover:bg-amber-900/35 text-amber-400 hover:text-[#0A0F0D] hover:bg-amber-400 hover:border-amber-400 border border-amber-500/20 rounded-lg font-mono text-[9px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Owner Privilege: Revert this change and restore previous database state"
                                >
                                  <span>↩️ Undo Change</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1 text-[9px] text-zinc-500 font-mono">
                          <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span 
                            className="text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border transition-all duration-300 select-none font-mono"
                            style={{
                              borderColor: `${userGlowColor}80`,
                              boxShadow: `0 0 8px ${userGlowColor}25, inset 0 0 3px ${userGlowColor}15`,
                              color: isOwner ? '#E5C158' : isTrusted ? '#C084FC' : '#60A5FA',
                              backgroundColor: `${userGlowColor}12`
                            }}
                          >
                            By: {act.user}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })()}

        {currentUserRole === 'owner' && activeTab === 'budtenders' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 font-serif italic">Budtender Registry & Access Levels</h3>
                <p className="text-xs text-zinc-500">Add, review, and authorize staff credentials for active club dispensing.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleExportBudtendersCSV}
                  className="px-4 py-2.5 bg-[#0C1210]/60 text-zinc-400 border border-white/5 hover:text-white hover:bg-[#0C1210]/95 hover:border-[#4ADE80]/20 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Export authorized staff and budtender credentials to CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#4ADE80]" />
                  <span>Download Staff CSV</span>
                </button>
                <button
                  onClick={() => setShowAddBudtender(!showAddBudtender)}
                  className="px-4 py-2.5 bg-[#4ADE80] text-[#0A0F0D] hover:brightness-110 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enlist Budtender</span>
                </button>
              </div>
            </div>

            {/* Expander to Add Budtenders */}
            {showAddBudtender && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-6 bg-[#0C1210] border border-white/5 rounded-2xl space-y-4"
              >
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Create Staff Profile</h4>
                  <p className="text-[11px] text-zinc-500">Authorize a new security credential for active register handling.</p>
                </div>
                {btError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-400 font-sans flex items-center gap-2">
                    <span className="shrink-0 text-sm">⚠️</span>
                    <span>{btError}</span>
                  </div>
                )}
                <form onSubmit={handleCreateBudtender} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Full Name</label>
                    <input
                      required
                      type="text"
                      value={newBtName}
                      onChange={(e) => setNewBtName(e.target.value)}
                      placeholder="e.g. Liam Smith"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Staff Passcode PIN</label>
                    <input
                      required
                      type="password"
                      value={newBtPass}
                      onChange={(e) => setNewBtPass(e.target.value)}
                      placeholder="e.g. 5555"
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Assigned Role</label>
                    <select
                      value={newBtRole}
                      onChange={(e) => setNewBtRole(e.target.value as 'owner' | 'budtender' | 'trusted_budtender')}
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                    >
                      <option value="budtender">Standard Budtender 🧑‍🌾</option>
                      <option value="trusted_budtender">Trusted Budtender 🥷</option>
                      <option value="owner">Co-owner Account 👑</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">Contact Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={newBtPhone}
                      onChange={(e) => setNewBtPhone(e.target.value)}
                      placeholder="e.g. +27 82 123 4567"
                      className="w-full bg-[#0A0F0D] border border-[#ffffff0a] rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-mono">National ID / Passport Number</label>
                    <input
                      required
                      type="text"
                      value={newBtIdCardNum}
                      onChange={(e) => setNewBtIdCardNum(e.target.value)}
                      placeholder="e.g. ID950123445"
                      className="w-full bg-[#0A0F0D] border border-[#ffffff0a] rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5 font-sans">Security Notes & Cleared Stations</label>
                    <input
                      type="text"
                      value={newBtNotes}
                      onChange={(e) => setNewBtNotes(e.target.value)}
                      placeholder="e.g. Front desk reception, evening shifts, drawer authority."
                      className="w-full bg-[#0A0F0D] border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-zinc-700 focus:outline-none focus:border-[#4ADE80]/30 font-sans"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2 font-sans text-xs">
                    <button
                      type="button"
                      onClick={() => setShowAddBudtender(false)}
                      className="px-4 py-2 bg-transparent text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#4ADE80] text-[#0A0F0D] font-bold rounded-xl hover:brightness-110 transition cursor-pointer"
                    >
                      Activate Credentials
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* List of personnel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.filter(m => m.role === 'owner' || m.role === 'budtender' || m.role === 'trusted_budtender').map(staff => {
                const isPrimaryOwner = staff.name === 'Noah'; // Prevent deletion of primary seed account
                const glowStyles = staff.role === 'owner' 
                  ? {
                      borderColor: '#D4AF37',
                      boxShadow: '0 0 12px rgba(212, 175, 55, 0.25), inset 0 0 4px rgba(212, 175, 55, 0.1)'
                    } 
                  : staff.role === 'trusted_budtender'
                    ? {
                        borderColor: '#A855F7',
                        boxShadow: '0 0 12px rgba(168, 85, 247, 0.25), inset 0 0 4px rgba(168, 85, 247, 0.1)'
                      }
                    : {
                        borderColor: '#3B82F6',
                        boxShadow: '0 0 12px rgba(59, 130, 246, 0.25), inset 0 0 4px rgba(59, 130, 246, 0.1)'
                      };

                return (
                  <div 
                    key={staff.id} 
                    className="p-5 bg-[#0C1210] border rounded-2xl flex flex-col justify-between space-y-4 hover:brightness-105 transition-all duration-300 font-sans"
                    style={glowStyles}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-serif italic text-white flex items-center gap-1.5">
                            {staff.name}
                          </h4>
                          <span className="text-[9px] text-zinc-500 font-mono">{staff.memberNumber}</span>
                        </div>
                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                          staff.role === 'owner'
                            ? 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20'
                            : staff.role === 'trusted_budtender'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {staff.role === 'trusted_budtender' ? 'trusted budtender' : staff.role}
                        </span>
                      </div>
                      
                      <div className="mt-4 space-y-1.5 text-xs text-zinc-400">
                        <p className="flex justify-between">
                          <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-wider">Registered</span>
                          <span>{staff.joinedDate}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-wider">Total Visits</span>
                          <span>{staff.visitsCount} logs</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-wider">Recent Activity</span>
                          <span className="truncate max-w-[120px]">{staff.lastVisit || 'Never logged'}</span>
                        </p>
                        {staff.phone && (
                          <p className="flex justify-between">
                            <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-wider">Phone</span>
                            <span>{staff.phone}</span>
                          </p>
                        )}
                        {staff.idCardNumber && (
                          <p className="flex justify-between">
                            <span className="text-zinc-600 font-mono text-[9px] uppercase tracking-wider">ID / Passport</span>
                            <span>{staff.idCardNumber}</span>
                          </p>
                        )}
                        <p className="flex justify-between items-center bg-[#13110C] p-2 px-3 rounded-xl border border-[#D4AF37]/25 mt-1.5">
                          <span className="text-zinc-450 font-mono text-[9px] uppercase tracking-wider font-bold">Access Passcode</span>
                          <span className="font-mono text-[#F5C71A] font-extrabold text-xs">🔑 {staff.passwordHash}</span>
                        </p>
                        {staff.notes && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 text-[10px] text-zinc-500 bg-[#0A0F0D]/60 p-2 rounded-lg italic">
                            {staff.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                      {staff.name !== currentUser ? (
                        <button
                          type="button"
                          disabled={isPrimaryOwner}
                          onClick={() => handleRemoveBudtender(staff.id, staff.name)}
                          className="px-3 py-1.5 bg-red-950/20 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white rounded-xl text-[10px] uppercase tracking-wider font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 font-mono"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono italic">Active Operator (You)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {currentUserRole === 'owner' && activeTab === 'sales' && (
          <div className="space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 font-serif italic flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-amber-500" />
                  <span>System Sales Tracking</span>
                </h3>
                <p className="text-xs text-zinc-500">Monitor product demand, customer checkout contribution values, and interactive overall sales distribution.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSalesCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-500 text-amber-400 hover:text-[#0A0F0D] text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Export complete itemized checkout sales ledger to CSV format"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Sales CSV</span>
                </button>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl font-mono uppercase tracking-wider font-bold">
                  Operational Ledger Node
                </span>
              </div>
            </div>

            {/* KPI Metrics Dashboard Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div 
                className="p-4 bg-[#0C1210] border rounded-2xl space-y-2 relative overflow-hidden"
                style={{
                  borderColor: '#4ADE8077',
                  boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#4ADE80]/5 blur-xl rounded-full" />
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">Consolidated Sales Volume</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-serif italic text-white font-semibold">
                    {parseSalesData().reduce((acc, curr) => acc + curr.quantity, 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">g/units</span>
                </div>
                <div className="h-1 bg-[#0A0F0D] rounded-full overflow-hidden">
                  <div className="h-full bg-[#4ADE80]" style={{ width: '65%' }} />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">65% of monthly target checked out</span>
              </div>

              <div 
                className="p-4 bg-[#0C1210] border rounded-2xl space-y-2 relative overflow-hidden"
                style={{
                  borderColor: '#4ADE8077',
                  boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-xl rounded-full" />
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">Gross Sales Revenue</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs text-amber-500 font-bold font-serif">R</span>
                  <span className="text-2xl font-serif italic text-amber-400 font-semibold">
                    {parseSalesData().reduce((acc, curr) => acc + curr.totalRevenue, 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </span>
                </div>
                <span className="text-[10px] text-[#4ADE80] bg-[#4ADE80]/10 border border-[#4ADE80]/20 px-2 py-0.5 rounded-full inline-block font-mono">
                  +12.4% vs last week
                </span>
              </div>

              <div 
                className="p-4 bg-[#0C1210] border rounded-2xl space-y-2 relative overflow-hidden"
                style={{
                  borderColor: '#F8717177',
                  boxShadow: '0 0 22px rgba(248, 113, 113, 0.15), 0 0 2px rgba(248, 113, 113, 0.40), inset 0 0 12px rgba(248, 113, 113, 0.05)'
                }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 blur-xl rounded-full" />
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">Est. Wholesale Cost</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs text-red-500 font-bold font-serif">R</span>
                  <span className="text-2xl font-serif italic text-red-400 font-semibold">
                    {parseSalesData().reduce((acc, curr) => acc + (curr.totalCost || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">Acquisition cost of items</span>
              </div>

              <div 
                className="p-4 bg-[#0C1210] border rounded-2xl space-y-2 relative overflow-hidden"
                style={{
                  borderColor: '#4ADE8077',
                  boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full" />
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">Net Real Profit</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs text-[#4ADE80] font-bold font-serif">R</span>
                  <span className="text-2xl font-serif italic text-[#4ADE80] font-semibold">
                    {parseSalesData().reduce((acc, curr) => acc + (curr.totalProfit || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-block font-mono">
                  {(() => {
                    const gross = parseSalesData().reduce((acc, curr) => acc + curr.totalRevenue, 0);
                    const net = parseSalesData().reduce((acc, curr) => acc + (curr.totalProfit || 0), 0);
                    const margin = gross > 0 ? (net / gross * 100).toFixed(0) : '0';
                    return `${margin}% net margin`;
                  })()}
                </span>
              </div>

              <div 
                className="p-4 bg-[#0C1210] border rounded-2xl space-y-2 relative overflow-hidden"
                style={{
                  borderColor: '#EAB30877',
                  boxShadow: '0 0 22px rgba(234, 179, 8, 0.15), 0 0 2px rgba(234, 179, 8, 0.40), inset 0 0 12px rgba(234, 179, 8, 0.05)'
                }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl rounded-full" />
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">Top Selling Strain/Item</span>
                <div className="truncate text-base font-serif italic text-purple-400 font-semibold pt-1">
                  {(() => {
                    const list = parseSalesData().filter(s => s.quantity > 0);
                    return list.length > 0 ? list[0].name : "None registered";
                  })()}
                </div>
                <span className="text-[9px] text-zinc-400 font-mono block mt-1">
                  {(() => {
                    const list = parseSalesData().filter(s => s.quantity > 0);
                    return list.length > 0 ? `Vol: ${list[0].quantity} ${list[0].unit}` : "No checkouts recorded yet";
                  })()}
                </span>
              </div>
            </div>

            {/* Interactive Grid with Filters & Visualized Chart split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Main Chart Component Block (Lg:col-span-8) */}
              <div 
                className="lg:col-span-8 bg-[#0C1210] border rounded-2xl p-6 space-y-5"
                style={{
                  borderColor: '#4ADE8077',
                  boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Dispensary Stock Demand Distribution</h4>
                    <span className="text-[10px] text-zinc-500">Visualized overall sales volume mapped against peak capacity</span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSalesFilter('All');
                        setSelectedSaleProduct(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer border ${
                        salesFilter === 'All'
                          ? 'bg-amber-500 text-[#0A0F0D] border-amber-500 font-bold shadow-sm md:scale-100 hover:scale-[1.02]'
                          : 'bg-[#0A0F0D] border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      All
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSalesFilter(cat);
                          setSelectedSaleProduct(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer border ${
                          salesFilter === cat
                            ? 'bg-amber-500 text-[#0A0F0D] border-amber-500 font-bold shadow-sm md:scale-100 hover:scale-[1.02]'
                            : 'bg-[#0A0F0D] border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Better Chart Area */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center text-[9px] uppercase font-mono tracking-widest text-zinc-500 px-2">
                    <span>Dispensary Share</span>
                    <span>Stock Demand (Interactive Pie Ratio)</span>
                  </div>

                  {(() => {
                    const rawSales = parseSalesData();
                    const filteredSales = rawSales.filter(s => salesFilter === 'All' || s.category.toLowerCase() === salesFilter.toLowerCase());
                    const totalOverallQty = rawSales.reduce((acc, curr) => acc + curr.quantity, 0);

                    if (filteredSales.length === 0) {
                      return (
                        <div className="text-center py-20 text-zinc-650 font-sans italic text-xs">
                          No sales records registered under category "{salesFilter}" yet. Let budtenders checkout members.
                        </div>
                      );
                    }

                    // Prepare Pie Data with unique product-specific dynamic colors
                    const pieData = filteredSales.map(item => {
                      const fillcolor = getProductColor(item.name);
                      const renderValue = item.quantity === 0 ? 0.05 : item.quantity;
                      
                      return {
                        name: item.name,
                        value: renderValue,
                        realQuantity: item.quantity,
                        unit: item.unit,
                        totalRevenue: item.totalRevenue,
                        category: item.category,
                        color: fillcolor
                      };
                    }).sort((a, b) => b.realQuantity - a.realQuantity);

                    // Custom Tooltip component
                    const CustomPieTooltip = ({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0C1210] border border-white/10 p-3.5 rounded-xl shadow-2xl font-mono text-xs space-y-1 z-50">
                            <p className="font-serif italic text-white font-bold">{data.name}</p>
                            <div className="h-px bg-white/5 my-1" />
                            <p className="text-zinc-400 text-[10px]">Category: <span className="text-zinc-200">{data.category}</span></p>
                            <p className="text-zinc-400 text-[10px]">Dispensed: <span className="text-[#4ADE80] font-bold">{data.realQuantity} {data.unit}</span></p>
                            <p className="text-zinc-400 text-[10px]">Contributions: <span className="text-amber-400 font-bold">R{data.totalRevenue.toFixed(0)}</span></p>
                          </div>
                        );
                      }
                      return null;
                    };

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Left: Pie Chart */}
                        <div className="md:col-span-6 flex flex-col justify-center items-center h-[340px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                animationDuration={700}
                                animationEasing="ease-out"
                                onClick={(data) => {
                                  if (data && data.name) {
                                    setSelectedSaleProduct(selectedSaleProduct === data.name ? null : data.name);
                                  }
                                }}
                                className="cursor-pointer focus:outline-none"
                              >
                                {pieData.map((entry, idx) => {
                                  const isSelected = selectedSaleProduct === entry.name;
                                  return (
                                    <Cell
                                      key={`cell-${idx}`}
                                      fill={entry.color}
                                      opacity={selectedSaleProduct ? (isSelected ? 1.0 : 0.25) : 0.85}
                                      stroke="#0C1210"
                                      strokeWidth={isSelected ? 3 : 1.5}
                                      style={{
                                        outline: 'none',
                                        filter: isSelected ? 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.45))' : 'none',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                    />
                                  );
                                })}
                              </Pie>
                              {!isTouch && <Tooltip content={<CustomPieTooltip />} />}
                            </PieChart>
                          </ResponsiveContainer>

                          {/* Central Text block inside donut */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 select-none">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest text-center">
                              {selectedSaleProduct ? 'Focused Strain' : 'Total Dispensed'}
                            </span>
                            <span className="text-sm md:text-base font-serif italic text-white font-extrabold mt-0.5 max-w-[130px] truncate text-center leading-tight">
                              {selectedSaleProduct ? (
                                selectedSaleProduct
                              ) : (
                                `${totalOverallQty.toFixed(1)} g`
                              )}
                            </span>
                            {selectedSaleProduct && (
                              <div className="flex flex-col items-center mt-1 text-center">
                                {(() => {
                                  const matching = pieData.find(p => p.name === selectedSaleProduct);
                                  if (matching) {
                                    return (
                                      <>
                                        <span className="text-xs text-[#4ADE80] font-mono font-bold">
                                          {matching.realQuantity} {matching.unit}
                                        </span>
                                        <span className="text-[9px] text-amber-400 font-mono">
                                          R{matching.totalRevenue.toFixed(0)}
                                        </span>
                                      </>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Scrollable composition list */}
                        <div className="md:col-span-6 space-y-2 max-h-[340px] overflow-y-auto pr-2 scrollbar-none">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-2 px-1">
                            Composition Ledger
                          </span>
                          
                          {pieData.map(entry => {
                            const isSelected = selectedSaleProduct === entry.name;
                            const sharePercentage = totalOverallQty > 0 ? ((entry.realQuantity / totalOverallQty) * 100).toFixed(1) : '0';
                            
                            return (
                              <button
                                key={entry.name}
                                type="button"
                                onClick={() => setSelectedSaleProduct(isSelected ? null : entry.name)}
                                className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all font-sans cursor-pointer ${
                                  isSelected 
                                    ? 'bg-amber-950/20 border-amber-500/40 shadow-sm' 
                                    : 'bg-[#0A0F0D] border-white/5 hover:border-white/10 hover:bg-[#0A0F0D]/60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}40` }}
                                  />
                                  <div className="truncate">
                                    <p className="text-xs text-zinc-200 font-medium truncate">
                                      {entry.name}
                                    </p>
                                    <p className="text-[9px] text-zinc-500 font-mono uppercase">
                                      {entry.category}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 font-mono text-[10px]">
                                  <p className="text-zinc-300 font-bold">
                                    {entry.realQuantity} {entry.unit}
                                  </p>
                                  <p className="text-amber-400 text-[9px] font-semibold">
                                    {sharePercentage}% share
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Side Callout panel and insights (Lg:col-span-4) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* 2. Product Detail Insight Callout */}
                <div 
                  className="bg-[#0C1210] border rounded-2xl p-5 space-y-4"
                  style={{
                    borderColor: '#4ADE8077',
                    boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                  }}
                >
                  <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">
                    Strain-Level Deep-Dive
                  </h4>
                  
                  {selectedSaleProduct ? (
                    (() => {
                      const rawSales = parseSalesData();
                      const info = rawSales.find(s => s.name === selectedSaleProduct);
                      if (!info) return null;
                      const maxVal = rawSales.length > 0 ? Math.max(...rawSales.map(r => r.quantity)) : 5;
                      const displayMax = maxVal === 0 ? 5 : maxVal;
                      const totalOverallQty = rawSales.reduce((acc, curr) => acc + curr.quantity, 0);
                      const overallShare = totalOverallQty > 0 ? ((info.quantity / totalOverallQty) * 100).toFixed(1) : '0';

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 font-sans"
                        >
                          <div>
                            <span className="text-[9px] text-[#4ADE80] font-mono bg-[#4ADE80]/5 border border-[#4ADE80]/15 px-2 py-0.5 rounded uppercase font-bold">
                              {info.category} classification
                            </span>
                            <div className="text-lg font-serif italic text-white mt-1">
                              {info.name}
                            </div>
                          </div>

                          <div className="space-y-2 text-xs font-mono">
                            <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5 flex justify-between items-center">
                              <span className="text-zinc-500 text-[10px] uppercase">Dispensary Share</span>
                              <span className="text-zinc-200 font-bold">{overallShare}% of all weight</span>
                            </div>
                            <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5 flex justify-between items-center">
                              <span className="text-zinc-500 text-[10px] uppercase">Registered Revenue</span>
                              <span className="text-[#4ADE80] font-bold">R{info.totalRevenue.toFixed(2)}</span>
                            </div>
                            <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5 flex justify-between items-center">
                              <span className="text-zinc-500 text-[10px] uppercase">Acquisition Cost</span>
                              <span className="text-red-400 font-bold">R{(info.totalCost || 0).toFixed(2)}</span>
                            </div>
                            <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5 flex justify-between items-center">
                              <span className="text-zinc-500 text-[10px] uppercase">Net Profit</span>
                              <span className="text-amber-400 font-bold">R{(info.totalProfit || 0).toFixed(2)}</span>
                            </div>
                            <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5 flex justify-between items-center font-mono">
                              <span className="text-zinc-500 text-[10px] uppercase">Profit per Gram</span>
                              <span className="text-amber-500 font-extrabold">R{(info.quantity > 0 ? (info.totalProfit / info.quantity) : 0).toFixed(2)}/g</span>
                            </div>
                            <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5 flex justify-between items-center font-mono">
                              <span className="text-zinc-500 text-[10px] uppercase">Cumulative Checkouts</span>
                              <span className="text-zinc-200 font-bold">
                                {info.quantity} {info.unit}
                              </span>
                            </div>
                          </div>

                          <div className="bg-[#0A0F0D] p-3 rounded-lg border border-white/5 text-[10px] text-zinc-500 italic space-y-1">
                            <p>💡 <strong>Optimization Tip:</strong></p>
                            <p>
                              {info.quantity > displayMax * 0.7 
                                ? "This strain demonstrates very high velocity. Ensure back-shelf packaging batches are primed from master glass storage to satisfy immediate checkouts."
                                : "Healthy background movement. Keep standard displays active."}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })()
                  ) : (
                    <div className="py-2 text-center text-zinc-650 font-sans italic text-xs space-y-2">
                      <p>Click on any product dot track or bar in the distribution chart to inspect specific dispensary share percentages.</p>
                    </div>
                  )}
                </div>



              </div>

            </div>

            {/* New Registrations over last 30 days (Recharts Line Chart) */}
            <div 
              className="bg-[#0C1210] border rounded-2xl p-6 space-y-5"
              style={{
                borderColor: '#4ADE8077',
                boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
              }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#4ADE80] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                    <span>{admissionTimeframe === '30days' ? '30-Day' : 'All-Time'} Member Admission Trend</span>
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-sans">Daily velocity of newly registered and admitted platform members</span>
                  
                  {/* Timeframe selector controls */}
                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setAdmissionTimeframe('30days')}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                        admissionTimeframe === '30days'
                          ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
                          : 'bg-transparent text-zinc-500 border-white/5 hover:text-zinc-300'
                      }`}
                    >
                      30 Days View
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdmissionTimeframe('alltime')}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                        admissionTimeframe === 'alltime'
                          ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
                          : 'bg-transparent text-zinc-500 border-white/5 hover:text-zinc-300'
                      }`}
                    >
                      All-time History
                    </button>
                  </div>
                </div>
                
                {/* Micro KPIs */}
                <div className="flex gap-4 text-right">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">
                      Total Admissions ({admissionTimeframe === '30days' ? '30d' : 'All'})
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {getLast30DaysData().reduce((sum, item) => sum + item.count, 0)} Members
                    </span>
                  </div>
                  <div className="border-l border-white/5 pl-4">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">Peak Admissions</span>
                    <span className="text-sm font-bold text-amber-500 font-mono">
                      {Math.max(...getLast30DaysData().map(item => item.count), 0)} / day
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Chart Area */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getLast30DaysData()}
                    margin={{ top: 10, right: 30, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#ffffff30" 
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#ffffff30" 
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      allowDecimals={false}
                      dx={-5}
                    />
                    <Tooltip content={<CustomRegistrationTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#4ADE80"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0C1210', stroke: '#4ADE80', strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: '#4ADE80', stroke: '#0C1210', strokeWidth: 1.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Analytics & Revenue Composition Breakdown (Expected vs Collected) */}
            {(() => {
              const calcs = getMembershipCalculations();
              
              const expectedData = [
                { name: 'Active Members Expected', value: calcs.expectedActive },
                { name: 'Expired/Pending Renewal', value: calcs.expectedExpired }
              ].filter(item => item.value > 0);

              // Fallback if no expected data yet
              if (expectedData.length === 0) {
                expectedData.push({ name: 'No Active Accounts', value: 0.1 });
              }

              const collectedData = [
                { name: 'Membership Dues Received', value: calcs.totalMembershipRevenue },
                { name: 'Dispensary Product Sales', value: calcs.productSalesRevenue }
              ].filter(item => item.value > 0);

              // Fallback if no collected data yet
              if (collectedData.length === 0) {
                collectedData.push({ name: 'No Transactions', value: 0.1 });
              }

              const expectedColors = ['#4ADE80', '#F59E0B'];
              const collectedColors = ['#3B82F6', '#8B5CF6'];

              const CustomPieTooltip = ({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0C1210] border border-white/10 p-3 rounded-xl shadow-2xl font-mono text-xs z-50">
                      <p className="font-bold text-white mb-1 uppercase tracking-wider text-[10px] text-zinc-400">{data.name}</p>
                      <p className="text-[#4ADE80] font-sans font-bold text-sm">
                        R {data.value === 0.1 && data.name.includes('No') ? '0.00' : data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  );
                }
                return null;
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Pie: Expected Membership Revenues */}
                  <div 
                    className="bg-[#0C1210] border rounded-2xl p-6 space-y-4"
                    style={{
                      borderColor: '#4ADE8077',
                      boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                    }}
                  >
                    <div className="border-b border-white/5 pb-3">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#4ADE80] flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#4ADE80]" />
                        <span>Expected Membership Dues</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Projected revenues for active vs. expired standard members based on standard fee (R{membershipFee})</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Chart Area */}
                      <div className="w-[180px] h-[180px] shrink-0 relative flex items-center justify-center">
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wide">Expected</span>
                          <span className="text-sm font-bold text-white font-mono">
                            R{calcs.expectedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="w-full h-full relative z-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip content={<CustomPieTooltip />} />
                              <Pie
                                data={expectedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {expectedData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={expectedColors[index % expectedColors.length]} stroke="#0C1210" strokeWidth={2} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Descriptive Legend & Stats breakdown */}
                      <div className="flex-1 space-y-3.5 w-full font-mono">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center bg-zinc-950/40 p-2 rounded-lg border border-white/5">
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
                              <span>Active Dues ({calcs.activeCount})</span>
                            </span>
                            <span className="text-white font-bold">R{calcs.expectedActive}</span>
                          </div>
                          
                          <div className="flex justify-between items-center bg-zinc-950/40 p-2 rounded-lg border border-white/5">
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                              <span>Expired Dues ({calcs.expiredCount})</span>
                            </span>
                            <span className="text-amber-500 font-bold">R{calcs.expectedExpired}</span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-zinc-500 px-2 mt-1">
                            <span>Exempt VIPs (Sassy)</span>
                            <span>{calcs.sassyCount} ({calcs.sassyCount > 0 ? 'R0' : 'None'})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Pie: Collected Revenue (Memberships vs product demand sales) */}
                  <div 
                    className="bg-[#0C1210] border rounded-2xl p-6 space-y-4"
                    style={{
                      borderColor: '#4ADE8077',
                      boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                    }}
                  >
                    <div className="border-b border-white/5 pb-3">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#3B82F6] flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-[#3B82F6]" />
                        <span>Revenue Distribution Breakdown</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Ratio of actual membership dues paid against total dispensary stock sales revenue</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Chart Area */}
                      <div className="w-[180px] h-[180px] shrink-0 relative flex items-center justify-center">
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wide">Collected</span>
                          <span className="text-sm font-bold text-white font-mono">
                            R{calcs.totalCollectedOverall.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="w-full h-full relative z-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip content={<CustomPieTooltip />} />
                              <Pie
                                data={collectedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {collectedData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={collectedColors[index % collectedColors.length]} stroke="#0C1210" strokeWidth={2} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Descriptive Legend & Stats breakdown */}
                      <div className="flex-1 space-y-3.5 w-full font-mono">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center bg-zinc-950/40 p-2 rounded-lg border border-white/5">
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                              <span>Membership</span>
                            </span>
                            <span className="text-blue-400 font-bold font-mono">R{calcs.totalMembershipRevenue.toLocaleString()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center bg-zinc-950/40 p-2 rounded-lg border border-white/5">
                            <span className="flex items-center gap-1.5 text-zinc-400">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                              <span>Product Sales</span>
                            </span>
                            <span className="text-purple-400 font-bold font-mono">R{calcs.productSalesRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-zinc-500 px-2 mt-1">
                            <span>Initial vs Renewal</span>
                            <span>R{calcs.initialFeesCollected} / R{calcs.renewalsCollected}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* Owner Settings & Interactive Monthly Calendar Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Calendar Grid */}
              <div 
                className="lg:col-span-8 bg-[#0C1210] border rounded-2xl p-6 space-y-4"
                style={{
                  borderColor: '#4ADE8077',
                  boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                }}
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-300">Club Returns Calendar</h4>
                      <span className="text-[10px] text-zinc-500">Select any day to verify exact member names & checkout line-items</span>
                    </div>
                  </div>

                  {/* Calendar controller */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear(y => y - 1);
                        } else {
                          setCalendarMonth(m => m - 1);
                        }
                      }}
                      className="p-1 px-2 border border-white/5 rounded bg-[#0A0F0D] hover:bg-[#141C19] text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-serif italic font-bold text-white min-w-[110px] text-center">
                      {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(y => y + 1);
                        } else {
                          setCalendarMonth(m => m + 1);
                        }
                      }}
                      className="p-1 px-2 border border-white/5 rounded bg-[#0A0F0D] hover:bg-[#141C19] text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[9px] font-mono tracking-widest uppercase text-zinc-500 font-bold">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                    {(() => {
                      const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                      const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
                      const todayStr = new Date().toISOString().split('T')[0];

                      const cells: React.ReactNode[] = [];

                      // Empty cells for alignment
                      for (let i = 0; i < firstDayIndex; i++) {
                        cells.push(<div key={`empty-${i}`} className="bg-transparent h-16 md:h-20" />);
                      }

                      // Fill in the actual days
                      for (let d = 1; d <= daysInMonth; d++) {
                        const cellDateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const closedRecord = closedDays.find((c: any) => c.date === cellDateStr);
                        const isToday = cellDateStr === todayStr;

                        const daySales = getSalesForCalendarDay(cellDateStr);
                        const hasSales = daySales.salesList.length > 0;
                        const isSelectedInPopup = activeDayPopup?.dateStr === cellDateStr;

                        if (closedRecord) {
                          const activeSelect = selectedClosedDay?.date === cellDateStr || isSelectedInPopup;
                          cells.push(
                            <button
                              key={`day-${d}`}
                              type="button"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setSelectedClosedDay(closedRecord);
                                setActiveDayPopup({
                                  dateStr: cellDateStr,
                                  salesList: daySales.salesList,
                                  totalReturns: daySales.totalReturns,
                                  isClosed: true,
                                  rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                                });
                              }}
                              className={`w-full text-left p-1 sm:p-2 h-16 md:h-20 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                                activeSelect 
                                  ? 'bg-[#141C19] border-[#4ADE80] shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                                  : 'bg-[#141C19]/40 border-emerald-500/15 hover:border-[#4ADE80]/40 hover:bg-[#141C19]/60'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-zinc-[450] text-[9px] sm:text-[10px] md:text-sm font-mono font-bold leading-none">{d}</span>
                                <span className="w-1.2 h-1.2 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400" />
                              </div>
                              <div className="text-[#4ADE80] font-extrabold text-[8.5px] sm:text-[11px] md:text-sm font-mono leading-none tracking-tighter sm:tracking-normal truncate max-w-full">
                                R{daySales.totalReturns.toFixed(0)}
                              </div>
                              <div className="text-[6.5px] sm:text-[7.5px] md:text-[8.5px] uppercase font-mono tracking-tighter sm:tracking-wider text-emerald-400/80 leading-none truncate max-w-full">
                                {daySales.salesList.length} items
                              </div>
                            </button>
                          );
                        } else if (isToday) {
                          // Active unsaved today's session
                          cells.push(
                            <button
                              key={`day-${d}`}
                              type="button"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveDayPopup({
                                  dateStr: cellDateStr,
                                  salesList: daySales.salesList,
                                  totalReturns: daySales.totalReturns,
                                  isClosed: false,
                                  rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                                });
                              }}
                              className={`w-full text-left p-1 sm:p-2 h-16 md:h-20 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                                isSelectedInPopup
                                  ? 'bg-[#18140E] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                  : 'bg-[#0A0F0D] border-amber-500/20 hover:border-amber-500/40'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-amber-400 text-[9px] sm:text-[10px] md:text-sm font-mono font-bold leading-none">{d}</span>
                                <span className="w-1.2 h-1.2 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              </div>
                              <div className="text-amber-400 font-extrabold text-[8.5px] sm:text-[11px] md:text-sm font-mono leading-none tracking-tighter sm:tracking-normal truncate max-w-full">
                                R{daySales.totalReturns.toFixed(0)}
                              </div>
                              <div className="text-[6.5px] sm:text-[7.5px] md:text-[8px] uppercase font-mono tracking-tighter sm:tracking-widest text-[#FBBF24]/70 leading-none truncate max-w-full">
                                {daySales.salesList.length} active
                              </div>
                            </button>
                          );
                        } else {
                          // standard un-recorded day
                          cells.push(
                            <button
                              key={`day-${d}`}
                              type="button"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveDayPopup({
                                  dateStr: cellDateStr,
                                  salesList: daySales.salesList,
                                  totalReturns: daySales.totalReturns,
                                  isClosed: false,
                                  rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                                });
                              }}
                              className={`w-full text-left p-1 sm:p-2 h-16 md:h-20 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                                isSelectedInPopup
                                  ? 'bg-[#141C19]/60 border-zinc-500 shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                                  : hasSales
                                    ? 'bg-[#141C19]/30 border-amber-500/10 hover:border-amber-500/30'
                                    : 'bg-[#0A0F0D]/20 border-white/5 opacity-40 hover:opacity-100'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-zinc-[450] text-[9px] sm:text-[10px] md:text-sm font-mono leading-none">{d}</span>
                                {hasSales && <span className="w-1.2 h-1.2 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-500/60" />}
                              </div>
                              <div className="font-semibold text-[8.5px] sm:text-[10px] md:text-xs font-mono leading-none tracking-tighter sm:tracking-normal truncate max-w-full text-zinc-400">
                                {hasSales ? `R${daySales.totalReturns.toFixed(0)}` : '-'}
                              </div>
                              <div className="text-[6.5px] sm:text-[7.5px] md:text-[8px] uppercase font-mono tracking-tighter sm:tracking-wider text-zinc-500 leading-none truncate max-w-full">
                                {hasSales ? `${daySales.salesList.length} items` : 'idle'}
                              </div>
                            </button>
                          );
                        }
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Owner Auto-Scheduler & Session manual close settings */}
              <div className="lg:col-span-4 space-y-6">
                
                <div 
                  className="bg-[#0C1210] border rounded-2xl p-5 space-y-4"
                  style={{
                    borderColor: '#4ADE8077',
                    boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                  }}
                >
                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-300">
                      Work Day End Configuration
                    </h4>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Set your association's daily close-down hour. The system compiles daily totals and posts them on the calendar, then wipes active tracking counters so tomorrow starts at zero.
                  </p>

                  <div className="space-y-4 font-sans pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2">
                        Automatic Daily Close Time
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={dailyResetTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDailyResetTime(val);
                            localStorage.setItem('greenhouse_daily_reset_time', val);
                          }}
                          className="bg-[#0A0F0D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/40 w-full font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onAddActivity('Security', `Daily ledger close-time updated to '${dailyResetTime}' by Owner.`, `Auto-scheduled ledger reset updated.`);
                            alert(`Auto-reset daily close point scheduled successfully for ${dailyResetTime}!`);
                          }}
                          className="bg-amber-500 text-[#0A0F0D] px-3.5 py-2 font-bold text-xs rounded-xl hover:brightness-110 cursor-pointer transition whitespace-nowrap"
                        >
                          Day End
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4">
                      <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">
                        Force Day End Manual Reset
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          handleCloseAndResetDay(todayStr);
                          alert("Daily totals compiled! Active sales dashboard has reset.");
                        }}
                        className="w-full bg-[#141C19] border border-emerald-500/30 hover:border-[#4ADE80]/50 text-[#4ADE80] hover:text-white font-mono text-[10px] font-bold tracking-wider uppercase py-2.5 rounded-xl transition cursor-pointer text-center"
                      >
                        ⚡ Day End
                      </button>
                    </div>

                    <p className="text-[9px] text-zinc-650 font-mono">
                      * Scheduled checks run on dev server clocks. Manual resets bypass timer locks completely.
                    </p>
                  </div>
                </div>

                {/* 3. Overall Dispensary Health & Velocity Metrics */}
                {(() => {
                  const filteredRecords = getFilteredSalesRecords(summaryPeriod);
                  const totalQty = filteredRecords.reduce((acc, curr) => acc + curr.quantity, 0);
                  const totalRevenue = filteredRecords.reduce((acc, curr) => acc + curr.revenue, 0);
                  const peakProdName = (() => {
                    const map: { [key: string]: number } = {};
                    filteredRecords.forEach(r => {
                      if (r.quantity > 0) {
                        map[r.itemName] = (map[r.itemName] || 0) + r.quantity;
                      }
                    });
                    let peakName = 'None registered';
                    let maxQty = 0;
                    Object.entries(map).forEach(([name, qty]) => {
                      if (qty > maxQty) {
                        maxQty = qty;
                        peakName = name;
                      }
                    });
                    return peakName;
                  })();

                  const allRecords = getAllSalesRecords();
                  const averageDailyIncome = (() => {
                    const dailyTotals: { [dateStr: string]: number } = {};
                    allRecords.forEach(s => {
                      const dStr = s.date;
                      dailyTotals[dStr] = (dailyTotals[dStr] || 0) + s.revenue;
                    });
                    const uniqueDays = Object.keys(dailyTotals).length;
                    if (uniqueDays === 0) return 0;
                    const grandTotal = Object.values(dailyTotals).reduce((sum, rev) => sum + rev, 0);
                    return grandTotal / uniqueDays;
                  })();

                  return (
                    <div 
                      className="bg-[#0C1210] border rounded-2xl p-5 space-y-4"
                      style={{
                        borderColor: '#4ADE8077',
                        boxShadow: '0 0 22px rgba(74, 222, 128, 0.15), 0 0 2px rgba(74, 222, 128, 0.40), inset 0 0 12px rgba(74, 222, 128, 0.05)'
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-[#4ADE80] flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-[#4ADE80]" />
                          <span>Club Ledger Summary</span>
                        </h4>
                        
                        {/* Period Tabs Selector */}
                        <div className="flex bg-black/40 border border-white/5 rounded-lg p-0.5 font-mono text-[9px] shrink-0 self-start sm:self-auto">
                          {(['all', 'monthly', 'weekly', 'daily'] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setSummaryPeriod(p)}
                              className={`px-2 py-0.5 rounded transition uppercase tracking-wider font-bold cursor-pointer ${
                                summaryPeriod === p 
                                  ? 'bg-[#141C19] border border-emerald-500/20 text-emerald-400 font-extrabold' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {p === 'all' ? 'All' : p === 'monthly' ? 'Month' : p === 'weekly' ? 'Week' : 'Day'}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-4 text-xs">
                        <div className="space-y-3 font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Aggregate Dispensed Weights</span>
                            <span className="text-white font-bold font-sans">
                              {totalQty.toFixed(1)} g
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Gross Club Contributions</span>
                            <span className="text-emerald-400 font-semibold font-sans">
                              R {totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Peak Demand Champion</span>
                            <span className="text-amber-400 font-serif italic font-sans truncate max-w-[150px]">
                              {peakProdName}
                            </span>
                          </div>
                        </div>

                        {/* Average Daily Income Card/Box */}
                        <div className="bg-[#141C19]/30 border border-emerald-500/10 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono block mb-0.5">Average Daily Income</span>
                            <span className="text-zinc-650 font-mono text-[8px]">Compiled over days with sales activity</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-extrabold text-sm font-mono block leading-none">
                              R {averageDailyIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 text-[9px] text-zinc-500 leading-normal block">
                          ⚠️ Cumulative metrics represent checked-out sales in this host session. All dispensations are updated in real-time.
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>

            {/* Calendar receipts detailed list block */}
            {selectedClosedDay && (
              <div 
                id="calendar-details-section"
                className="bg-[#0C1210] border border-white/5 rounded-2xl p-6 space-y-4"
              >
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div>
                    <span className="text-[9px] text-[#4ADE80] font-mono bg-[#4ADE80]/5 border border-[#4ADE80]/15 px-2 py-0.5 rounded uppercase font-bold">
                      Historic Ledger Record
                    </span>
                    <h4 className="text-base font-serif italic text-white mt-1">
                      Trading Receipts for {selectedClosedDay.date}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentUserRole === 'owner' && (
                      <button
                        type="button"
                        onClick={() => {
                          const headers = [
                            'Transaction ID',
                            'Buyer (Member)',
                            'Product Name',
                            'Quantity',
                            'Unit',
                            'Contribution Value (ZAR)',
                            'Recorded Timestamp'
                          ];
                          const rows = selectedClosedDay.salesList.map((item: any) => [
                            item.id || '',
                            item.buyerName || '',
                            item.itemName || '',
                            String(item.quantity || 0),
                            item.unit || '',
                            String(item.revenue || 0),
                            item.timestamp || ''
                          ]);
                          downloadCSV(`greenhouse_sales_${selectedClosedDay.date}.csv`, headers, rows);
                          onAddActivity('Security', `Owner ${currentUser} exported single-day Sales Receipts for ${selectedClosedDay.date} to CSV.`, `Extracted ${selectedClosedDay.salesList.length} rows.`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-500 text-amber-400 hover:text-[#0A0F0D] text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer active:scale-95"
                        title="Download today's items as a spreadsheet CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Day CSV</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedClosedDay(null)}
                      className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 bg-[#0A0F0D] rounded-lg border border-white/5 cursor-pointer font-sans transition-colors"
                    >
                      Clear Focus
                    </button>
                  </div>
                </div>

                {selectedClosedDay.salesList && selectedClosedDay.salesList.length > 0 ? (
                  <div className="space-y-4">
                    
                    {/* Header stats row inside details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5">
                        <span className="block text-[9px] font-mono text-zinc-500 uppercase">Calculated Returns</span>
                        <span className="text-base font-bold text-[#4ADE80] font-mono">R{selectedClosedDay.totalReturns.toFixed(2)}</span>
                      </div>
                      <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5">
                        <span className="block text-[9px] font-mono text-zinc-500 uppercase">Checkout Volume</span>
                        <span className="text-base font-bold text-amber-400 font-mono">{selectedClosedDay.salesList.length} Items</span>
                      </div>
                      <div className="p-3 bg-[#0A0F0D] rounded-xl border border-white/5">
                        <span className="block text-[9px] font-mono text-zinc-500 uppercase">Average Ticket Revenue</span>
                        <span className="text-base font-semibold text-purple-400 font-mono">
                          R{(selectedClosedDay.totalReturns / selectedClosedDay.salesList.length).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Receipts list */}
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0A0F0D]/60 max-h-[350px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#0A0F0D] border-b border-white/5 text-[10px] text-zinc-500 font-mono uppercase">
                            <th className="p-3">Buyer Name</th>
                            <th className="p-3">Strain / Item</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Returns</th>
                            <th className="p-3 text-center">Receipt Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                          {selectedClosedDay.salesList.map((item: any, idx: number) => (
                            <tr key={item.id || idx} className="hover:bg-white/[0.02]">
                              <td className="p-3 text-slate-200 font-sans font-medium">{item.buyerName}</td>
                              <td className="p-3 text-zinc-400">
                                <span className="text-zinc-200 font-sans font-semibold">{item.itemName}</span>
                              </td>
                              <td className="p-3 text-right text-slate-200">{item.quantity} {item.unit}</td>
                              <td className="p-3 text-right text-emerald-400 font-bold">R{item.revenue.toFixed(2)}</td>
                              <td className="p-3 text-center text-zinc-500 text-[10px]">
                                {new Date(item.timestamp).toLocaleTimeString(undefined, {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                ) : (
                  <div className="py-6 text-center text-zinc-550 italic text-xs">
                    No individual sales transaction items captured for this day. Only aggregated returns recorded.
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Custom Confirmation Popup Overlay */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0C1210] border border-red-500/30 rounded-2xl max-w-sm w-full p-5 text-left shadow-2xl relative animate-none font-sans overflow-hidden">
            {/* Ambient Red glow decoration background */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-red-500/5 blur-2xl rounded-full" />

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-red-950/40 border border-red-500/20 rounded-xl text-red-400 shrink-0">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-serif italic text-white tracking-wide">
                  {confirmModal.title}
                </h3>
                <p className="text-zinc-500 font-mono text-[8px] uppercase tracking-wider block font-bold">
                  Confirm Permanent Action
                </p>
              </div>
            </div>

            <p className="mt-3.5 text-xs text-zinc-300 leading-relaxed font-sans">
              {confirmModal.message}
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-end font-mono">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-full sm:w-auto px-4 py-1.5 bg-zinc-900 border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white text-[10px] rounded-xl transition-all cursor-pointer font-bold active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className="w-full sm:w-auto px-4 py-1.5 bg-red-500 hover:bg-gradient-to-r hover:from-red-500 hover:to-orange-500 text-white text-[10px] rounded-xl transition-all cursor-pointer font-bold active:scale-[0.98] flex items-center justify-center gap-1 shadow-lg shadow-red-500/10"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Daily Calendar Popover (Centered Dialog) */}
      {activeDayPopup && (() => {
        return (
          <>
            <div 
              className="fixed inset-0 z-[9990] bg-black/75 backdrop-blur-sm cursor-pointer" 
              onClick={() => setActiveDayPopup(null)} 
            />
            
            <div 
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[#0C1210] border border-white/10 rounded-2xl p-6 shadow-2xl font-sans text-left z-[9991] flex flex-col space-y-4 max-h-[450px] overflow-hidden animate-none"
            >
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-sm font-sans font-bold text-zinc-100">
                    {(() => {
                      const [year, month, day] = activeDayPopup.dateStr.split('-');
                      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return d.toLocaleDateString(undefined, {
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      });
                    })()}
                  </h4>
                  <span className={`text-[9px] uppercase font-mono tracking-widest leading-none mt-1.5 inline-block font-bold ${
                    activeDayPopup.isClosed 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                  }`}>
                    {activeDayPopup.isClosed ? '● Closed Ledger' : '● Operational (Unclosed)'}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveDayPopup(null)}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#090F0D] border border-white/5 rounded-xl p-3 font-mono text-xs">
                <div>
                  <span className="text-[8px] text-zinc-550 uppercase block tracking-wider mb-0.5 leading-tight">Total Returns</span>
                  <span className={`font-bold text-sm ${activeDayPopup.isClosed ? 'text-emerald-400' : 'text-amber-450'}`}>
                    R {activeDayPopup.totalReturns.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-zinc-550 uppercase block tracking-wider mb-0.5 leading-tight">Total Checkouts</span>
                  <span className="font-bold text-zinc-350 text-sm">
                    {activeDayPopup.salesList.length} items
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1 divide-y divide-white/5">
                {activeDayPopup.salesList.length > 0 ? (
                  activeDayPopup.salesList.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center py-2 text-xs first:pt-0">
                      <div className="flex flex-col min-w-0 flex-1 mr-3">
                        <span className="text-zinc-200 font-semibold truncate font-sans text-[12px]">{item.buyerName}</span>
                        <span className="text-zinc-500 font-mono text-[9px] truncate mt-0.5">
                          {item.itemName} • {item.quantity}{item.unit}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-emerald-400 font-bold block font-mono text-xs">R{item.revenue.toFixed(2)}</span>
                        <span className="text-[8px] text-zinc-550 font-mono block">
                          {new Date(item.timestamp).toLocaleTimeString(undefined, {
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-zinc-550 italic text-xs">
                    No individual sales transaction items captured for this day. Only aggregated returns recorded.
                  </div>
                )}
              </div>

              {!activeDayPopup.isClosed && activeDayPopup.totalReturns > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        type: 'close_day',
                        title: 'Post & Close Day',
                        message: `Are you sure you want to post day and close ledger for ${activeDayPopup.dateStr}?`,
                        targetId: activeDayPopup.dateStr,
                        targetName: activeDayPopup.dateStr
                      });
                    }}
                    className="w-full bg-[#141C19] border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400 hover:text-white font-mono text-[10px] font-bold tracking-wider uppercase py-2 rounded-xl transition text-center cursor-pointer"
                  >
                    ⚡ Post & Close Day
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

    </div>
  );
}
