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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import forge from 'node-forge';

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
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signatoryName, setSignatoryName] = useState('Divisional Finance Manager');
  const [signatoryDesignation, setSignatoryDesignation] = useState('Western Railway, Rajkot');
  const [applySignature, setApplySignature] = useState(false);
  const [signatureType, setSignatureType] = useState<'visual' | 'digital' | 'usb'>('visual');
  const [pfxFile, setPfxFile] = useState<string | null>(null);
  const [localSignerPort, setLocalSignerPort] = useState('55101');
  const [localSignerProtocol, setLocalSignerProtocol] = useState<'http' | 'https'>('https');
  const [signerStatus, setSignerStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');
  const [signerLog, setSignerLog] = useState<string[]>([]);
  const [pfxPassword, setPfxPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const signPdf = async (pdfBytes: Uint8Array): Promise<Uint8Array> => {
    if (!applySignature || !signatureType) return pdfBytes;

    if (signatureType === 'usb') {
      const addLog = (msg: string) => setSignerLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
      addLog(`Attempting USB sign on port ${localSignerPort}...`);

      try {
        // More robust base64 conversion
        const binary = Array.from(pdfBytes).map(b => String.fromCharCode(b)).join('');
        const base64Pdf = btoa(binary);
        
        const baseUrl = `${localSignerProtocol}://127.0.0.1:${localSignerPort}`;
        
        // Try common endpoints in order
        const endpoints = ['/sign', '/signPdf', '/process', '/api/sign'];
        let lastError = '';

        for (const endpoint of endpoints) {
          try {
            addLog(`Trying endpoint: ${endpoint}...`);
            
            // EXTREME SIMPLE REQUEST: No custom headers at all
            // This is the only way to truly avoid the OPTIONS preflight in some browsers
            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: 'POST',
              // No headers here - defaults to text/plain or similar
              body: JSON.stringify({
                pdfData: base64Pdf,
                data: base64Pdf,
                signatoryName,
                reason: 'HSD Oil Cost Certificate'
              }),
              signal: AbortSignal.timeout(15000)
            });

            if (response.ok) {
              const result = await response.json();
              const signedData = result.signedPdfData || result.data || result.signedData;
              
              if (signedData) {
                addLog(`Success! Signature received from ${endpoint}`);
                const signedBinary = atob(signedData);
                const signedBytes = new Uint8Array(signedBinary.length);
                for (let i = 0; i < signedBinary.length; i++) {
                  signedBytes[i] = signedBinary.charCodeAt(i);
                }
                return signedBytes;
              }
            } else {
              addLog(`Endpoint ${endpoint} returned status ${response.status}`);
            }
          } catch (e: any) {
            lastError = e.message;
            addLog(`Endpoint ${endpoint} failed: ${e.message}`);
          }
        }

        throw new Error(`All signing endpoints failed. Last error: ${lastError}`);
      } catch (e: any) {
        addLog(`USB Signing Error: ${e.message}`);
        console.warn('USB signing failed. Falling back to visual stamp.', e);
        return pdfBytes;
      }
    }

    if (signatureType !== 'digital' || !pfxFile || !pfxPassword) {
      return pdfBytes;
    }

    try {
      const pfxDer = forge.util.decode64(pfxFile.split(',')[1]);
      const pfxAsn1 = forge.asn1.fromDer(pfxDer);
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, pfxPassword);

      // Get private key and certificate
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      
      const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
      const certificate = certBags[forge.pki.oids.certBag]?.[0]?.cert;

      if (!privateKey || !certificate) {
        throw new Error('Could not find private key or certificate in PFX');
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width } = firstPage.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const sigWidth = 200;
      const sigHeight = 60;
      const x = width - sigWidth - 20;
      const y = 40;

      // Draw signature box
      firstPage.drawRectangle({
        x, y, width: sigWidth, height: sigHeight,
        borderColor: rgb(0, 0.32, 0.8),
        borderWidth: 1,
        color: rgb(0.95, 0.97, 1),
      });

      firstPage.drawText('DIGITALLY SIGNED', {
        x: x + 10, y: y + sigHeight - 15,
        size: 10, font: boldFont, color: rgb(0, 0.32, 0.8),
      });

      const commonName = certificate.subject.getField('CN')?.value || signatoryName;
      const issuer = certificate.issuer.getField('CN')?.value || 'Unknown Issuer';
      const now = new Date().toLocaleString('en-IN');

      firstPage.drawText(`Signed by: ${commonName}`, {
        x: x + 10, y: y + sigHeight - 30,
        size: 8, font, color: rgb(0.2, 0.2, 0.2),
      });

      firstPage.drawText(`Issuer: ${issuer}`, {
        x: x + 10, y: y + sigHeight - 42,
        size: 7, font, color: rgb(0.4, 0.4, 0.4),
      });

      firstPage.drawText(`Date: ${now}`, {
        x: x + 10, y: y + sigHeight - 54,
        size: 7, font, color: rgb(0.4, 0.4, 0.4),
      });

      return await pdfDoc.save();
    } catch (e: any) {
      console.error('Digital signing error:', e);
      throw new Error(`Digital signing failed: ${e.message || 'Unknown error'}. Please check your password.`);
    }
  };

  const testSignerConnection = async () => {
    setSignerStatus('testing');
    try {
      const baseUrl = `${localSignerProtocol}://127.0.0.1:${localSignerPort}`;
      // Try common health check endpoints
      const endpoints = ['/check/isLive', '/isLive', '/status', '/'];
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${baseUrl}${endpoint}`, { mode: 'no-cors' });
          // If we get any response (even no-cors opaque), it means service is listening
          success = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      setSignerStatus(success ? 'online' : 'offline');
    } catch (e) {
      setSignerStatus('offline');
    }
  };

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
    const zip = new JSZip();

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
        doc.text(`For, ${signatoryName},`, 195, lastY + 25, { align: 'right' });
        doc.text(signatoryDesignation, 195, lastY + 30, { align: 'right' });

        if (applySignature) {
          if (signatureImage) {
            try {
              doc.addImage(signatureImage, 'PNG', 150, lastY + 5, 40, 15);
            } catch (e) {
              console.error('Error adding signature image:', e);
            }
          }
          
          // Add "Digitally Signed" stamp
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          const now = new Date().toLocaleString('en-IN');
          doc.text(`Digitally signed by ${signatoryName}`, 195, lastY + 35, { align: 'right' });
          doc.text(`Date: ${now}`, 195, lastY + 38, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
        }

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
        let finalCertPdfBytes = new Uint8Array(certPdfBytes);

        if (applySignature) {
          try {
            finalCertPdfBytes = await signPdf(finalCertPdfBytes);
          } catch (e: any) {
            alert(e.message);
            setIsGenerating(false);
            return;
          }
        }

        const fileName = `${shed.shed_name}_${shed.railway}_RS_${Math.round(calc.total)}_${shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)}_LITRES_${shed.during_month}${shed.during_year}.pdf`;
        zip.file(fileName, finalCertPdfBytes);
      }

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
    }
  };

  const clearAllSheds = () => {
    if (window.confirm('Are you sure you want to clear all added sheds?')) {
      setSelectedSheds([]);
    }
  };

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
    const zip = new JSZip();

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
        doc.text(`For, ${signatoryName},`, 195, lastY + 25, { align: 'right' });
        doc.text(signatoryDesignation, 195, lastY + 30, { align: 'right' });

        if (applySignature) {
          if (signatureImage) {
            try {
              doc.addImage(signatureImage, 'PNG', 150, lastY + 5, 40, 15);
            } catch (e) {
              console.error('Error adding signature image:', e);
            }
          }
          
          // Add "Digitally Signed" stamp
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          const now = new Date().toLocaleString('en-IN');
          doc.text(`Digitally signed by ${signatoryName}`, 195, lastY + 35, { align: 'right' });
          doc.text(`Date: ${now}`, 195, lastY + 38, { align: 'right' });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
        }

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
        let finalCertPdfBytes = new Uint8Array(certPdfBytes);

        if (applySignature) {
          try {
            finalCertPdfBytes = await signPdf(finalCertPdfBytes);
          } catch (e: any) {
            alert(e.message);
            setIsGenerating(false);
            return;
          }
        }
        
        // 2. Merge with Voucher and Pricing PDF
        const mergedPdf = await PDFDocument.create();
        const certPdfDoc = await PDFDocument.load(finalCertPdfBytes);
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

        const finalPdfBytes = await mergedPdf.save();
        const fileName = `${shed.shed_name}_${shed.railway}_RS_${Math.round(calc.total)}_${shed.coach_litres + (shed.is_power_car ? 0 : shed.goods_litres)}_LITRES_${shed.during_month}${shed.during_year}.pdf`;
        zip.file(fileName, finalPdfBytes);
      }

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

              {/* Step 4: Digital Signature */}
              <section className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Settings className="text-[#0052CC] w-5 h-5" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Step 4: Signature Settings</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#6B7280]">Apply Signature</span>
                    <button
                      onClick={() => setApplySignature(!applySignature)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        applySignature ? "bg-[#0052CC]" : "bg-gray-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        applySignature ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                {applySignature && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex gap-4 p-1 bg-[#F3F4F6] rounded-xl w-fit">
                      <button
                        onClick={() => setSignatureType('visual')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          signatureType === 'visual' ? "bg-white shadow-sm text-[#0052CC]" : "text-[#6B7280] hover:text-[#4B5563]"
                        )}
                      >
                        Visual Stamp
                      </button>
                      <button
                        onClick={() => setSignatureType('digital')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          signatureType === 'digital' ? "bg-white shadow-sm text-[#0052CC]" : "text-[#6B7280] hover:text-[#4B5563]"
                        )}
                      >
                        Digital Key (PFX)
                      </button>
                      <button
                        onClick={() => setSignatureType('usb')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                          signatureType === 'usb' ? "bg-white shadow-sm text-[#0052CC]" : "text-[#6B7280] hover:text-[#4B5563]"
                        )}
                      >
                        USB Token (Local)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Signatory Name</label>
                        <input
                          type="text"
                          value={signatoryName}
                          onChange={(e) => setSignatoryName(e.target.value)}
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Designation/Office</label>
                        <input
                          type="text"
                          value={signatoryDesignation}
                          onChange={(e) => setSignatoryDesignation(e.target.value)}
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] outline-none"
                        />
                      </div>

                      {signatureType === 'visual' ? (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Signature Image (Optional)</label>
                          <div className="relative h-[46px]">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const base64 = await fileToBase64(file);
                                  setSignatureImage(base64);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={cn(
                              "w-full h-full border border-[#E5E7EB] rounded-xl px-4 flex items-center justify-between transition-all",
                              signatureImage ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-[#F9FAFB] text-[#6B7280]"
                            )}>
                              <span className="text-xs font-bold truncate">
                                {signatureImage ? "Signature Uploaded" : "Upload PNG/JPG"}
                              </span>
                              {signatureImage ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>
                      ) : signatureType === 'digital' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-1">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">PFX/P12 File</label>
                            <div className="relative h-[46px]">
                              <input
                                type="file"
                                accept=".pfx,.p12"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const base64 = await fileToBase64(file);
                                    setPfxFile(base64);
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className={cn(
                                "w-full h-full border border-[#E5E7EB] rounded-xl px-4 flex items-center justify-between transition-all",
                                pfxFile ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-[#F9FAFB] text-[#6B7280]"
                              )}>
                                <span className="text-xs font-bold truncate">
                                  {pfxFile ? "Key Loaded" : "Upload Key"}
                                </span>
                                {pfxFile ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Key Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={pfxPassword}
                                onChange={(e) => setPfxPassword(e.target.value)}
                                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] outline-none pr-10"
                                placeholder="Enter password"
                              />
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-1 md:col-span-2">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Protocol</label>
                            <select
                              value={localSignerProtocol}
                              onChange={(e) => setLocalSignerProtocol(e.target.value as 'http' | 'https')}
                              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] outline-none"
                            >
                              <option value="https">HTTPS (Secure)</option>
                              <option value="http">HTTP (Standard)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[#6B7280] uppercase ml-1">Local Signer Port</label>
                            <select
                              value={localSignerPort}
                              onChange={(e) => setLocalSignerPort(e.target.value)}
                              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#0052CC] outline-none"
                            >
                              <optgroup label="DSC Signer Service">
                                <option value="55103">55103 (v7.x HTTPS)</option>
                                <option value="55101">55101 (v4.x HTTPS)</option>
                                <option value="55100">55100 (v4.x HTTP)</option>
                              </optgroup>
                              <optgroup label="Other Utilities">
                                <option value="60015">60015 (EPFO)</option>
                                <option value="1585">1585 (GST emSigner)</option>
                                <option value="1620">1620 (Capricorn)</option>
                              </optgroup>
                              <optgroup label="Common Ports">
                                <option value="8080">8080</option>
                                <option value="5500">5500</option>
                              </optgroup>
                            </select>
                          </div>
                          <div className="space-y-2 flex flex-col justify-end">
                            <button
                              onClick={testSignerConnection}
                              disabled={signerStatus === 'testing'}
                              className={cn(
                                "w-full h-[46px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                signerStatus === 'online' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                signerStatus === 'offline' ? "bg-red-50 text-red-700 border border-red-200" :
                                "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-200"
                              )}
                            >
                              {signerStatus === 'testing' ? (
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                              ) : signerStatus === 'online' ? (
                                <><Check className="w-4 h-4" /> Service Online</>
                              ) : signerStatus === 'offline' ? (
                                <><AlertCircle className="w-4 h-4" /> Service Offline</>
                              ) : (
                                "Test Connection"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {signatureType === 'usb' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                          <ExternalLink className="w-5 h-5 text-blue-500 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-800">USB Token Mode Active</p>
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                              Ensure your <strong>Hypersecu USB Token</strong> is plugged in and your <strong>Local Signer Service</strong> (e.g., e-Mudhra) is running on your PC. 
                              When you click generate, the app will send the PDFs to your local service for signing.
                            </p>
                          </div>
                        </div>

                        {signerStatus === 'offline' && (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                            <div className="flex gap-3">
                              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-red-800">Service Offline? (Troubleshooting)</p>
                                <p className="text-[11px] text-red-700 leading-relaxed">
                                  Your browser is blocking the connection to your local computer (Loopback Address Space). 
                                  This is a common security feature. Follow these steps:
                                </p>
                              </div>
                            </div>
                            <div className="pl-8 space-y-3">
                              <div className="bg-white/50 rounded-lg p-3 border border-red-100">
                                <p className="text-[11px] font-bold text-red-900 mb-1">Solution 2: Fix CORS Block (Required for USB)</p>
                                <p className="text-[10px] text-red-700 mb-2">
                                  Your local signer doesn't allow external connections. You must use a browser extension to bypass this:
                                </p>
                                <a 
                                  href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafcepgpndghajponhgebcbdonpfe"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0052CC] text-white rounded-lg text-[10px] font-bold hover:bg-[#0747A6] transition-all"
                                >
                                  Install "Allow CORS" Extension
                                </a>
                              </div>

                              <ol className="text-[11px] text-red-700 list-decimal space-y-1">
                                <li>Click <strong>"Authorize Service"</strong> to accept the SSL certificate in a new tab.</li>
                                <li>If it shows "Live" there, return here and click <strong>"Force Online"</strong>.</li>
                                <li>The "Test Connection" button may stay red due to browser security, but <strong>Force Online</strong> will allow you to proceed.</li>
                              </ol>
                              <div className="flex gap-3 pt-1">
                                <a 
                                  href={`${localSignerProtocol}://127.0.0.1:${localSignerPort}/check/isLive`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-50 transition-all"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Authorize Service
                                </a>
                                <button
                                  onClick={() => setSignerStatus('online')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-50 transition-all"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Force Online
                                </button>
                              </div>
                            </div>

                            <div className="bg-white/50 rounded-lg p-3 border border-red-100 mt-3">
                              <p className="text-[11px] font-bold text-red-900 mb-1">Solution 3: Offline Signing (Most Reliable)</p>
                              <p className="text-[10px] text-red-700 mb-2">
                                If the browser bridge keeps failing, download the unsigned certificates and use your desktop signing tool.
                              </p>
                              <button
                                onClick={() => {
                                  setApplySignature(false);
                                  setActiveTab('generate');
                                  alert("Signature disabled. You can now generate the ZIP and sign it using your desktop software.");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-[10px] font-bold hover:bg-black transition-all"
                              >
                                <Download className="w-3 h-3" />
                                Use Offline Signing Mode
                              </button>
                            </div>
                            
                            {signerLog.length > 0 && (
                              <div className="mt-3 bg-black/5 rounded-lg p-3 space-y-1">
                                <p className="text-[10px] font-bold text-red-800 uppercase opacity-60">Signer Debug Log</p>
                                {signerLog.map((log, i) => (
                                  <p key={i} className="text-[9px] font-mono text-red-700 leading-tight">
                                    {log}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </section>

              {/* Step 5: Generate */}
              <section className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="text-[#0052CC] w-5 h-5" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Step 5: Final Review & Generate</h2>
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    disabled={selectedSheds.length === 0 || selectedSheds.some(s => !calculateAmounts(s)) || isGenerating}
                    onClick={generateCertificatesOnlyZip}
                    className="bg-white border-2 border-[#0052CC] text-[#0052CC] disabled:border-[#E5E7EB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed px-6 py-4 rounded-2xl font-bold text-base shadow-sm hover:bg-[#0052CC]/5 transition-all flex items-center gap-3 active:scale-95"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#0052CC]/30 border-t-[#0052CC] rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
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
                        Generating ZIP...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
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
