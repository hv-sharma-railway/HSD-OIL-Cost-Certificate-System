import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Search,
  Settings,
  ChevronRight,
  Calendar,
  Building2,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdfjs-dist
const PDF_WORKER_URL = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

// PDF Canvas Renderer Component
const PdfCanvasRenderer = ({ pdfData }: { pdfData: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const renderPdf = async () => {
      if (!pdfData) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('Starting PDF render, data length:', pdfData.length);
        
        // Convert base64 to Uint8Array
        let bytes: Uint8Array;
        try {
          const base64Content = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
          const binaryString = atob(base64Content);
          bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
        } catch (e) {
          console.error('Base64 decoding failed:', e);
          throw new Error('Invalid PDF data format');
        }

        const loadingTask = pdfjsLib.getDocument({ 
          data: bytes
        });
        
        const pdf = await loadingTask.promise;
        
        if (!isMounted) return;
        console.log('PDF loaded, pages:', pdf.numPages);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = ''; // Clear previous renders
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const pageContainer = document.createElement('div');
            pageContainer.className = "relative mb-6 group";
            
            const pageLabel = document.createElement('div');
            pageLabel.className = "absolute -top-3 left-4 bg-[#0052CC] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 opacity-80 group-hover:opacity-100 transition-opacity";
            pageLabel.textContent = `Page ${pageNum}`;
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Could not get canvas context');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.className = "w-full rounded-lg shadow-sm border border-gray-200 bg-white";
            
            pageContainer.appendChild(pageLabel);
            pageContainer.appendChild(canvas);
            containerRef.current.appendChild(pageContainer);
            
            await page.render({
              canvasContext: context,
              viewport: viewport,
              // @ts-ignore
              canvas: canvas
            }).promise;
            
            console.log(`Rendered page ${pageNum}`);
          }
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Detailed PDF Render Error:', err);
        if (isMounted) {
          setError(`Failed to render PDF: ${err.message || 'Unknown error'}. Please try opening in a new tab.`);
          setLoading(false);
        }
      }
    };

    renderPdf();
    return () => { isMounted = false; };
  }, [pdfData, retryCount]);

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-100 p-4 rounded-xl border border-[#E5E7EB]">
      {loading && (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-8 h-8 border-4 border-[#0052CC]/30 border-t-[#0052CC] rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Rendering PDF pages...</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-sm font-medium text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setRetryCount(prev => prev + 1);
            }}
            className="bg-[#0052CC] text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#0747A6] transition-all"
          >
            Retry Rendering
          </button>
        </div>
      )}
      <div ref={containerRef} className={loading || error ? "hidden" : "block"} />
    </div>
  );
};

import { cn } from './utils';
import { 
  MONTHS, 
  YEARS, 
  INITIAL_SHED_MASTER, 
  INITIAL_PRICE_MASTER, 
  ShedMasterEntry, 
  PriceMasterEntry, 
  PriceData,
  SelectedShed,
  GOODS_ALLOCATION,
  COACH_ALLOCATION
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'prices' | 'sheds'>('generate');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return MONTHS[d.getMonth()];
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.getFullYear().toString();
  });
  const [priceMaster, setPriceMaster] = useState<PriceMasterEntry[]>([]);
  const [shedMaster, setShedMaster] = useState<ShedMasterEntry[]>([]);
  const [selectedSupplyingShed, setSelectedSupplyingShed] = useState('HXP');
  const [selectedSheds, setSelectedSheds] = useState<SelectedShed[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingPriceId, setDeletingPriceId] = useState<string | null>(null);
  const [masterVoucherPdf, setMasterVoucherPdf] = useState<string | null>(null);
  const [masterVoucherPdfName, setMasterVoucherPdfName] = useState<string | null>(null);
  const [masterVoucherPdfUrl, setMasterVoucherPdfUrl] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // DSC Digital Signature state
  const [dscEnabled, setDscEnabled] = useState(false);
  const [dscPort, setDscPort] = useState('55101');
  const [dscProtocol, setDscProtocol] = useState<'https' | 'http'>('https');
  const [dscServiceType, setDscServiceType] = useState<'auto' | 'embridge' | 'dscsigner'>('auto');
  const [dscStatus, setDscStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');
  const [dscStatusMessage, setDscStatusMessage] = useState('');
  const [signingProgress, setSigningProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [lastSigningReport, setLastSigningReport] = useState<{ signed: number; failed: number; skipped: number } | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Cleanup Object URL
  useEffect(() => {
    return () => {
      if (masterVoucherPdfUrl) {
        URL.revokeObjectURL(masterVoucherPdfUrl);
      }
    };
  }, [masterVoucherPdfUrl]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shedsRes, pricesRes] = await Promise.all([
          fetch('/api/sheds'),
          fetch('/api/prices')
        ]);
        const sheds = await shedsRes.json();
        const prices = await pricesRes.json();
        
        setShedMaster(sheds.length > 0 ? sheds : INITIAL_SHED_MASTER);
        setPriceMaster(prices.length > 0 ? prices : INITIAL_PRICE_MASTER);

        // If initial data was empty, populate DB with defaults
        if (sheds.length === 0) {
          for (const s of INITIAL_SHED_MASTER) {
            await fetch('/api/sheds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(s)
            });
          }
        }
        if (prices.length === 0) {
          for (const p of INITIAL_PRICE_MASTER) {
            await fetch('/api/prices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p)
            });
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const [newShed, setNewShed] = useState<Partial<ShedMasterEntry>>({
    railway: 'WR'
  });

  const filteredSheds = useMemo(() => {
    return shedMaster.filter(shed => 
      shed.shed_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shed.railway.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, shedMaster]);

  const addShedToGeneration = (shed: ShedMasterEntry) => {
    setSelectedSheds(prev => [{ 
      ...shed, 
      instanceId: Math.random().toString(36).substr(2, 9),
      for_month: selectedMonth,
      for_year: selectedYear,
      during_month: selectedMonth,
      during_year: selectedYear,
      supplying_shed: selectedSupplyingShed,
      pricing_period: 'average',
      goods_litres: 0,
      coach_litres: 0,
      is_power_car: false
    }, ...prev]);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const updateSelectedShed = (instanceId: string, updates: Partial<SelectedShed>) => {
    setSelectedSheds(prev => prev.map(s => {
      if (s.instanceId === instanceId) {
        const updated = { ...s, ...updates };
        if (updates.is_power_car) {
          updated.goods_litres = 0;
        }
        return updated;
      }
      return s;
    }));
  };

  const removeShed = (instanceId: string) => {
    setSelectedSheds(prev => prev.filter(s => s.instanceId !== instanceId));
  };

  const getPriceForShed = (supplyingShed: string, period: string, month: string, year: string) => {
    const entry = priceMaster.find(p => 
      p.supplying_shed === supplyingShed && 
      p.month === month && 
      p.year === year
    );
    if (!entry) return null;
    return entry.periods[period as keyof typeof entry.periods];
  };

  const calculateAmounts = (shed: SelectedShed) => {
    const price = getPriceForShed(shed.supplying_shed, shed.pricing_period, shed.during_month, shed.during_year);
    if (!price) return null;

    const totalLitres = shed.goods_litres + shed.coach_litres;
    const klrs = totalLitres / 1000;

    const primeCost = price.base_price * klrs;
    const excise = price.excise * klrs;
    const vat = price.vat * klrs;
    const overhead = price.overhead * klrs;
    const total = primeCost + excise + vat + overhead;

    return {
      primeCost,
      excise,
      vat,
      overhead,
      total,
      klrs,
      price,
      coachPrimeCost: price.base_price * (shed.coach_litres / 1000),
      goodsPrimeCost: price.base_price * (shed.goods_litres / 1000)
    };
  };

  const sortedPriceMaster = useMemo(() => {
    return [...priceMaster].sort((a, b) => {
      if (a.year !== b.year) return b.year.localeCompare(a.year);
      const monthA = MONTHS.indexOf(a.month);
      const monthB = MONTHS.indexOf(b.month);
      return monthB - monthA;
    });
  }, [priceMaster]);

  const [newPriceEntry, setNewPriceEntry] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return {
      month: MONTHS[d.getMonth()],
      year: d.getFullYear().toString(),
      supplying_shed: 'HXP'
    };
  });

  const addPriceEntry = async () => {
    const exists = priceMaster.find(p => 
      p.month === newPriceEntry.month && 
      p.year === newPriceEntry.year && 
      p.supplying_shed === newPriceEntry.supplying_shed
    );
    if (exists) {
      alert('Price entry already exists for this period and shed.');
      return;
    }
    const newEntry: PriceMasterEntry = {
      id: Math.random().toString(36).substr(2, 9),
      ...newPriceEntry,
      periodNames: {
        p1: '1st-15th',
        p2: '16th-End'
      },
      periods: {
        p1: { base_price: 0, excise: 0, vat: 0, overhead: 0 },
        p2: { base_price: 0, excise: 0, vat: 0, overhead: 0 },
        average: { base_price: 0, excise: 0, vat: 0, overhead: 0 }
      }
    };
    
    try {
      await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      setPriceMaster([...priceMaster, newEntry]);
    } catch (error) {
      console.error('Error adding price:', error);
    }
  };

  const updatePriceEntry = async (entryId: string, period: string, data: PriceData) => {
    const entry = priceMaster.find(p => p.id === entryId);
    if (!entry) return;

    let updatedPeriods = { ...entry.periods, [period]: data };

    // Auto-calculate average if p1 or p2 is updated
    if (period === 'p1' || period === 'p2') {
      const p1 = updatedPeriods['p1'];
      const p2 = updatedPeriods['p2'];
      updatedPeriods['average'] = {
        ...updatedPeriods['average'],
        base_price: Number(((p1.base_price + p2.base_price) / 2).toFixed(2)),
        excise: Number(((p1.excise + p2.excise) / 2).toFixed(2)),
        vat: Number(((p1.vat + p2.vat) / 2).toFixed(2)),
        overhead: Number(((p1.overhead + p2.overhead) / 2).toFixed(2)),
      };
    }

    const updatedEntry = {
      ...entry,
      periods: updatedPeriods
    };

    try {
      await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEntry)
      });
      setPriceMaster(prev => prev.map(p => p.id === entryId ? updatedEntry : p));
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const updatePeriodName = async (entryId: string, periodKey: 'p1' | 'p2', newName: string) => {
    const entry = priceMaster.find(p => p.id === entryId);
    if (!entry) return;

    const updatedEntry = {
      ...entry,
      periodNames: {
        ...entry.periodNames,
        [periodKey]: newName
      }
    };

    try {
      await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEntry)
      });
      setPriceMaster(prev => prev.map(p => p.id === entryId ? updatedEntry : p));
    } catch (error) {
      console.error('Error updating period name:', error);
    }
  };

  const deletePriceEntry = async (id: string) => {
    try {
      await fetch(`/api/prices/${id}`, { method: 'DELETE' });
      setPriceMaster(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting price:', error);
    }
  };

  const generateCertificatesOnlyZip = async () => {
    setIsGenerating(true);
    setSigningProgress(null);
    setLastSigningReport(null);
    const zip = new JSZip();
    let signedCount = 0, failedCount = 0, skippedCount = 0;

    try {
      for (const shed of selectedSheds) {
        const calc = calculateAmounts(shed);
        if (!calc) continue;

        const doc = new jsPDF('p', 'mm', 'a4');
        const today = new Date().toLocaleDateString('en-GB');

        // Header Design
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('WESTERN RAILWAY RAJKOT DIVISION', 105, 15, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        const headerX = 145;
        doc.text("Sr. DFM's OFFICE, Rajkot.", headerX, 25);
        doc.text(`DT. ${today}`, headerX, 30);

        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text('C E R T I F I C A T E', 15, 30);

        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        
        const totalAmount = Math.round(calc.total).toLocaleString('en-IN');
        const totalLitres = (shed.goods_litres + shed.coach_litres).toLocaleString('en-IN');
        
        const getFullMonth = (m: string) => {
          const map: Record<string, string> = {
            'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
            'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
            'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
          };
          return map[m] || m;
        };

        // Justified Paragraph Helper
        const drawJustifiedParagraph = (parts: { text: string; bold: boolean }[], startY: number) => {
          let currentY = startY;
          const lineHeight = 6;
          const leftMargin = 15;
          const rightMargin = 195;
          const indent = 55;

          let allWords: { text: string; bold: boolean }[] = [];
          parts.forEach(p => {
            const words = p.text.split(' ');
            words.forEach((w, i) => {
              if (w === '' && i > 0) return;
              allWords.push({ text: w, bold: p.bold });
            });
          });

          let lineWords: { text: string; bold: boolean }[] = [];
          let currentLineWidth = 0;
          let isFirstLine = startY === 45;

          const renderLine = (words: { text: string; bold: boolean }[], y: number, isLast: boolean, isFirst: boolean) => {
            const startX = isFirst ? indent : leftMargin;
            const availableWidth = rightMargin - startX;
            
            if (isLast || words.length === 1) {
              let x = startX;
              words.forEach(w => {
                doc.setFont('times', w.bold ? 'bold' : 'normal');
                doc.text(w.text, x, y);
                x += doc.getTextWidth(w.text + ' ');
              });
            } else {
              const totalWordsWidth = words.reduce((acc, w) => {
                doc.setFont('times', w.bold ? 'bold' : 'normal');
                return acc + doc.getTextWidth(w.text);
              }, 0);
              const totalSpacing = availableWidth - totalWordsWidth;
              const spacingPerWord = totalSpacing / (words.length - 1);
              
              let x = startX;
              words.forEach((w, i) => {
                doc.setFont('times', w.bold ? 'bold' : 'normal');
                doc.text(w.text, x, y);
                x += doc.getTextWidth(w.text) + spacingPerWord;
              });
            }
          };

          for (let i = 0; i < allWords.length; i++) {
            const word = allWords[i];
            const startX = isFirstLine ? indent : leftMargin;
            const availableWidth = rightMargin - startX;
            
            doc.setFont('times', word.bold ? 'bold' : 'normal');
            const wordWidth = doc.getTextWidth(word.text);
            const spaceWidth = doc.getTextWidth(' ');

            if (currentLineWidth + wordWidth > availableWidth) {
              renderLine(lineWords, currentY, false, isFirstLine);
              currentY += lineHeight;
              lineWords = [word];
              currentLineWidth = wordWidth + spaceWidth;
              isFirstLine = false;
            } else {
              lineWords.push(word);
              currentLineWidth += wordWidth + spaceWidth;
            }
          }
          
          if (lineWords.length > 0) {
            renderLine(lineWords, currentY, true, isFirstLine);
          }
          
          return currentY + lineHeight;
        };

        const p1Parts = [
          { text: 'Certified that an amount of ', bold: false },
          { text: `${totalAmount}/-`, bold: true },
          { text: ' on account of cost and other charges towards ', bold: false },
          { text: `${totalLitres}`, bold: true },
          { text: ' litres of HSD Oil issued to ', bold: false },
          { text: shed.is_power_car ? 'Power Car' : 'Coach/Goods/Shunting Departmental Engines', bold: true },
          { text: ' of ', bold: false },
          { text: `${shed.shed_name} Shed`, bold: true },
          { text: ' of ', bold: false },
          { text: `${shed.railway} Railway`, bold: true },
          { text: ' by DFO-', bold: false },
          { text: `${shed.supplying_shed}`, bold: true },
          { text: ', Rajkot Division, Western Railway, during ', bold: false },
          { text: `${getFullMonth(shed.during_month)} ${shed.during_year}`, bold: true },
          { text: ', as per the statement attached, has been duly accounted for.', bold: false }
        ];

        const p2Parts = [
          { text: 'The same has been audited and found to be a bona fide item of expenditure/receipt, debitable/creditable to TRHQ, ', bold: false },
          { text: `${shed.railway} Railway`, bold: true },
          { text: ', in the accounts for the month of ', bold: false },
          { text: `${getFullMonth(shed.for_month)} ${shed.for_year}`, bold: true },
          { text: ', as issued by DFO-', bold: false },
          { text: `${shed.supplying_shed}`, bold: true },
          { text: '.', bold: false }
        ];

        const nextY = drawJustifiedParagraph(p1Parts, 45);
        const lastY = drawJustifiedParagraph(p2Parts, nextY + 4);

        const qtyTitle = shed.is_power_car 
          ? `SR.DEE./${shed.shed_name} [${shed.railway} RLY]) Qty.HSD OIL`
          : `Shed  ${shed.shed_name}  ( ${shed.railway} RLY. )  Qty. HSD OIL`;

        doc.setFont('times', 'normal');
        doc.text('Encl: One statement', 15, lastY + 25);
        doc.text('For, Divisional Finance Manager,', 195, lastY + 25, { align: 'right' });
        doc.text('Western Railway, Rajkot.', 195, lastY + 30, { align: 'right' });

        doc.setFont('courier', 'bold');
        doc.text('Ltrs', 160, lastY + 50, { align: 'right' });
        doc.text('K.Ltrs', 185, lastY + 50, { align: 'right' });
        doc.setFont('courier', 'normal');
        
        doc.text(qtyTitle, 15, lastY + 57);
        doc.text('(COACH)', 120, lastY + 57);
        doc.text(`${shed.coach_litres}`, 160, lastY + 57, { align: 'right' });
        doc.text(`${(shed.coach_litres / 1000).toFixed(3)}`, 185, lastY + 57, { align: 'right' });

        if (!shed.is_power_car) {
          doc.text('(GOODS)', 120, lastY + 64);
          doc.text(`${shed.goods_litres}`, 160, lastY + 64, { align: 'right' });
          doc.text(`${(shed.goods_litres / 1000).toFixed(3)}`, 185, lastY + 64, { align: 'right' });
        }

        doc.line(140, lastY + 67, 195, lastY + 67);
        doc.setFont('courier', 'bold');
        doc.text('TOTAL', 120, lastY + 72);
        doc.text(`${shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)}`, 160, lastY + 72, { align: 'right' });
        doc.text(`${((shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)) / 1000).toFixed(3)}`, 185, lastY + 72, { align: 'right' });
        doc.setFont('courier', 'normal');

        const tableBody = [];
        if (shed.is_power_car) {
          tableBody.push(['Base Price', Math.round(calc.price.base_price).toLocaleString('en-IN'), '08066031', Math.round(calc.primeCost).toLocaleString('en-IN')]);
          tableBody.push(['Excise Duty', Math.round(calc.price.excise).toLocaleString('en-IN'), '08066036', Math.round(calc.excise).toLocaleString('en-IN')]);
          tableBody.push(['Sales Tax/Add.Tax', Math.round(calc.price.vat).toLocaleString('en-IN'), '08066038', Math.round(calc.vat).toLocaleString('en-IN')]);
          tableBody.push(['Other Taxes & Levies', Math.round(calc.price.overhead).toLocaleString('en-IN'), '08066099', Math.round(calc.overhead).toLocaleString('en-IN')]);
        } else {
          tableBody.push(['Base Price (COACH)', Math.round(calc.price.base_price).toLocaleString('en-IN'), COACH_ALLOCATION, Math.round(calc.coachPrimeCost).toLocaleString('en-IN')]);
          tableBody.push(['Base Price (GOODS)', '', GOODS_ALLOCATION, Math.round(calc.goodsPrimeCost).toLocaleString('en-IN')]);
          tableBody.push(['Excise Duty', Math.round(calc.price.excise).toLocaleString('en-IN'), '10023136', Math.round(calc.excise).toLocaleString('en-IN')]);
          tableBody.push(['Sales Tax/Add.Tax', Math.round(calc.price.vat).toLocaleString('en-IN'), '10023238', Math.round(calc.vat).toLocaleString('en-IN')]);
          tableBody.push(['Other Taxes & Levies', Math.round(calc.price.overhead).toLocaleString('en-IN'), '10022199', Math.round(calc.overhead).toLocaleString('en-IN')]);
        }
        tableBody.push([{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, Math.round(calc.price.base_price + calc.price.excise + calc.price.vat + calc.price.overhead).toLocaleString('en-IN'), '', { content: Math.round(calc.total).toLocaleString('en-IN'), styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
          startY: lastY + 85,
          head: [['Particulars', 'Rate per K.L.R.S.', 'Allocation', 'Amount']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, font: 'times' },
          styles: { fontSize: 10, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, font: 'times', textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
            2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
          }
        });

        const rawBytes = new Uint8Array(doc.output('arraybuffer'));
        const fileName = `${shed.shed_name}_${shed.railway}_RS_${Math.round(calc.total)}_${shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)}_LITRES_${shed.during_month}${shed.during_year}.pdf`;

        if (dscEnabled) {
          const shedIdx = selectedSheds.indexOf(shed) + 1;
          setSigningProgress({ current: shedIdx, total: selectedSheds.length, name: shed.shed_name });
          const signed = await signPdfBytes(rawBytes, 'HSD Oil Cost Certificate');
          if (signed) {
            zip.file(fileName, signed);
            signedCount++;
          } else {
            zip.file(fileName, rawBytes);
            failedCount++;
            console.warn(`DSC signing failed for ${shed.shed_name}, using unsigned PDF`);
          }
        } else {
          zip.file(fileName, rawBytes);
          skippedCount++;
        }
      }

      setSigningProgress(null);
      if (dscEnabled) setLastSigningReport({ signed: signedCount, failed: failedCount, skipped: skippedCount });

      const zipContent = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipContent);
      link.download = `HSD_Certificates_Only_${selectedMonth}_${selectedYear}.zip`;
      link.click();
    } catch (error) {
      console.error('Error generating ZIP:', error);
      alert('Error generating certificates. Please check console for details.');
    } finally {
      setIsGenerating(false);
      setSigningProgress(null);
    }
  };

  const clearAllSheds = () => {
    if (window.confirm('Are you sure you want to clear all added sheds?')) {
      setSelectedSheds([]);
    }
  };

  // ─── DSC Signing helpers ──────────────────────────────────────────────────

  const uint8ToBase64 = (bytes: Uint8Array): string => {
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const testDscConnection = async () => {
    setDscStatus('testing');
    setDscStatusMessage('Connecting to DSC service…');

    // Primary: browser direct (works because browser runs on Windows host)
    try {
      const resp = await fetch(`${dscProtocol}://127.0.0.1:${dscPort}/check/isLive`, {
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        setDscStatus('online');
        setDscStatusMessage('DSC service online (direct connection)');
        return;
      }
    } catch (_) { /* fall through to proxy */ }

    // Fallback: server proxy (Docker container → host.docker.internal)
    try {
      const resp = await fetch(`/api/dsc/health?port=${dscPort}&protocol=${dscProtocol}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await resp.json();
      if (data.status === 'online') {
        setDscStatus('online');
        setDscStatusMessage('DSC service online (via server proxy)');
        return;
      }
    } catch (_) { /* fall through */ }

    setDscStatus('offline');
    setDscStatusMessage(
      `Cannot reach ${dscProtocol}://127.0.0.1:${dscPort}. ` +
      'Ensure emBridge or DSC Signer Service is running and your USB token is connected.'
    );
  };

  // Tries to sign a PDF using emBridge / DSC Signer Service.
  // Attempts direct browser fetch first; falls back to server proxy.
  // Returns signed bytes on success, or null on failure.
  const signPdfBytes = async (
    pdfBytes: Uint8Array,
    reason: string = 'HSD Oil Cost Certificate'
  ): Promise<Uint8Array | null> => {
    const pdfBase64 = uint8ToBase64(pdfBytes);
    const base = `${dscProtocol}://127.0.0.1:${dscPort}`;

    // Signature placement: bottom-right of each page (PDF points, A4 = 595×842)
    const sigParams = {
      reason,
      location: 'Rajkot',
      // emBridge coordinate keys (lower-left / upper-right from page bottom)
      llx: 395, lly: 20, urx: 580, ury: 80,
      // DSC Signer alternative keys
      x: 395, y: 20, width: 185, height: 60,
      pageNo: -1,  // emBridge: -1 = all pages
      page: -1,    // DSC Signer: -1 = all pages
    };

    // emSigner/emBridge eMudhra format (confirmed from emSigner Signer Gateway API)
    const emBridgeBody = {
      Name: 'HSD Oil Cost Certificate',
      FileType: 'PDF',
      SignatureType: '1',
      SelectPage: 'All',          // sign all pages
      SignaturePosition: 'Bottom-Right',
      PageNumber: null,
      CustomizeCoordinates: '395,20,185,60',  // left,top,width,height (bottom-right area)
      PreviewRequired: false,
      AuthToken: '',
      File: pdfBase64,
      IsCompressed: false,
      reason,
      location: 'Rajkot',
    };

    type Attempt = { directUrl: string; proxyEndpoint: string; body: Record<string, unknown> };

    const attempts: Attempt[] = dscServiceType === 'embridge'
      ? [
          // emBridge eMudhra endpoints — port typically 26769
          { directUrl: `${base}/signPdf`,        proxyEndpoint: '/signPdf',        body: emBridgeBody },
          { directUrl: `${base}/sign`,           proxyEndpoint: '/sign',           body: emBridgeBody },
          { directUrl: `${base}/api/sign`,       proxyEndpoint: '/api/sign',       body: emBridgeBody },
        ]
      : dscServiceType === 'dscsigner'
      ? [
          // DSC Signer Service 4.1 (NIC/eOffice) — port 55101
          { directUrl: `${base}/sign`,           proxyEndpoint: '/sign',           body: { pdf: pdfBase64, pdfData: pdfBase64, ...sigParams } },
          { directUrl: `${base}/signPdf`,        proxyEndpoint: '/signPdf',        body: { pdf: pdfBase64, pdfData: pdfBase64, ...sigParams } },
          { directUrl: `${base}/dsc/sign`,       proxyEndpoint: '/dsc/sign',       body: { pdf: pdfBase64, ...sigParams } },
        ]
      : [ // auto-detect: try both service formats
          { directUrl: `${base}/signPdf`,        proxyEndpoint: '/signPdf',        body: emBridgeBody },
          { directUrl: `${base}/sign`,           proxyEndpoint: '/sign',           body: { pdf: pdfBase64, pdfData: pdfBase64, ...sigParams } },
          { directUrl: `${base}/api/sign`,       proxyEndpoint: '/api/sign',       body: emBridgeBody },
          { directUrl: `${base}/dsc/sign`,       proxyEndpoint: '/dsc/sign',       body: { pdf: pdfBase64, ...sigParams } },
        ];

    const extractSignedBytes = (result: Record<string, unknown>): Uint8Array | null => {
      // Try all known response field names from both emBridge and DSC Signer
      const b64 = (
        result.SignedDocument || result.File || result.signedPdfData ||
        result.signedPdf || result.data || result.pdf
      ) as string | undefined;
      if (!b64 || typeof b64 !== 'string') return null;
      try {
        return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      } catch { return null; }
    };

    for (const attempt of attempts) {
      // Try direct browser → DSC service (best path, avoids proxy overhead)
      try {
        const resp = await fetch(attempt.directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt.body),
          signal: AbortSignal.timeout(45000),
        });
        if (resp.ok) {
          const result = await resp.json() as Record<string, unknown>;
          const signed = extractSignedBytes(result);
          if (signed) return signed;
        }
      } catch (_) { /* CORS or network error — try proxy */ }

      // Try via server proxy (Docker → host.docker.internal → DSC service)
      try {
        const resp = await fetch('/api/dsc/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...attempt.body,
            _port: dscPort,
            _protocol: dscProtocol,
            _endpoint: attempt.proxyEndpoint,
          }),
          signal: AbortSignal.timeout(50000),
        });
        if (resp.ok) {
          const result = await resp.json() as Record<string, unknown>;
          const signed = extractSignedBytes(result);
          if (signed) return signed;
        }
      } catch (_) { /* continue to next attempt */ }
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────

  const parsePageRanges = (rangeStr: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(p => p.trim());
    
    parts.forEach(part => {
      if (part.includes('-')) {
        const rangeParts = part.split('-').map(n => parseInt(n.trim()));
        if (rangeParts.length === 2) {
          const [start, end] = rangeParts;
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.max(1, start); i <= Math.min(end, maxPages); i++) {
              pages.add(i - 1); // 0-indexed
            }
          }
        }
      } else {
        const page = parseInt(part);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          pages.add(page - 1); // 0-indexed
        }
      }
    });
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const generateCertificatesZip = async () => {
    setIsGenerating(true);
    setSigningProgress(null);
    setLastSigningReport(null);
    const zip = new JSZip();
    let signedCount = 0, failedCount = 0, skippedCount = 0;

    try {
      for (const shed of selectedSheds) {
        const calc = calculateAmounts(shed);
        if (!calc) continue;

        // 1. Generate Certificate PDF
        const doc = new jsPDF('p', 'mm', 'a4');
        const today = new Date().toLocaleDateString('en-GB');

        // Header Design
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('WESTERN RAILWAY RAJKOT DIVISION', 105, 15, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        const headerX = 145;
        doc.text("Sr. DFM's OFFICE, Rajkot.", headerX, 25);
        doc.text(`DT. ${today}`, headerX, 30);

        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text('C E R T I F I C A T E', 15, 30);

        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        
        const totalAmount = Math.round(calc.total).toLocaleString('en-IN');
        const totalLitres = (shed.goods_litres + shed.coach_litres).toLocaleString('en-IN');
        
        const getFullMonth = (m: string) => {
          const map: Record<string, string> = {
            'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
            'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
            'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
          };
          return map[m] || m;
        };

        // Justified Paragraph Helper
        const drawJustifiedParagraph = (parts: { text: string; bold: boolean }[], startY: number) => {
          let currentY = startY;
          const lineHeight = 6;
          const leftMargin = 15;
          const rightMargin = 195;
          const indent = 55;

          // Flatten parts into words with formatting
          let allWords: { text: string; bold: boolean }[] = [];
          parts.forEach(p => {
            const words = p.text.split(' ');
            words.forEach((w, i) => {
              if (w === '' && i > 0) return;
              allWords.push({ text: w, bold: p.bold });
            });
          });

          let lineWords: { text: string; bold: boolean }[] = [];
          let currentLineWidth = 0;
          let isFirstLine = startY === 45; // Only indent the very first paragraph of the cert

          const renderLine = (words: { text: string; bold: boolean }[], y: number, isLast: boolean, isFirst: boolean) => {
            const startX = isFirst ? indent : leftMargin;
            const availableWidth = rightMargin - startX;
            
            if (isLast || words.length === 1) {
              let x = startX;
              words.forEach(w => {
                doc.setFont('times', w.bold ? 'bold' : 'normal');
                doc.text(w.text, x, y);
                x += doc.getTextWidth(w.text + ' ');
              });
            } else {
              const totalWordsWidth = words.reduce((acc, w) => {
                doc.setFont('times', w.bold ? 'bold' : 'normal');
                return acc + doc.getTextWidth(w.text);
              }, 0);
              const totalSpacing = availableWidth - totalWordsWidth;
              const spacingPerWord = totalSpacing / (words.length - 1);
              
              let x = startX;
              words.forEach((w, i) => {
                doc.setFont('times', w.bold ? 'bold' : 'normal');
                doc.text(w.text, x, y);
                x += doc.getTextWidth(w.text) + spacingPerWord;
              });
            }
          };

          for (let i = 0; i < allWords.length; i++) {
            const word = allWords[i];
            const startX = isFirstLine ? indent : leftMargin;
            const availableWidth = rightMargin - startX;
            
            doc.setFont('times', word.bold ? 'bold' : 'normal');
            const wordWidth = doc.getTextWidth(word.text);
            const spaceWidth = doc.getTextWidth(' ');

            if (currentLineWidth + wordWidth > availableWidth) {
              renderLine(lineWords, currentY, false, isFirstLine);
              currentY += lineHeight;
              lineWords = [word];
              currentLineWidth = wordWidth + spaceWidth;
              isFirstLine = false;
            } else {
              lineWords.push(word);
              currentLineWidth += wordWidth + spaceWidth;
            }
          }
          
          if (lineWords.length > 0) {
            renderLine(lineWords, currentY, true, isFirstLine);
          }
          
          return currentY + lineHeight;
        };

        const p1Parts = [
          { text: 'Certified that an amount of ', bold: false },
          { text: `${totalAmount}/-`, bold: true },
          { text: ' on account of cost and other charges towards ', bold: false },
          { text: `${totalLitres}`, bold: true },
          { text: ' litres of HSD Oil issued to ', bold: false },
          { text: shed.is_power_car ? 'Power Car' : 'Coach/Goods/Shunting Departmental Engines', bold: true },
          { text: ' of ', bold: false },
          { text: `${shed.shed_name} Shed`, bold: true },
          { text: ' of ', bold: false },
          { text: `${shed.railway} Railway`, bold: true },
          { text: ' by DFO-', bold: false },
          { text: `${shed.supplying_shed}`, bold: true },
          { text: ', Rajkot Division, Western Railway, during ', bold: false },
          { text: `${getFullMonth(shed.during_month)} ${shed.during_year}`, bold: true },
          { text: ', as per the statement attached, has been duly accounted for.', bold: false }
        ];

        const p2Parts = [
          { text: 'The same has been audited and found to be a bona fide item of expenditure/receipt, debitable/creditable to TRHQ, ', bold: false },
          { text: `${shed.railway} Railway`, bold: true },
          { text: ', in the accounts for the month of ', bold: false },
          { text: `${getFullMonth(shed.for_month)} ${shed.for_year}`, bold: true },
          { text: ', as issued by DFO-', bold: false },
          { text: `${shed.supplying_shed}`, bold: true },
          { text: '.', bold: false }
        ];

        const nextY = drawJustifiedParagraph(p1Parts, 45);
        const lastY = drawJustifiedParagraph(p2Parts, nextY + 4);

        const qtyTitle = shed.is_power_car 
          ? `SR.DEE./${shed.shed_name} [${shed.railway} RLY]) Qty.HSD OIL`
          : `Shed  ${shed.shed_name}  ( ${shed.railway} RLY. )  Qty. HSD OIL`;

        doc.setFont('times', 'normal');
        doc.text('Encl: One statement', 15, lastY + 25);
        doc.text('For, Divisional Finance Manager,', 195, lastY + 25, { align: 'right' });
        doc.text('Western Railway, Rajkot.', 195, lastY + 30, { align: 'right' });

        doc.setFont('courier', 'bold');
        doc.text('Ltrs', 160, lastY + 50, { align: 'right' });
        doc.text('K.Ltrs', 185, lastY + 50, { align: 'right' });
        doc.setFont('courier', 'normal');
        
        doc.text(qtyTitle, 15, lastY + 57);
        doc.text('(COACH)', 120, lastY + 57);
        doc.text(`${shed.coach_litres}`, 160, lastY + 57, { align: 'right' });
        doc.text(`${(shed.coach_litres / 1000).toFixed(3)}`, 185, lastY + 57, { align: 'right' });

        if (!shed.is_power_car) {
          doc.text('(GOODS)', 120, lastY + 64);
          doc.text(`${shed.goods_litres}`, 160, lastY + 64, { align: 'right' });
          doc.text(`${(shed.goods_litres / 1000).toFixed(3)}`, 185, lastY + 64, { align: 'right' });
        }

        doc.line(140, lastY + 67, 195, lastY + 67);
        doc.setFont('courier', 'bold');
        doc.text('TOTAL', 120, lastY + 72);
        doc.text(`${shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)}`, 160, lastY + 72, { align: 'right' });
        doc.text(`${((shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)) / 1000).toFixed(3)}`, 185, lastY + 72, { align: 'right' });
        doc.setFont('courier', 'normal');

        const tableBody = [];
        if (shed.is_power_car) {
          tableBody.push(['Base Price', Math.round(calc.price.base_price).toLocaleString('en-IN'), '08066031', Math.round(calc.primeCost).toLocaleString('en-IN')]);
          tableBody.push(['Excise Duty', Math.round(calc.price.excise).toLocaleString('en-IN'), '08066036', Math.round(calc.excise).toLocaleString('en-IN')]);
          tableBody.push(['Sales Tax/Add.Tax', Math.round(calc.price.vat).toLocaleString('en-IN'), '08066038', Math.round(calc.vat).toLocaleString('en-IN')]);
          tableBody.push(['Other Taxes & Levies', Math.round(calc.price.overhead).toLocaleString('en-IN'), '08066099', Math.round(calc.overhead).toLocaleString('en-IN')]);
        } else {
          tableBody.push(['Base Price (COACH)', Math.round(calc.price.base_price).toLocaleString('en-IN'), COACH_ALLOCATION, Math.round(calc.coachPrimeCost).toLocaleString('en-IN')]);
          tableBody.push(['Base Price (GOODS)', '', GOODS_ALLOCATION, Math.round(calc.goodsPrimeCost).toLocaleString('en-IN')]);
          tableBody.push(['Excise Duty', Math.round(calc.price.excise).toLocaleString('en-IN'), '10023136', Math.round(calc.excise).toLocaleString('en-IN')]);
          tableBody.push(['Sales Tax/Add.Tax', Math.round(calc.price.vat).toLocaleString('en-IN'), '10023238', Math.round(calc.vat).toLocaleString('en-IN')]);
          tableBody.push(['Other Taxes & Levies', Math.round(calc.price.overhead).toLocaleString('en-IN'), '10022199', Math.round(calc.overhead).toLocaleString('en-IN')]);
        }
        tableBody.push([{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, Math.round(calc.price.base_price + calc.price.excise + calc.price.vat + calc.price.overhead).toLocaleString('en-IN'), '', { content: Math.round(calc.total).toLocaleString('en-IN'), styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
          startY: lastY + 85,
          head: [['Particulars', 'Rate per K.L.R.S.', 'Allocation', 'Amount']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, font: 'times' },
          styles: { fontSize: 10, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, font: 'times', textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
            2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
          }
        });

        const certPdfBytes = doc.output('arraybuffer');
        
        // 2. Merge with Voucher and Pricing PDF
        const mergedPdf = await PDFDocument.create();
        const certPdfDoc = await PDFDocument.load(certPdfBytes);
        const certPages = await mergedPdf.copyPages(certPdfDoc, certPdfDoc.getPageIndices());
        certPages.forEach(p => mergedPdf.addPage(p));

        // Add Voucher PDF
        if (shed.voucher_pdf_base64) {
          try {
            const voucherBytes = Uint8Array.from(atob(shed.voucher_pdf_base64.split(',')[1]), c => c.charCodeAt(0));
            const voucherPdfDoc = await PDFDocument.load(voucherBytes);
            const voucherPages = await mergedPdf.copyPages(voucherPdfDoc, voucherPdfDoc.getPageIndices());
            voucherPages.forEach(p => mergedPdf.addPage(p));
          } catch (e) {
            console.error('Error adding individual voucher PDF:', e);
          }
        } else if (masterVoucherPdf && shed.voucher_pages) {
          try {
            const masterBytes = Uint8Array.from(atob(masterVoucherPdf.split(',')[1]), c => c.charCodeAt(0));
            const masterPdfDoc = await PDFDocument.load(masterBytes);
            const maxPages = masterPdfDoc.getPageCount();
            const pageIndices = parsePageRanges(shed.voucher_pages, maxPages);
            
            if (pageIndices.length > 0) {
              const copiedPages = await mergedPdf.copyPages(masterPdfDoc, pageIndices);
              copiedPages.forEach(p => mergedPdf.addPage(p));
            }
          } catch (e) {
            console.error('Error extracting pages from master voucher PDF:', e);
          }
        }

        // Add Pricing PDF
        const priceEntry = priceMaster.find(p => p.supplying_shed === shed.supplying_shed && p.month === shed.during_month && p.year === shed.during_year);
        if (priceEntry) {
          if (shed.pricing_period === 'average') {
            // Merge p1 and p2 for average
            const pdf1 = priceEntry.periods.p1.pdf_base64;
            const pdf2 = priceEntry.periods.p2.pdf_base64;
            
            if (pdf1) {
              try {
                const p1Bytes = Uint8Array.from(atob(pdf1.split(',')[1]), c => c.charCodeAt(0));
                const doc1 = await PDFDocument.load(p1Bytes);
                const pages1 = await mergedPdf.copyPages(doc1, doc1.getPageIndices());
                pages1.forEach(p => mergedPdf.addPage(p));
              } catch (e) {
                console.error('Error adding pricing PDF p1:', e);
              }
            }
            
            if (pdf2) {
              try {
                const p2Bytes = Uint8Array.from(atob(pdf2.split(',')[1]), c => c.charCodeAt(0));
                const doc2 = await PDFDocument.load(p2Bytes);
                const pages2 = await mergedPdf.copyPages(doc2, doc2.getPageIndices());
                pages2.forEach(p => mergedPdf.addPage(p));
              } catch (e) {
                console.error('Error adding pricing PDF p2:', e);
              }
            }
          } else {
            const pricingPdfBase64 = priceEntry.periods[shed.pricing_period].pdf_base64;
            if (pricingPdfBase64) {
              try {
                const pricingBytes = Uint8Array.from(atob(pricingPdfBase64.split(',')[1]), c => c.charCodeAt(0));
                const pricingPdfDoc = await PDFDocument.load(pricingBytes);
                const pricingPages = await mergedPdf.copyPages(pricingPdfDoc, pricingPdfDoc.getPageIndices());
                pricingPages.forEach(p => mergedPdf.addPage(p));
              } catch (e) {
                console.error('Error adding pricing PDF:', e);
              }
            }
          }
        }

        const rawBytes = await mergedPdf.save();
        const fileName = `${shed.shed_name}_${shed.railway}_RS_${Math.round(calc.total)}_${shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)}_LITRES_${shed.during_month}${shed.during_year}.pdf`;

        if (dscEnabled) {
          const shedIdx = selectedSheds.indexOf(shed) + 1;
          setSigningProgress({ current: shedIdx, total: selectedSheds.length, name: shed.shed_name });
          const signed = await signPdfBytes(rawBytes, 'HSD Oil Cost Certificate');
          if (signed) {
            zip.file(fileName, signed);
            signedCount++;
          } else {
            zip.file(fileName, rawBytes);
            failedCount++;
            console.warn(`DSC signing failed for ${shed.shed_name}, using unsigned PDF`);
          }
        } else {
          zip.file(fileName, rawBytes);
          skippedCount++;
        }
      }

      setSigningProgress(null);
      if (dscEnabled) setLastSigningReport({ signed: signedCount, failed: failedCount, skipped: skippedCount });

      const zipContent = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipContent);
      link.download = `HSD_Certificates_${selectedMonth}_${selectedYear}.zip`;
      link.click();
    } catch (error) {
      console.error('Error generating ZIP:', error);
      alert('Error generating certificates. Please check console for details.');
    } finally {
      setIsGenerating(false);
      setSigningProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#0052CC] p-2 rounded-lg">
              <FileText className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Western Railway</h1>
              <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">HSD Oil Cost Certificate System</p>
            </div>
          </div>
          <nav className="flex gap-1 bg-[#F3F4F6] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('generate')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                activeTab === 'generate' ? "bg-white text-[#0052CC] shadow-sm" : "text-[#6B7280] hover:text-[#1A1A1A]"
              )}
            >
              <Calculator className="w-4 h-4" />
              Generate
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                activeTab === 'prices' ? "bg-white text-[#0052CC] shadow-sm" : "text-[#6B7280] hover:text-[#1A1A1A]"
              )}
            >
              <Settings className="w-4 h-4" />
              Price Master
            </button>
            <button
              onClick={() => setActiveTab('sheds')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                activeTab === 'sheds' ? "bg-white text-[#0052CC] shadow-sm" : "text-[#6B7280] hover:text-[#1A1A1A]"
              )}
            >
              <Building2 className="w-4 h-4" />
              Shed Master
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'generate' ? (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Step 1: Global Config */}
              <section className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="text-[#0052CC] w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Step 1: Select Period & Supply</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">For the month of</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] focus:border-transparent transition-all outline-none"
                    >
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] focus:border-transparent transition-all outline-none"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Supplying Shed</label>
                    <select
                      value={selectedSupplyingShed}
                      onChange={(e) => setSelectedSupplyingShed(e.target.value)}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] focus:border-transparent transition-all outline-none"
                    >
                      {Array.from(new Set(priceMaster.map(p => p.supplying_shed))).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Certificate Date</label>
                    <div className="w-full bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium text-[#6B7280]">
                      {new Date().toLocaleDateString('en-GB')} (Auto)
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 2: Master Voucher PDF */}
              <section className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="text-[#0052CC] w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Step 2: Upload Master Voucher PDF</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const base64 = await fileToBase64(file);
                          setMasterVoucherPdf(base64);
                          setMasterVoucherPdfName(file.name);
                          
                          // Create Object URL for preview
                          if (masterVoucherPdfUrl) URL.revokeObjectURL(masterVoucherPdfUrl);
                          const url = URL.createObjectURL(file);
                          setMasterVoucherPdfUrl(url);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={cn(
                      "w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all",
                      masterVoucherPdf ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    )}>
                      {masterVoucherPdf ? (
                        <>
                          <div className="bg-emerald-500 p-2 rounded-full">
                            <Check className="text-white w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-emerald-700">{masterVoucherPdfName}</p>
                            <p className="text-xs text-emerald-600 mt-1">Master PDF uploaded successfully</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-[#0052CC]/10 p-3 rounded-full">
                            <Upload className="text-[#0052CC] w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-[#1A1A1A]">Click or drag to upload master voucher PDF</p>
                            <p className="text-xs text-[#6B7280] mt-1">This PDF will be used to extract pages for each shed</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {masterVoucherPdf && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setMasterVoucherPdf(null);
                          setMasterVoucherPdfName(null);
                          if (masterVoucherPdfUrl) URL.revokeObjectURL(masterVoucherPdfUrl);
                          setMasterVoucherPdfUrl(null);
                          setShowPdfPreview(false);
                        }}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2 font-bold text-sm"
                        title="Remove PDF"
                      >
                        <Trash2 className="w-5 h-5" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Step 3: Add Sheds */}
              <div className={cn(
                "grid gap-8 transition-all duration-500",
                masterVoucherPdf && showPdfPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
              )}>
                {masterVoucherPdf && showPdfPreview && (
                  <motion.section 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-4 h-[calc(100vh-120px)] sticky top-24"
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2">
                        <FileText className="text-[#0052CC] w-5 h-5" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Master Voucher Preview</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {masterVoucherPdfUrl && (
                          <a 
                            href={masterVoucherPdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-[#0052CC]/5 rounded-lg text-[#0052CC] transition-colors flex items-center gap-1.5 text-xs font-bold"
                            title="Open in New Tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Full View
                          </a>
                        )}
                        <button 
                          onClick={() => setShowPdfPreview(false)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-[calc(100%-48px)]">
                      {masterVoucherPdf && <PdfCanvasRenderer pdfData={masterVoucherPdf} />}
                    </div>
                  </motion.section>
                )}

                <section className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 h-fit">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-[#0052CC] w-5 h-5" />
                      <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Step 3: Add Consuming Sheds</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      {masterVoucherPdf && !showPdfPreview && (
                        <button
                          onClick={() => setShowPdfPreview(true)}
                          className="text-xs font-bold text-[#0052CC] hover:bg-[#0052CC]/5 px-3 py-1.5 rounded-lg border border-[#0052CC] flex items-center gap-1.5 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Show PDF
                        </button>
                      )}
                      {selectedSheds.length > 0 && (
                        <button
                          onClick={clearAllSheds}
                          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                
                <div className="relative mb-8">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search shed name or railway (e.g. PUNE, CR)..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] focus:border-transparent transition-all outline-none"
                    />
                  </div>

                  <AnimatePresence>
                    {isDropdownOpen && searchTerm && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto"
                      >
                        {filteredSheds.length > 0 ? (
                          filteredSheds.map(shed => (
                            <button
                              key={shed.id}
                              onClick={() => addShedToGeneration(shed)}
                              className="w-full px-4 py-3 text-left hover:bg-[#F3F4F6] flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <span className="font-bold text-sm">{shed.shed_name}</span>
                                <span className="text-xs text-[#6B7280] ml-2">({shed.railway})</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] group-hover:text-[#0052CC]">Add Shed</span>
                                <Plus className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0052CC]" />
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-[#6B7280] text-sm italic">
                            No sheds found matching "{searchTerm}"
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selected Sheds List */}
                <div className="space-y-4">
                  {selectedSheds.length > 0 ? (
                    selectedSheds.map((shed, index) => {
                      const calc = calculateAmounts(shed);
                      const hasPrice = !!calc;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "group relative bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all",
                            hasPrice ? "border-[#E5E7EB]" : "border-red-200 bg-red-50/10"
                          )}
                          key={shed.instanceId}
                        >
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#0052CC] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white z-10">
                            {selectedSheds.length - index}
                          </div>
                          <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-[#0052CC]/10 p-2 rounded-lg">
                                  <Building2 className="text-[#0052CC] w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg text-[#1A1A1A]">{shed.shed_name}</h3>
                                  <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">{shed.railway} Railway</p>
                                </div>
                                {!hasPrice && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
                                    <AlertCircle className="w-3 h-3" />
                                    Price Missing
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-0.5">Estimated Total</p>
                                  <p className="text-xl font-black text-[#0052CC]">
                                    {hasPrice ? `₹${Math.round(calc.total).toLocaleString('en-IN')}` : '—'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeShed(shed.instanceId)}
                                  className="p-2 text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            <div className={cn(
                              "grid gap-4",
                              masterVoucherPdf && showPdfPreview 
                                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" 
                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
                            )}>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">Power Car</label>
                                <div className="flex items-center justify-between bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 h-[42px]">
                                  <input
                                    type="checkbox"
                                    checked={shed.is_power_car}
                                    onChange={(e) => updateSelectedShed(shed.instanceId, { is_power_car: e.target.checked })}
                                    className="w-5 h-5 rounded border-[#E5E7EB] text-[#0052CC] focus:ring-[#0052CC]"
                                  />
                                  <span className="text-[10px] font-bold text-[#6B7280] uppercase">Active</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">
                                  {masterVoucherPdf ? "Voucher Pages" : "Voucher PDF"}
                                </label>
                                {masterVoucherPdf ? (
                                  <input
                                    type="text"
                                    placeholder="e.g. 1-3, 5"
                                    value={shed.voucher_pages || ''}
                                    onChange={(e) => updateSelectedShed(shed.instanceId, { voucher_pages: e.target.value })}
                                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent h-[42px]"
                                  />
                                ) : (
                                  <div className="relative h-[42px]">
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const base64 = await fileToBase64(file);
                                          updateSelectedShed(shed.instanceId, { 
                                            voucher_pdf_base64: base64,
                                            voucher_pdf_name: file.name,
                                            voucher_pdf_size: file.size.toString(),
                                            voucher_pdf_type: file.type,
                                            voucher_pdf_last_modified: file.lastModified
                                          });
                                        }
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={cn(
                                      "w-full h-full border border-[#E5E7EB] rounded-xl px-3 flex items-center justify-between transition-all",
                                      shed.voucher_pdf_base64 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-[#F9FAFB] text-[#6B7280]"
                                    )}>
                                      <span className="text-xs font-bold truncate">
                                        {shed.voucher_pdf_base64 ? "Voucher Attached" : "Click to Upload"}
                                      </span>
                                      {shed.voucher_pdf_base64 ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">Coach Litres</label>
                                <input
                                  type="number"
                                  value={shed.coach_litres}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { coach_litres: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent h-[42px]"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">Goods Litres</label>
                                <input
                                  type="number"
                                  value={shed.goods_litres}
                                  disabled={shed.is_power_car}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { goods_litres: parseFloat(e.target.value) || 0 })}
                                  className={cn(
                                    "w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent h-[42px]",
                                    shed.is_power_car && "opacity-50 cursor-not-allowed"
                                  )}
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">Supplying Shed</label>
                                <select
                                  value={shed.supplying_shed}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { supplying_shed: e.target.value })}
                                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] h-[42px]"
                                >
                                  <option value="HXP">HXP</option>
                                  <option value="WKR">WKR</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">Pricing Period</label>
                                <select
                                  value={shed.pricing_period}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { pricing_period: e.target.value as any })}
                                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] h-[42px]"
                                >
                                  {(() => {
                                    const entry = priceMaster.find(p => p.supplying_shed === shed.supplying_shed && p.month === shed.during_month && p.year === shed.during_year);
                                    return (
                                      <>
                                        <option value="p1">{entry?.periodNames?.p1 || '1st-15th'}</option>
                                        <option value="p2">{entry?.periodNames?.p2 || '16th-End'}</option>
                                        <option value="average">Average</option>
                                      </>
                                    );
                                  })()}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">For Month</label>
                                <select
                                  value={shed.for_month}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { for_month: e.target.value })}
                                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] h-[42px]"
                                >
                                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">For Year</label>
                                <select
                                  value={shed.for_year}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { for_year: e.target.value })}
                                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] h-[42px]"
                                >
                                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">During Month</label>
                                <select
                                  value={shed.during_month}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { during_month: e.target.value })}
                                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] h-[42px]"
                                >
                                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#6B7280] uppercase ml-1 block min-h-[12px]">During Year</label>
                                <select
                                  value={shed.during_year}
                                  onChange={(e) => updateSelectedShed(shed.instanceId, { during_year: e.target.value })}
                                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0052CC] h-[42px]"
                                >
                                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl py-12 flex flex-col items-center justify-center text-[#9CA3AF]">
                      <Building2 className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">No sheds added yet. Search above to begin.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

              {/* Step 4: Generate */}
              <section className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="text-[#0052CC] w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Step 4: Final Review & Generate</h2>
                </div>

                {/* DSC Digital Signature Panel */}
                <div className={`mb-6 rounded-xl border-2 transition-colors ${dscEnabled ? 'border-[#0052CC]/30 bg-[#F0F5FF]' : 'border-[#E5E7EB] bg-[#F9FAFB]'}`}>
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dscEnabled ? 'bg-[#0052CC]' : 'bg-[#E5E7EB]'}`}>
                        <KeyRound className={`w-5 h-5 ${dscEnabled ? 'text-white' : 'text-[#9CA3AF]'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1A1A1A]">DSC Digital Signature</p>
                        <p className="text-[11px] text-[#6B7280]">Sign all pages via emBridge or DSC Signer Service v4.1</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => { setDscEnabled(e => !e); setLastSigningReport(null); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${dscEnabled ? 'bg-[#0052CC]' : 'bg-[#D1D5DB]'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${dscEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Panel Body (visible when enabled) */}
                  <AnimatePresence>
                    {dscEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-4 border-t border-[#0052CC]/15">
                          {/* Service Config Row */}
                          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Service Type</label>
                              <select
                                value={dscServiceType}
                                onChange={e => {
                                  const t = e.target.value as typeof dscServiceType;
                                  setDscServiceType(t);
                                  setDscStatus('idle');
                                  // Set default port based on service
                                  if (t === 'embridge') setDscPort('26769');
                                  else if (t === 'dscsigner') setDscPort('55101');
                                  else setDscPort('55101');
                                }}
                                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                              >
                                <option value="auto">Auto-detect (port 55101)</option>
                                <option value="embridge">emBridge eMudhra (port 26769)</option>
                                <option value="dscsigner">DSC Signer Service v4.1 (port 55101)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Protocol</label>
                              <select
                                value={dscProtocol}
                                onChange={e => { setDscProtocol(e.target.value as 'https' | 'http'); setDscStatus('idle'); }}
                                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                              >
                                <option value="https">HTTPS (default)</option>
                                <option value="http">HTTP (port 55100)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                                Port
                                <span className="ml-1 text-[#9CA3AF] font-normal normal-case">
                                  (DSC Signer: 55101 · emBridge: 26769)
                                </span>
                              </label>
                              <input
                                type="number"
                                value={dscPort}
                                onChange={e => { setDscPort(e.target.value); setDscStatus('idle'); }}
                                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                                placeholder="55101"
                              />
                            </div>
                          </div>

                          {/* Test Connection + Status */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={testDscConnection}
                              disabled={dscStatus === 'testing'}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#0052CC] text-[#0052CC] rounded-lg text-sm font-bold hover:bg-[#0052CC]/5 transition-colors disabled:opacity-50"
                            >
                              {dscStatus === 'testing'
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <RefreshCw className="w-4 h-4" />}
                              {dscStatus === 'testing' ? 'Testing…' : 'Test Connection'}
                            </button>

                            {dscStatus !== 'idle' && (
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                                dscStatus === 'online'  ? 'bg-green-50 text-green-700 border border-green-200' :
                                dscStatus === 'offline' ? 'bg-red-50 text-red-700 border border-red-200' :
                                'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {dscStatus === 'online'  && <ShieldCheck className="w-4 h-4" />}
                                {dscStatus === 'offline' && <ShieldOff className="w-4 h-4" />}
                                {dscStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>{dscStatusMessage}</span>
                              </div>
                            )}
                          </div>

                          {/* Info note */}
                          <div className="flex gap-2 bg-[#FFFBEB] border border-[#FCD34D]/40 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-amber-700 space-y-1">
                              <p className="font-bold">Before using — checklist:</p>
                              <p>1. Insert your USB DSC dongle and ensure emBridge or DSC Signer Service v4.1 is running (check Windows system tray).</p>
                              <p>2. If using HTTPS, open <span className="font-mono font-bold">{dscProtocol}://127.0.0.1:{dscPort}</span> in your browser, click "Advanced → Proceed" to trust the self-signed certificate. Do this once per session.</p>
                              <p>3. Use "Test Connection" to verify the service is reachable before generating.</p>
                              <p>4. Signature stamp will be applied to the <strong>bottom-right corner of every page</strong>. If signing fails, the unsigned PDF is included in the ZIP (no data is lost).</p>
                              <p className="text-amber-600">Port reference: DSC Signer Service v4.1 = <strong>55101</strong> (HTTPS) or 55100 (HTTP) · emBridge eMudhra = <strong>26769</strong></p>
                            </div>
                          </div>

                          {/* Signing progress (live during generation) */}
                          {signingProgress && (
                            <div className="flex items-center gap-3 bg-[#EFF6FF] border border-[#93C5FD] rounded-lg px-4 py-3">
                              <Loader2 className="w-4 h-4 text-[#0052CC] animate-spin shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#0052CC]">
                                  Signing {signingProgress.current} / {signingProgress.total}
                                </p>
                                <p className="text-[11px] text-[#6B7280] truncate">{signingProgress.name}</p>
                              </div>
                              <div className="w-24 bg-[#DBEAFE] rounded-full h-1.5">
                                <div
                                  className="bg-[#0052CC] h-1.5 rounded-full transition-all"
                                  style={{ width: `${(signingProgress.current / signingProgress.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Last signing report */}
                          {lastSigningReport && !signingProgress && (
                            <div className={`flex items-center gap-3 rounded-lg px-4 py-3 border text-sm ${
                              lastSigningReport.failed > 0
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-green-50 border-green-200 text-green-800'
                            }`}>
                              {lastSigningReport.failed > 0 ? <AlertCircle className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
                              <span>
                                Last run: <strong>{lastSigningReport.signed} signed</strong>
                                {lastSigningReport.failed > 0 && <span className="text-red-600">, {lastSigningReport.failed} failed (unsigned included)</span>}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Generation Buttons */}
                <div className="flex justify-end gap-4">
                  <button
                    disabled={selectedSheds.length === 0 || selectedSheds.some(s => !calculateAmounts(s)) || isGenerating}
                    onClick={generateCertificatesOnlyZip}
                    className="bg-white border-2 border-[#0052CC] text-[#0052CC] disabled:border-[#E5E7EB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed px-6 py-4 rounded-2xl font-bold text-base shadow-sm hover:bg-[#0052CC]/5 transition-all flex items-center gap-3 active:scale-95"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#0052CC]/30 border-t-[#0052CC] rounded-full animate-spin" />
                        {signingProgress ? `Signing ${signingProgress.current}/${signingProgress.total}…` : 'Generating…'}
                      </>
                    ) : (
                      <>
                        {dscEnabled ? <Shield className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        Download Certificates Only
                      </>
                    )}
                  </button>

                  <button
                    disabled={selectedSheds.length === 0 || selectedSheds.some(s => !calculateAmounts(s)) || isGenerating}
                    onClick={generateCertificatesZip}
                    className="bg-[#0052CC] disabled:bg-[#E5E7EB] disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#0052CC]/20 hover:shadow-xl hover:shadow-[#0052CC]/30 transition-all flex items-center gap-3 active:scale-95"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {signingProgress ? `Signing ${signingProgress.current}/${signingProgress.total}…` : 'Generating ZIP…'}
                      </>
                    ) : (
                      <>
                        {dscEnabled ? <ShieldCheck className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                        Generate Full ZIP (with Vouchers)
                      </>
                    )}
                  </button>
                </div>
              </section>
            </motion.div>
          ) : activeTab === 'prices' ? (
            <motion.div
              key="prices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Plus className="text-[#0052CC] w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Add New Price Entry</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase">Month</label>
                    <select
                      value={newPriceEntry.month}
                      onChange={(e) => setNewPriceEntry({ ...newPriceEntry, month: e.target.value })}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                    >
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase">Year</label>
                    <select
                      value={newPriceEntry.year}
                      onChange={(e) => setNewPriceEntry({ ...newPriceEntry, year: e.target.value })}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase">Supplying Shed</label>
                    <select
                      value={newPriceEntry.supplying_shed}
                      onChange={(e) => setNewPriceEntry({ ...newPriceEntry, supplying_shed: e.target.value })}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                    >
                      <option value="HXP">HXP</option>
                      <option value="WKR">WKR</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addPriceEntry}
                      className="w-full bg-[#0052CC] text-white rounded-lg py-2 text-sm font-bold hover:bg-[#0747A6] transition-colors"
                    >
                      Add Entry
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
                <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="text-[#0052CC] w-5 h-5" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Price Master Management</h2>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F9FAFB] text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 border-b border-[#E5E7EB]">Period Info</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB]">Pricing Period</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-right">Base Price</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-right">Excise</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-right">VAT</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-right">Overhead</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-right">Total Rate</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-center">PDFs</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {sortedPriceMaster.map((entry) => (
                        <React.Fragment key={entry.id}>
                          {(Object.entries(entry.periods) as [string, PriceData][]).map(([period, data], pIdx) => {
                            const total = data.base_price + data.excise + data.vat + data.overhead;
                            return (
                              <tr key={period} className="hover:bg-[#F9FAFB] transition-colors group">
                                {pIdx === 0 && (
                                  <td rowSpan={3} className="px-6 py-4 font-black text-[#1A1A1A] bg-white border-r border-[#E5E7EB]">
                                    <div className="flex flex-col">
                                      <span className="text-[#0052CC]">{entry.supplying_shed}</span>
                                      <span className="text-[10px] text-[#6B7280]">{entry.month} {entry.year}</span>
                                    </div>
                                  </td>
                                )}
                                <td className="px-6 py-4 font-semibold text-[#6B7280]">
                                  {period === 'average' ? 'Average' : (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={entry.periodNames[period as 'p1' | 'p2']}
                                        onChange={(e) => updatePeriodName(entry.id, period as 'p1' | 'p2', e.target.value)}
                                        className="w-24 bg-transparent border-b border-transparent hover:border-[#E5E7EB] focus:border-[#0052CC] focus:ring-0 p-1 outline-none transition-all text-sm font-semibold"
                                      />
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right font-mono">
                                  <input
                                    type="number"
                                    value={data.base_price}
                                    disabled={period === 'average'}
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      updatePriceEntry(entry.id, period, { ...data, base_price: newVal });
                                    }}
                                    className={cn(
                                      "w-24 text-right bg-transparent border-b border-transparent hover:border-[#E5E7EB] focus:border-[#0052CC] focus:ring-0 p-1 outline-none transition-all",
                                      period === 'average' && "opacity-50 cursor-not-allowed"
                                    )}
                                  />
                                </td>
                                <td className="px-6 py-4 text-right font-mono">
                                  <input
                                    type="number"
                                    value={data.excise}
                                    disabled={period === 'average'}
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      updatePriceEntry(entry.id, period, { ...data, excise: newVal });
                                    }}
                                    className={cn(
                                      "w-24 text-right bg-transparent border-b border-transparent hover:border-[#E5E7EB] focus:border-[#0052CC] focus:ring-0 p-1 outline-none transition-all",
                                      period === 'average' && "opacity-50 cursor-not-allowed"
                                    )}
                                  />
                                </td>
                                <td className="px-6 py-4 text-right font-mono">
                                  <input
                                    type="number"
                                    value={data.vat}
                                    disabled={period === 'average'}
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      updatePriceEntry(entry.id, period, { ...data, vat: newVal });
                                    }}
                                    className={cn(
                                      "w-24 text-right bg-transparent border-b border-transparent hover:border-[#E5E7EB] focus:border-[#0052CC] focus:ring-0 p-1 outline-none transition-all",
                                      period === 'average' && "opacity-50 cursor-not-allowed"
                                    )}
                                  />
                                </td>
                                <td className="px-6 py-4 text-right font-mono">
                                  <input
                                    type="number"
                                    value={data.overhead}
                                    disabled={period === 'average'}
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      updatePriceEntry(entry.id, period, { ...data, overhead: newVal });
                                    }}
                                    className={cn(
                                      "w-24 text-right bg-transparent border-b border-transparent hover:border-[#E5E7EB] focus:border-[#0052CC] focus:ring-0 p-1 outline-none transition-all",
                                      period === 'average' && "opacity-50 cursor-not-allowed"
                                    )}
                                  />
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-[#0052CC] font-mono">
                                  {total.toLocaleString('en-IN')}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    {period !== 'average' ? (
                                      <div className="flex items-center gap-2">
                                        <div className="relative">
                                          <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                const base64 = await fileToBase64(file);
                                                updatePriceEntry(entry.id, period, { ...data, pdf_base64: base64 });
                                              }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          />
                                          <button className={cn(
                                            "p-2 rounded-lg transition-all flex items-center gap-2 border",
                                            data.pdf_base64 
                                              ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                                              : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                                          )}>
                                            <FileText className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase">
                                              {data.pdf_base64 ? "Update" : "Upload"}
                                            </span>
                                          </button>
                                        </div>
                                        {data.pdf_base64 && (
                                          <button
                                            onClick={() => {
                                              const win = window.open();
                                              if (win) {
                                                win.document.write(`<iframe src="${data.pdf_base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                              }
                                            }}
                                            className="p-2 bg-[#0052CC]/10 text-[#0052CC] rounded-lg hover:bg-[#0052CC]/20 transition-all flex items-center gap-2 border border-[#0052CC]/20"
                                            title="View stored file"
                                          >
                                            <Search className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase">View</span>
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        {entry.periods.p1.pdf_base64 && entry.periods.p2.pdf_base64 ? (
                                          <button
                                            onClick={async () => {
                                              try {
                                                const mergedPdf = await PDFDocument.create();
                                                const pdf1 = entry.periods.p1.pdf_base64!;
                                                const pdf2 = entry.periods.p2.pdf_base64!;
                                                
                                                const p1Bytes = Uint8Array.from(atob(pdf1.split(',')[1]), c => c.charCodeAt(0));
                                                const p2Bytes = Uint8Array.from(atob(pdf2.split(',')[1]), c => c.charCodeAt(0));
                                                
                                                const doc1 = await PDFDocument.load(p1Bytes);
                                                const doc2 = await PDFDocument.load(p2Bytes);
                                                
                                                const pages1 = await mergedPdf.copyPages(doc1, doc1.getPageIndices());
                                                const pages2 = await mergedPdf.copyPages(doc2, doc2.getPageIndices());
                                                
                                                pages1.forEach(p => mergedPdf.addPage(p));
                                                pages2.forEach(p => mergedPdf.addPage(p));
                                                
                                                const mergedBytes = await mergedPdf.save();
                                                const blob = new Blob([mergedBytes], { type: 'application/pdf' });
                                                const url = URL.createObjectURL(blob);
                                                const win = window.open();
                                                if (win) {
                                                  win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                }
                                              } catch (e) {
                                                console.error('Error merging PDFs for view:', e);
                                                alert('Error merging PDFs for preview.');
                                              }
                                            }}
                                            className="flex items-center gap-2 p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-[10px] font-bold uppercase border border-indigo-200"
                                          >
                                            <FileText className="w-4 h-4" />
                                            View Merged
                                          </button>
                                        ) : (
                                          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Pending Uploads
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                                {pIdx === 0 && (
                                  <td rowSpan={3} className="px-6 py-4 text-right border-l border-[#E5E7EB] bg-white relative z-10">
                                    <div className="flex flex-col items-end gap-2">
                                      {deletingPriceId === entry.id ? (
                                        <div className="flex items-center gap-2 bg-red-50 p-2 rounded-xl border border-red-100">
                                          <span className="text-[10px] font-bold text-red-600 uppercase">Confirm?</span>
                                          <button
                                            onClick={() => {
                                              deletePriceEntry(entry.id);
                                              setDeletingPriceId(null);
                                            }}
                                            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => setDeletingPriceId(null)}
                                            className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-all"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDeletingPriceId(entry.id);
                                          }}
                                          className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center gap-2 group/del cursor-pointer relative z-20"
                                          title="Delete entire entry"
                                        >
                                          <span className="text-[10px] font-bold uppercase hidden group-hover/del:inline">Delete Entry</span>
                                          <Trash2 className="w-5 h-5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-6 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                  <p className="text-xs font-medium text-[#6B7280]">Changes are saved locally for the current session. Ensure all rates are accurate before generating certificates.</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sheds"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Building2 className="text-[#0052CC] w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Add New Shed to Master</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase">Shed Name</label>
                    <input
                      type="text"
                      value={newShed.shed_name || ''}
                      onChange={(e) => setNewShed({ ...newShed, shed_name: e.target.value.toUpperCase() })}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase">Railway</label>
                    <input
                      type="text"
                      value={newShed.railway || ''}
                      onChange={(e) => setNewShed({ ...newShed, railway: e.target.value.toUpperCase() })}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#0052CC]"
                    />
                  </div>
                  <div className="flex items-end md:col-span-2">
                    <button
                      onClick={async () => {
                        if (newShed.shed_name && newShed.railway) {
                          const shed: ShedMasterEntry = { 
                            ...newShed, 
                            id: `shed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` 
                          } as ShedMasterEntry;
                          try {
                            await fetch('/api/sheds', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(shed)
                            });
                            setShedMaster([...shedMaster, shed]);
                            setNewShed({ railway: 'WR' });
                          } catch (error) {
                            console.error('Error adding shed:', error);
                          }
                        }
                      }}
                      className="w-full bg-[#0052CC] text-white rounded-lg py-2 text-sm font-bold hover:bg-[#0747A6] transition-colors"
                    >
                      Add to Master
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
                <div className="p-6 border-b border-[#E5E7EB]">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Persistent Shed Master List</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F9FAFB] text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 border-b border-[#E5E7EB]">Shed Name</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB]">Railway</th>
                        <th className="px-6 py-4 border-b border-[#E5E7EB] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {shedMaster.map((shed) => (
                        <tr key={shed.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-6 py-4 font-bold">{shed.shed_name}</td>
                          <td className="px-6 py-4">{shed.railway}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  await fetch(`/api/sheds/${shed.id}`, { method: 'DELETE' });
                                  setShedMaster(shedMaster.filter(s => s.id !== shed.id));
                                } catch (error) {
                                  console.error('Error deleting shed:', error);
                                }
                              }}
                              className="p-2 text-[#9CA3AF] hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#E5E7EB] mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-40 grayscale">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Rajkot Division Finance Office</span>
          </div>
          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.2em]">
            Internal Use Only • Western Railway • © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
