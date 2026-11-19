import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import {
  Brain,
  Radio,
  ScanSearch,
  Globe,
  FileText,
  Send,
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  Upload,
  CheckCircle2,
  History,
  MessageSquarePlus,
} from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { LEARNING_STEPS } from '../lib/knowledgeEngine';
import {
  BusinessIdentity,
  DeepScanPageInfo,
  DeepScanStage,
  ExtractedLearningFact,
  KnowledgeItem,
  LearningSessionState,
  MasteryAuditReport,
  SalesAuthorityPolicy,
  ScanJobRecord,
} from '../types/knowledge';

interface LivingKnowledgeStudioProps {
  isDemoMode: boolean;
  companyId: string;
  identity: BusinessIdentity;
  items: KnowledgeItem[];
  policy: SalesAuthorityPolicy;
  scanJobs: ScanJobRecord[];
  learningSession: LearningSessionState;
  scanStage: DeepScanStage;
  scanProgress: number;
  scanLogMessage: string;
  scanError: string | null;
  scanPages: DeepScanPageInfo[];
  scanRunning: boolean;
  learningSending: boolean;
  masteryAudit: MasteryAuditReport;
  onStartUrlScan: (url: string) => Promise<void>;
  onStartDocumentScan: (fileName: string, contentText: string) => Promise<void>;
  onSendLearningMessage: (message: string) => Promise<void>;
  onConfirmExtractedFact: (messageId: string, fact: ExtractedLearningFact) => Promise<void>;
  onInjectClarificationToChat: (question: string, sourceLabel: string) => Promise<void>;
  onApproveItem: (itemId: string) => Promise<void>;
  onRejectItem: (itemId: string) => Promise<void>;
  onResetLearningSession: () => Promise<void>;
  onOpenLedgerTab: () => void;
}

const SCAN_SEGMENTS: Array<{ id: DeepScanStage; label: string; minProgress: number }> = [
  { id: 'connexion', label: 'Connexion', minProgress: 10 },
  { id: 'extraction', label: 'Extraction', minProgress: 38 },
  { id: 'structuration', label: 'Structuration', minProgress: 70 },
  { id: 'validation', label: 'Validation', minProgress: 90 },
];

export default function LivingKnowledgeStudio({
  isDemoMode,
  identity,
  items,
  scanJobs,
  learningSession,
  scanStage,
  scanProgress,
  scanLogMessage,
  scanError,
  scanPages,
  scanRunning,
  learningSending,
  masteryAudit,
  onStartUrlScan,
  onStartDocumentScan,
  onSendLearningMessage,
  onConfirmExtractedFact,
  onInjectClarificationToChat,
  onApproveItem,
  onRejectItem,
  onResetLearningSession,
  onOpenLedgerTab,
}: LivingKnowledgeStudioProps) {
  const { formatMoney } = useCurrency();

  const [scanMode, setScanMode] = useState<'website' | 'document'>('website');
  const [urlInput, setUrlInput] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docRawText, setDocRawText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [learningSession.messages.length]);

  const currentStepMeta =
    LEARNING_STEPS.find((s) => s.step === learningSession.currentStep) || LEARNING_STEPS[0];

  const pendingReviewItems = items
    .filter((i) => i.status === 'pending_verification' || i.status === 'conflict')
    .slice(0, 8);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setDocFileName(file.name);
      setDocRawText(text);
    } catch {
      setDocFileName(file.name);
    } finally {
      e.target.value = '';
    }
  };

  const handleLaunchScan = async () => {
    if (scanRunning) return;
    if (scanMode === 'website') {
      if (!urlInput.trim()) return;
      await onStartUrlScan(urlInput.trim());
    } else {
      if (!docRawText.trim()) return;
      await onStartDocumentScan(docFileName.trim() || 'Document_Entreprise.txt', docRawText);
    }
  };

  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || learningSending) return;
    setChatInput('');
    await onSendLearningMessage(msg);
  };

  const handleChatKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendChat();
    }
  };

  return (
    <div className="bg-[#09090d] border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* TOP COCKPIT HEADER MATCHING DESIGN MOCKUP */}
      <div className="px-5 py-4 border-b border-zinc-900 bg-black/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#E10600] flex items-center justify-center text-white shrink-0 shadow-[0_0_20px_rgba(225,6,0,0.35)]">
            <Brain size={21} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-white tracking-tight uppercase">
              FIKO KNOWLEDGE CENTER
            </h3>
            <p className="text-xs text-zinc-400">
              L&apos;intelligence de votre entreprise commence ici.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            Audit de Maîtrise ({masteryAudit.knownFactsCount} validées)
          </button>

          {isDemoMode ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/70 text-amber-300 text-xs font-black tracking-wide">
              <Radio size={13} />
              MODE DÉMO
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/70 text-emerald-400 text-xs font-black tracking-wide">
              <Radio size={13} />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* RESPONSIVE DUAL PANE: SIDE BY SIDE ON DESKTOP, STACKED ON MOBILE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-zinc-900">
        {/* ================================================================= */}
        {/* ZONE 01 — FIKO DEEP SCAN™                                        */}
        {/* ================================================================= */}
        <section className="xl:col-span-6 p-5 md:p-6 space-y-5 bg-[#09090d]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-white tracking-wide uppercase">
                01 / FIKO DEEP SCAN™
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Connectez vos connaissances. Fiko les analyse et les organise.
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600] shrink-0">
              <ScanSearch size={16} />
            </div>
          </div>

          {/* Segmented Switch: Site web | Document */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#16161c] border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setScanMode('website')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                scanMode === 'website'
                  ? 'bg-[#2a2a33] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe size={14} /> Site web
            </button>
            <button
              type="button"
              onClick={() => setScanMode('document')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                scanMode === 'document'
                  ? 'bg-[#2a2a33] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText size={14} /> Document
            </button>
          </div>

          {/* Source Input Area */}
          {scanMode === 'website' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLaunchScan();
                  }
                }}
                placeholder="Ex: kcg-ci.com ou https://votre-entreprise.ci"
                aria-label="URL du site web à analyser"
                className="w-full bg-[#0d0d12] border border-zinc-800 focus:border-[#E10600] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {isDemoMode && (
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Mode Démo : le crawl réseau SSRF-protégé nécessite un compte entreprise authentifié. Utilisez l&apos;onglet « Document » ou connectez un compte réel.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <label className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white cursor-pointer flex items-center justify-center gap-2 shrink-0">
                  <Upload size={14} className="text-[#E10600]" />
                  {docFileName ? `Fichier : ${docFileName}` : 'Charger un fichier (.csv, .txt, .md, .html)'}
                  <input
                    type="file"
                    accept=".txt,.csv,.md,.json,.html,.htm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  placeholder="Nom de la source (ex: Grille_2026.csv)"
                  className="flex-1 bg-[#0d0d12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E10600]"
                />
              </div>
              <textarea
                rows={3}
                value={docRawText}
                onChange={(e) => setDocRawText(e.target.value)}
                placeholder="Collez ici un extrait de brochure, grille tarifaire FCFA, conditions de livraison ou FAQ..."
                className="w-full bg-[#0d0d12] border border-zinc-800 focus:border-[#E10600] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
          )}

          {/* High-contrast white primary button matching mockup */}
          <button
            type="button"
            onClick={handleLaunchScan}
            disabled={
              scanRunning ||
              (scanMode === 'website' ? !urlInput.trim() : !docRawText.trim())
            }
            className="w-full py-3.5 px-5 rounded-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2.5 cursor-pointer shadow-lg"
          >
            <ScanSearch size={16} className={scanRunning ? 'animate-spin' : ''} />
            {scanRunning ? 'ANALYSE EN COURS...' : "LANCER L'ANALYSE"}
          </button>

          {/* Flux d'analyse en temps réel */}
          <div className="rounded-2xl bg-[#101219] border border-zinc-800/80 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    scanRunning
                      ? 'border-[#E10600] border-t-transparent animate-spin'
                      : scanStage === 'error'
                      ? 'border-red-500 text-red-400'
                      : scanStage === 'done'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-[#E10600]/50 text-[#E10600]'
                  }`}
                >
                  {!scanRunning && <Radio size={12} />}
                </div>
                <span className="text-xs font-bold text-white">Flux d&apos;analyse en temps réel</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {scanProgress}%
              </span>
            </div>

            {scanError ? (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/70 text-xs text-red-300 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" />
                <span>{scanError}</span>
              </div>
            ) : (
              <p className="text-xs text-zinc-300 min-h-[1.25rem]">
                {scanLogMessage || 'En attente d’une source à analyser.'}
              </p>
            )}

            {/* 4-Stage Segmented Bar: Connexion · Extraction · Structuration · Validation */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {SCAN_SEGMENTS.map((seg) => {
                const reached =
                  scanStage === 'done' ||
                  (scanStage !== 'idle' && scanStage !== 'error' && scanProgress >= seg.minProgress);
                const failedHere = scanStage === 'error' && scanProgress >= seg.minProgress - 5;

                return (
                  <div key={seg.id} className="space-y-1.5 text-center">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${
                        failedHere
                          ? 'bg-red-500'
                          : reached
                          ? 'bg-[#E10600]'
                          : 'bg-zinc-800'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold block ${
                        failedHere
                          ? 'text-red-400'
                          : reached
                          ? 'text-white'
                          : 'text-zinc-500'
                      }`}
                    >
                      {seg.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Real crawled page details */}
            {scanPages.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                {scanPages.map((pg, idx) => (
                  <span
                    key={`${pg.url}_${idx}`}
                    title={pg.url}
                    className="text-[10px] px-2 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-300 truncate max-w-[220px]"
                  >
                    {pg.title} ({Math.max(1, Math.round(pg.bytes / 1024))} Ko)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Candidates Waiting for Human Validation */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-black text-zinc-300 uppercase tracking-wide">
                Découvertes à valider ({pendingReviewItems.length})
              </h5>
              <button
                type="button"
                onClick={onOpenLedgerTab}
                className="text-[11px] font-bold text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Tout voir dans Base & Versions →
              </button>
            </div>

            {pendingReviewItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-black/40 border border-zinc-900 text-xs text-zinc-500 text-center">
                Aucune règle en attente de validation. Lancez un Deep Scan ou consultez l&apos;historique.
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {pendingReviewItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-black/60 border border-zinc-800/90 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span
                            className={`font-bold ${
                              item.status === 'conflict' ? 'text-red-400' : 'text-amber-400'
                            }`}
                          >
                            {item.status === 'conflict' ? 'Conflit détecté' : 'À vérifier'}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-400 uppercase font-mono">{item.category}</span>
                          {typeof item.approvedPriceFCFA === 'number' && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="text-white font-mono font-bold">
                                {formatMoney(item.approvedPriceFCFA)}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs font-black text-white truncate mt-0.5">{item.title}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApproveItem(item.id)}
                          title="Valider et activer dans Verified RAG"
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectItem(item.id)}
                          title="Rejeter"
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2">{item.content}</p>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-900 text-[10px] text-zinc-500">
                      <span className="truncate">Source : {item.source}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onInjectClarificationToChat(
                            `Pouvez-vous confirmer si « ${item.title} » (${item.content.slice(0, 90)}) est officiel et applicable à tous les clients ?`,
                            item.source
                          )
                        }
                        className="text-[#E10600] hover:text-red-400 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <MessageSquarePlus size={11} />
                        Clarifier dans Learning Live
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Persisted Scan History */}
          {scanJobs.length > 0 && (
            <div className="pt-2 border-t border-zinc-900 space-y-2">
              <h5 className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
                <History size={12} /> Historique des analyses ({scanJobs.length})
              </h5>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                {scanJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="px-3 py-2 rounded-lg bg-black/50 border border-zinc-900 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          job.status === 'completed' ? 'bg-emerald-400' : 'bg-red-400'
                        }`}
                      />
                      <span className="text-zinc-200 font-semibold truncate">{job.sourceLabel}</span>
                    </div>
                    <span className="text-zinc-500 font-mono shrink-0">
                      {job.status === 'completed'
                        ? `${job.extractedCount} extrait(s)`
                        : 'Échec'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* ZONE 02 — FIKO LEARNING LIVE™                                     */}
        {/* ================================================================= */}
        <section className="xl:col-span-6 p-5 md:p-6 flex flex-col justify-between gap-4 bg-[#09090d] min-h-[600px]">
          {/* Section Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white tracking-wide uppercase">
                  02 / FIKO LEARNING LIVE™
                </h4>
                <span className="text-[11px] font-mono text-[#E10600] font-bold">
                  Étape {learningSession.currentStep}/7 · {currentStepMeta.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#191a22] border border-zinc-800 text-[11px] font-bold text-zinc-200">
                  Formation conversationnelle
                </span>
                <button
                  type="button"
                  onClick={onResetLearningSession}
                  title="Réinitialiser la session d'entretien"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* 7-Step Progress Micro-Bar */}
            <div className="grid grid-cols-7 gap-1">
              {LEARNING_STEPS.map((st) => (
                <div
                  key={st.step}
                  title={`Étape ${st.step} : ${st.label}`}
                  className={`h-1 rounded-full transition-all ${
                    st.step <= learningSession.currentStep ? 'bg-[#E10600]' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* Active Clarifications from Deep Scan (Bidirectional Bridge) */}
            {learningSession.pendingClarifications.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-900/60 text-xs text-amber-200 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    Pont Deep Scan → Learning Live ({learningSession.pendingClarifications.length} question(s) en file)
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/90">
                  Prochaine clarification : {learningSession.pendingClarifications[0]}
                </p>
              </div>
            )}
          </div>

          {/* Persistent Conversation Stream */}
          <div className="flex-1 overflow-y-auto max-h-[430px] space-y-4 pr-1 py-1">
            {learningSession.messages.map((msg) => {
              const isLeader = msg.sender === 'leader';
              const isSystem = msg.sender === 'system';

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 text-center"
                  >
                    {msg.text}
                  </div>
                );
              }

              if (isLeader) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[88%] space-y-1">
                      <p className="text-[10px] font-bold text-zinc-400">
                        Dirigeant · {identity.companyName}
                      </p>
                      <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2a1216] border border-[#E10600]/40 text-[#E10600] flex items-center justify-center shrink-0 mt-0.5">
                    <Brain size={17} />
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">Fiko</span>
                        {msg.stepLabel && (
                          <span className="text-[10px] font-mono text-zinc-500">
                            · {msg.stepLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>

                    {/* Extracted structured facts waiting for 1-click official confirmation */}
                    {msg.extractedFacts && msg.extractedFacts.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {msg.extractedFacts.map((fact) => (
                          <div
                            key={fact.id}
                            className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                              fact.confirmed
                                ? 'bg-emerald-950/25 border-emerald-900/60'
                                : 'bg-[#12131b] border-zinc-800'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="font-mono uppercase text-zinc-400">
                                  {fact.category}
                                </span>
                                {typeof fact.approvedPriceFCFA === 'number' && (
                                  <span className="font-mono font-bold text-emerald-400">
                                    · {formatMoney(fact.approvedPriceFCFA)}
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-white truncate">{fact.title}</p>
                            </div>

                            {fact.confirmed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 shrink-0">
                                <CheckCircle2 size={13} /> Validée dans la base
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onConfirmExtractedFact(msg.id, fact)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition shrink-0 cursor-pointer"
                              >
                                Confirmer comme officielle
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Dark Composer matching screenshot */}
          <div className="rounded-2xl bg-[#101219] border border-zinc-800/80 p-3.5 space-y-3">
            <textarea
              rows={3}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Nous sommes une entreprise spécialisée dans..."
              aria-label="Réponse de formation pour Fiko"
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
              <span className="text-[11px] text-zinc-500">
                Votre entreprise, vos règles, votre IA.
              </span>
              <button
                type="button"
                onClick={handleSendChat}
                disabled={learningSending || !chatInput.trim()}
                className="px-4 py-2 rounded-full bg-[#1e202b] hover:bg-[#E10600] disabled:opacity-45 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Send size={13} />
                {learningSending ? 'Fiko réfléchit...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM HONESTY DISCLAIMER MATCHING USER SPEC */}
      <div className="px-5 py-3 border-t border-zinc-900 bg-black/50 text-[11px] text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          {isDemoMode
            ? 'Mode Démo actif : les connaissances ci-dessus sont illustratives. Connectez un compte entreprise réel pour le crawl SSRF-protégé et la persistance Firestore.'
            : `Connecté aux services réels Fiko Connect (${identity.companyName}) : aucune information extraite n’est active face aux clients avant votre validation explicite.`}
        </span>
        <span className="font-mono text-zinc-500 shrink-0">Ctrl/Cmd + Entrée pour envoyer</span>
      </div>

      {/* ================================================================= */}
      {/* MODAL — AUDIT DE MAÎTRISE (CRITÈRE DE RÉUSSITE)                   */}
      {/* ================================================================= */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0a0a0f] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-white">
                  Audit de Maîtrise Fiko — Ce que je sais, ce que j&apos;ignore, ce que je peux faire
                </h4>
                <p className="text-xs text-zinc-400">
                  Vérification transparente des connaissances validées et du périmètre commercial autorisé.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* 1. Ce que Fiko sait (avec sources) */}
              <div className="space-y-2">
                <h5 className="font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck size={14} /> 1. Ce que je sais officiellement ({masteryAudit.knownFactsCount} sources)
                </h5>
                {masteryAudit.knownFacts.length === 0 ? (
                  <p className="text-zinc-500">Aucune connaissance validée pour le moment.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {masteryAudit.knownFacts.slice(0, 12).map((fact, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-black/60 border border-zinc-900">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">{fact.title}</span>
                          {typeof fact.priceFCFA === 'number' && (
                            <span className="font-mono text-emerald-400 font-bold shrink-0">
                              {formatMoney(fact.priceFCFA)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                          Source : {fact.source}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Ce que Fiko ignore encore */}
              <div className="space-y-2">
                <h5 className="font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle size={14} /> 2. Ce que j&apos;ignore ou qui reste à valider ({masteryAudit.unknownGaps.length})
                </h5>
                {masteryAudit.unknownGaps.length === 0 ? (
                  <p className="text-emerald-300">Aucun angle mort majeur détecté sur le socle de base.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {masteryAudit.unknownGaps.map((gap, i) => (
                      <li key={i} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/50 text-amber-200">
                        • {gap}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 3. Ce que Fiko est autorisé / interdit de faire */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="font-black text-emerald-400 uppercase tracking-wide">
                    3a. Actions autorisées
                  </h5>
                  <ul className="space-y-1.5">
                    {masteryAudit.authorizedCapabilities.map((cap, i) => (
                      <li key={i} className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-zinc-200">
                        ✓ {cap}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h5 className="font-black text-red-400 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldAlert size={14} /> 3b. Actions strictement bloquées
                  </h5>
                  <ul className="space-y-1.5">
                    {masteryAudit.blockedCapabilities.map((blk, i) => (
                      <li key={i} className="p-2 rounded-lg bg-red-950/20 border border-red-900/40 text-red-200">
                        ✕ {blk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
