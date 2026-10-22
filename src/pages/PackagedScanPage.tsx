import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Barcode,
  Camera,
  FileText,
  Loader2,
  Scan,
  Sparkles,
  Upload,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Footer } from '@/components/layout/Footer';
import type { PackagedAnalysis } from '@/types/nutrition';
import {
  fetchProductByBarcode,
  isValidBarcode,
  mapLabelDataToAnalysis,
} from '@/lib/openFoodFacts';
import {
  analyzeLabelWithGemini,
  parseNutritionTextWithGemini,
  parseLabelTextLocally,
} from '@/lib/gemini';

interface PackagedScanPageProps {
  setPage: (page: string) => void;
  onAnalysisComplete: (result: PackagedAnalysis) => void;
}

// Famous reference barcodes for instant 1-click testing
const POPULAR_SAMPLES = [
  { name: 'Kurkure Masala Munch', barcode: '8901491100519' },
  { name: 'Nutella Hazelnut Spread', barcode: '3017620422003' },
  { name: 'Oreo Original Cookies', barcode: '7622210449283' },
  { name: 'Coca-Cola Original', barcode: '5449000000996' },
];

export function PackagedScanPage({
  setPage,
  onAnalysisComplete,
}: PackagedScanPageProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'barcode' | 'camera' | 'label'>('barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);

  // Fallback Label Tab state
  const [pastedText, setPastedText] = useState('');
  const [labelPhotoPreview, setLabelPhotoPreview] = useState<string | null>(null);
  const labelFileInputRef = useRef<HTMLInputElement>(null);
  const labelCameraInputRef = useRef<HTMLInputElement>(null);

  // Camera scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<{ reset: () => void } | null>(null);


  const checkAuth = (): boolean => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to scan packaged food items and track your nutrition.',
        variant: 'destructive',
      });
      setPage('signin');
      return false;
    }
    return true;
  };

  // ── 1. Lookup by Barcode (Open Food Facts) ──────────────────────────────────
  const handleBarcodeLookup = async (codeToSearch?: string) => {
    if (!checkAuth()) return;
    const code = (codeToSearch || barcodeInput).trim().replace(/\D/g, '');

    if (!isValidBarcode(code)) {
      toast({
        title: 'Invalid barcode',
        description: 'Please enter a valid numeric barcode between 8 and 14 digits (EAN/UPC).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setNotFoundBarcode(null);
    setLoadingMessage('Fetching verified product data from Open Food Facts...');

    try {
      const result = await fetchProductByBarcode(code, profile);

      if (!result) {
        sessionStorage.removeItem('nutriscan_last_image');
        setNotFoundBarcode(code);
        setActiveTab('label');
        toast({
          title: 'Not found in Open Food Facts',
          description: 'This product has not been indexed with nutrition or ingredients. Photograph the label or paste the ingredient list, then press Evaluate.',
          variant: 'destructive',
        });
        return;
      }

      if (result.imageUrl) {
        sessionStorage.setItem('nutriscan_last_image', result.imageUrl);
      } else {
        sessionStorage.removeItem('nutriscan_last_image');
      }

      toast({
        title: 'Product found!',
        description: `${result.foodName} evaluated successfully.`,
      });

      onAnalysisComplete(result);
      setPage('results');
    } catch (err: unknown) {
      console.error('Barcode lookup failed:', err);
      toast({
        title: 'Lookup error',
        description: 'Could not connect to Open Food Facts. Check your internet connection or use label photo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  // ── 2. Live Camera Scanner ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch (e) {
        // ignore
      }
      zxingReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    if (!checkAuth()) return;
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Check for native BarcodeDetector API first
      const hasNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

      if (hasNativeDetector) {
        try {
          // @ts-expect-error window.BarcodeDetector is modern web API not in standard TS dom types
          const detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
          });

          const scanNative = async () => {
            if (!videoRef.current || !streamRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  const detected = String(barcodes[0].rawValue).replace(/\D/g, '');
                  stopCamera();
                  setBarcodeInput(detected);
                  handleBarcodeLookup(detected);
                  return;
                }
              }
            } catch {
              // Frame dropped or not decoded yet
            }
            scanLoopRef.current = requestAnimationFrame(scanNative);
          };

          scanLoopRef.current = requestAnimationFrame(scanNative);
          return;
        } catch (e) {
          console.warn('Native BarcodeDetector initialization fallback to ZXing:', e);
        }
      }

      // Fallback: Lazy load @zxing/browser only when native BarcodeDetector is unavailable
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const codeReader = new BrowserMultiFormatReader();
      zxingReaderRef.current = codeReader;

      if (videoRef.current) {
        codeReader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && result.getText()) {
            const detected = result.getText().replace(/\D/g, '');
            stopCamera();
            setBarcodeInput(detected);
            handleBarcodeLookup(detected);
          }
        });
      }
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to access camera. Please check permissions.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };


  // Stop camera on tab change or page unmount
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, stopCamera]);

  // ── 3. Fallback: Photograph Label / Gemini Vision ─────────────────────────
  const processLabelImage = async (file: File) => {
    if (!checkAuth()) return;
    const url = URL.createObjectURL(file);
    setLabelPhotoPreview(url);
    setLoading(true);
    setLoadingMessage('Deconstructing printed nutrition facts & ingredients with AI...');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const persistentPhoto = base64 || url;
      sessionStorage.setItem('nutriscan_last_image', persistentPhoto);

      // Attempt Gemini Vision label extraction
      const labelData = await analyzeLabelWithGemini(base64);

      if (labelData) {
        const result = mapLabelDataToAnalysis(labelData, profile, persistentPhoto);
        toast({
          title: 'Label analyzed!',
          description: `${result.foodName} extracted directly from packaging label.`,
        });
        onAnalysisComplete(result);
        setPage('results');
        return;
      }

      // If Gemini returned null (e.g. no key), fall back to standard smart analysis
      toast({
        title: 'Processing with fallback detector',
        description: 'Estimated nutritional values from label image.',
      });
      const localExtracted = parseLabelTextLocally(file.name);
      const fallbackResult = mapLabelDataToAnalysis(localExtracted, profile, persistentPhoto);
      onAnalysisComplete(fallbackResult);
      setPage('results');
    } catch (err: unknown) {
      console.error('Label photo processing failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not analyze label photo.';
      toast({
        title: 'Scan failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── 4. Fallback: Parse Pasted Ingredient / Nutrition Text ──────────────────
  const handlePastedTextAnalysis = async () => {
    if (!checkAuth()) return;
    if (!pastedText.trim()) {
      toast({
        title: 'No text provided',
        description: 'Please paste the ingredient list or nutrition facts text.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setNotFoundBarcode(null);
    setLoadingMessage('Parsing ingredients and calculating nutritional metrics...');

    try {
      const localExtracted = parseLabelTextLocally(pastedText);
      const geminiExtracted = await parseNutritionTextWithGemini(pastedText);
      const extracted = geminiExtracted
        ? {
            ...localExtracted,
            ...geminiExtracted,
            productName: geminiExtracted.productName || localExtracted.productName,
            brand: geminiExtracted.brand || localExtracted.brand,
            servingSize: geminiExtracted.servingSize || localExtracted.servingSize,
            servingQuantityGrams: geminiExtracted.servingQuantityGrams ?? localExtracted.servingQuantityGrams,
            calories: geminiExtracted.calories ?? localExtracted.calories,
            protein: geminiExtracted.protein ?? localExtracted.protein,
            carbs: geminiExtracted.carbs ?? localExtracted.carbs,
            fat: geminiExtracted.fat ?? localExtracted.fat,
            saturatedFat: geminiExtracted.saturatedFat ?? localExtracted.saturatedFat,
            fiber: geminiExtracted.fiber ?? localExtracted.fiber,
            sugar: geminiExtracted.sugar ?? localExtracted.sugar,
            sodium: geminiExtracted.sodium ?? localExtracted.sodium,
            ingredientsText: geminiExtracted.ingredientsText || localExtracted.ingredientsText,
            allergens: geminiExtracted.allergens?.length ? geminiExtracted.allergens : localExtracted.allergens,
          }
        : localExtracted;

      sessionStorage.removeItem('nutriscan_last_image');
      const result = mapLabelDataToAnalysis(extracted, profile);

      toast({
        title: result.nutritionEstimated ? 'Estimated from ingredients' : 'Analysis complete',
        description: `${result.foodName} evaluated from the text you pasted.`,
      });

      onAnalysisComplete(result);
      setPage('results');
    } catch (err: unknown) {
      console.error('Pasted text parse error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to extract nutrition values from text.';
      toast({
        title: 'Parsing error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <main className="wrap analyze-page" style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '60px' }}>
        <div>
          <p className="kicker">PACKAGED FOOD DECONSTRUCTION</p>
          <h1 style={{ marginBottom: '8px' }}>Scan barcode or label</h1>
          <p className="hero-lede" style={{ marginBottom: '28px' }}>
            Instantly fetch verified nutrition, Nutri-Score, NOVA processing grade, and ingredients from Open Food Facts.
          </p>
        </div>

        {/* Global Loading Overlay */}
        {loading && (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--line)',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Loader2 size={36} className="animate-spin" style={{ color: 'var(--green)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>Analyzing Packaged Food</h3>
            <p className="muted" style={{ fontSize: '14px', margin: 0 }}>
              {loadingMessage}
            </p>
          </div>
        )}

        {/* Not Found In Open Food Facts Alert with One-Tap Fallback */}
        {notFoundBarcode && (
          <div
            style={{
              background: 'var(--amber-light)',
              border: '1px solid var(--amber)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <AlertCircle size={22} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', color: 'var(--text)', fontSize: '15px', marginBottom: '4px' }}>
                Barcode {notFoundBarcode} not found in Open Food Facts
              </strong>
              <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--muted)' }}>
                This product hasn&apos;t been indexed in the public database, or it has no nutrition/ingredients yet.
                Photograph the printed food label or paste the ingredient list below, then press Evaluate.
              </p>
              <Button
                size="sm"
                className="btn-primary"
                onClick={() => {
                  setNotFoundBarcode(null);
                  setActiveTab('label');
                }}
              >
                <Camera size={14} /> Switch to Label Photo / Text Fallback <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Three Input Modes (Tabs) */}
        {!loading && (
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'barcode' | 'camera' | 'label')}
            className="w-full"
          >

            <TabsList
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                width: '100%',
                marginBottom: '24px',
                height: '46px',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '4px',
              }}
            >
              <TabsTrigger
                value="barcode"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
              >
                <Barcode size={17} /> Barcode Number
              </TabsTrigger>
              <TabsTrigger
                value="camera"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
              >
                <Camera size={17} /> Camera Scan
              </TabsTrigger>
              <TabsTrigger
                value="label"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}
              >
                <FileText size={17} /> Label / Ingredients
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: Barcode Number ── */}
            <TabsContent value="barcode" className="mt-0">
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Barcode size={20} style={{ color: 'var(--green)' }} />
                  <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Enter EAN / UPC Barcode</h2>
                </div>
                <p className="muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
                  Type the numeric barcode found under the barcode stripes on the product packaging (8 to 14 digits).
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 3017620422003"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleBarcodeLookup();
                    }}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      height: '46px',
                      padding: '0 16px',
                      fontSize: '16px',
                      fontFamily: 'var(--font-mono)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--line)',
                      background: 'var(--background)',
                    }}
                  />
                  <Button
                    onClick={() => handleBarcodeLookup()}
                    disabled={!barcodeInput.trim()}
                    className="btn-primary"
                    style={{ height: '46px', padding: '0 24px' }}
                  >
                    <Sparkles size={16} /> Look up Product
                  </Button>
                </div>

                {/* Instant Test Sample Chips */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '18px' }}>
                  <span className="label-small" style={{ display: 'block', marginBottom: '10px' }}>
                    QUICK TEST SAMPLES (CLICK TO RUN):
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {POPULAR_SAMPLES.map((sample) => (
                      <button
                        key={sample.barcode}
                        type="button"
                        className="outline-button"
                        style={{
                          fontSize: '13px',
                          padding: '6px 12px',
                          height: 'auto',
                          borderRadius: '20px',
                          background: 'var(--surface-subtle)',
                        }}
                        onClick={() => {
                          setBarcodeInput(sample.barcode);
                          handleBarcodeLookup(sample.barcode);
                        }}
                      >
                        {sample.name} ({sample.barcode})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 2: Camera Scanner ── */}
            <TabsContent value="camera" className="mt-0">
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Camera size={20} style={{ color: 'var(--green)' }} />
                  <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Live Barcode Scanner</h2>
                </div>
                <p className="muted" style={{ fontSize: '14px', maxWidth: '520px', margin: '0 auto 20px' }}>
                  Position the barcode inside the camera viewfinder. NutriScan automatically detects EAN-13, EAN-8, and UPC formats.
                </p>

                {cameraError && (
                  <div
                    style={{
                      background: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                      fontSize: '13.5px',
                    }}
                  >
                    {cameraError}
                  </div>
                )}

                {/* Viewfinder Area */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '480px',
                    height: '320px',
                    margin: '0 auto 20px',
                    background: '#0a0a0a',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: cameraActive ? 'block' : 'none',
                    }}
                  />

                  {!cameraActive ? (
                    <div style={{ color: '#a3a3a3', padding: '20px' }}>
                      <Scan size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '14px' }}>Camera is idle</p>
                      <Button onClick={startCamera} className="btn-primary" style={{ marginTop: '14px' }}>
                        <Camera size={16} /> Start Camera Scanner
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Laser Bar & HUD Corners */}
                      <div className="scan-bar" />
                      <div className="scan-hud-corners">
                        <span className="corner top-left" />
                        <span className="corner top-right" />
                        <span className="corner bottom-left" />
                        <span className="corner bottom-right" />
                      </div>
                      <div className="scan-live-pill" style={{ bottom: '16px', top: 'auto' }}>
                        <i className="pulse-dot" /> SCANNING FOR BARCODE...
                      </div>
                    </>
                  )}
                </div>

                {cameraActive && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Button variant="outline" className="outline-button" onClick={stopCamera}>
                      Stop Camera
                    </Button>
                    <Button variant="outline" className="outline-button" onClick={startCamera}>
                      <RefreshCw size={15} /> Restart Scanner
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── TAB 3: Label Photo / Paste Ingredients ── */}
            <TabsContent value="label" className="mt-0">
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText size={20} style={{ color: 'var(--green)' }} />
                  <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Nutrition Label & Ingredient OCR</h2>
                </div>
                <p className="muted" style={{ fontSize: '14px', marginBottom: '24px' }}>
                  When a product is not in Open Food Facts, photograph the nutrition panel or paste the ingredient list to evaluate it.
                </p>

                {/* Sub-section 1: Photograph / Upload Label */}
                <input
                  type="file"
                  ref={labelFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processLabelImage(f);
                  }}
                />
                <input
                  type="file"
                  ref={labelCameraInputRef}
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processLabelImage(f);
                  }}
                />

                <div
                  className="drop-zone"
                  style={{ marginBottom: '20px' }}
                  onClick={() => {
                    if (!checkAuth()) return;
                    labelFileInputRef.current?.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('dragover');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('dragover');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                    if (!checkAuth()) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) processLabelImage(file);
                  }}
                >
                  <Upload />
                  <h3>Upload or photograph the nutrition label</h3>
                  <p>AI extracts printed calories, macros, and ingredient list.</p>
                  <small>Supports JPEG, PNG, WebP (up to 10MB)</small>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
                  <Button
                    onClick={() => {
                      if (!checkAuth()) return;
                      labelCameraInputRef.current?.click();
                    }}
                    className="btn-primary"
                  >
                    <Camera size={16} /> Take Label Photo
                  </Button>
                  <button
                    className="outline-button"
                    onClick={() => {
                      if (!checkAuth()) return;
                      labelFileInputRef.current?.click();
                    }}
                  >
                    <Upload size={16} /> Choose Image File
                  </button>
                </div>

                {/* Sub-section 2: Paste Ingredients / Label Text */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                    Or paste ingredients / nutrition label text:
                  </label>
                  <textarea
                    rows={4}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="e.g. Ingredients: Whole grain oats, sugar, canola oil, rice flour, honey, salt, brown sugar syrup, baking soda, natural flavor..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--line)',
                      background: 'var(--background)',
                      marginBottom: '14px',
                      resize: 'vertical',
                    }}
                  />
                  <Button
                    onClick={handlePastedTextAnalysis}
                    disabled={!pastedText.trim()}
                    className="btn-primary"
                  >
                    <Sparkles size={16} /> Evaluate Pasted Ingredients
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <Footer setPage={setPage} />
    </>
  );
}

export default PackagedScanPage;
