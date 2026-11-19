export type TruthLevel =
  | 'validated_info'
  | 'dynamic_info'
  | 'unknown_info'
  | 'approval_required'
  | 'forbidden_action';

export type KnowledgeItemStatus = 'validated' | 'pending_verification' | 'rejected' | 'conflict';

export type KnowledgeReviewState = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type KnowledgeCategory =
  | 'tarif'
  | 'service'
  | 'zone'
  | 'delai'
  | 'politique'
  | 'garantie'
  | 'faq'
  | 'catalogue';

export interface KnowledgeItem {
  id: string;
  companyId: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  approvedPriceFCFA?: number;
  discountMaxPercent?: number;
  status: KnowledgeItemStatus;
  reviewState?: KnowledgeReviewState;
  version?: number;
  source: string;
  sourceType: 'manual' | 'pdf' | 'word' | 'csv' | 'url' | 'training' | 'learning';
  validUntil: string;
  responsible: string;
  scope: string;
  approvedBy?: string;
  approvedAt?: string;
  conflictWithId?: string;
  conflictReason?: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessIdentity {
  companyId: string;
  companyName: string;
  sector: string;
  description: string;
  services: string[];
  targetAudience: string;
  coveredZones: string[];
  workingHours: string;
  positioning: string;
  commercialTone: 'Professionnel & Rassurant' | 'Direct & Orienté Conversion' | 'Premium & Consultatif';
  primaryObjectives: string[];
  updatedAt: string;
}

export interface SalesAuthorityPolicy {
  companyId: string;
  canPresentOffers: boolean;
  canAdvise: boolean;
  canQualifyLeads: boolean;
  canSendQuote: boolean;
  maxAutonomousQuoteFCFA: number;
  canNegotiateDiscount: boolean;
  maxAutonomousDiscountPercent: number;
  canCreatePaystackLink: boolean;
  canPromiseSameDaySlot: boolean;
  canGuaranteeOutcome: false; // Strictly locked to false by Truth & Promise Guard doctrine
  forbiddenPromises: string[];
  escalationChannel: string;
  updatedAt: string;
}

export interface TrainingRule {
  id: string;
  companyId: string;
  title: string;
  scenarioType: 'instruction' | 'conversation_example' | 'sales_script' | 'correction';
  customerTrigger: string;
  expectedBehavior: string;
  testedBeforeActivation: boolean;
  isActive: boolean;
  lastTestedAt?: string;
  createdAt: string;
}

export interface HumanApprovalRequest {
  id: string;
  companyId: string;
  customerName: string;
  customerPhone: string;
  customerMessage: string;
  requestedAction: string;
  truthLevel: TruthLevel;
  proposedSafeReply: string;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  managerNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface LearningSuggestion {
  id: string;
  companyId: string;
  unansweredQuestion: string;
  frequency: number;
  detectedGap: string;
  proposedTitle: string;
  proposedContent: string;
  proposedCategory: KnowledgeCategory;
  status: 'suggested' | 'converted_to_pending' | 'dismissed';
  lastAskedAt: string;
}

export interface GuardEvaluationResult {
  truthLevel: TruthLevel;
  truthLabel: string;
  allowedToPromise: boolean;
  requiresHumanApproval: boolean;
  blockedClaims: string[];
  guardReason: string;
  safeReply: string;
  citedSources: Array<{
    id: string;
    title: string;
    source: string;
    responsible: string;
    validUntil: string;
    scope: string;
  }>;
  suggestedEscalationAction?: string;
  detectedDiscountPercent?: number;
}

export interface KnowledgeConflict {
  existingItemId: string;
  existingTitle: string;
  type: 'duplicate' | 'contradiction';
  reason: string;
}

// --- FIKO DEEP SCAN™ & FIKO LEARNING LIVE™ V3.0 TYPES ---

export type DeepScanStage = 'idle' | 'connexion' | 'extraction' | 'structuration' | 'validation' | 'done' | 'error';

export interface DeepScanPageInfo {
  url: string;
  title: string;
  bytes: number;
  headingsCount: number;
}

export interface DeepScanProgressEvent {
  stage: DeepScanStage;
  progress: number;
  message: string;
  page?: DeepScanPageInfo;
  candidatesCount?: number;
  clarificationQuestions?: string[];
  candidates?: Array<Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>>;
  aiUsed?: boolean;
  aiNote?: string;
  error?: string;
}

export interface ScanJobRecord {
  id: string;
  companyId: string;
  sourceType: 'website' | 'document';
  sourceLabel: string;
  status: 'completed' | 'failed';
  pagesScanned: DeepScanPageInfo[];
  extractedCount: number;
  clarificationQuestions: string[];
  errorMessage?: string;
  createdAt: string;
}

export interface ExtractedLearningFact {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  approvedPriceFCFA?: number;
  confirmed?: boolean;
}

export interface LearningChatMessage {
  id: string;
  sender: 'fiko' | 'leader' | 'system';
  text: string;
  stepNumber?: number;
  stepLabel?: string;
  extractedFacts?: ExtractedLearningFact[];
  relatedScanSource?: string;
  timestamp: string;
}

export interface LearningSessionState {
  companyId: string;
  currentStep: number; // 1 to 7
  messages: LearningChatMessage[];
  pendingClarifications: string[];
  updatedAt: string;
}

export interface KnowledgeVersionSnapshot {
  id: string;
  companyId: string;
  versionNumber: number;
  label: string;
  createdBy: string;
  approvedCount: number;
  itemsSnapshot: KnowledgeItem[];
  identitySnapshot: BusinessIdentity;
  policySnapshot: SalesAuthorityPolicy;
  createdAt: string;
}

export interface MasteryAuditReport {
  knownFactsCount: number;
  knownFacts: Array<{ title: string; source: string; category: KnowledgeCategory; priceFCFA?: number }>;
  unknownGaps: string[];
  authorizedCapabilities: string[];
  blockedCapabilities: string[];
}
