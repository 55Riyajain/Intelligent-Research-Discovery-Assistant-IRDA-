

export interface GraphNode {
  id: string;
  label: string;
  group: string; // 'PAPER' | 'AUTHOR' | 'INSTITUTE' | 'CONCEPT' | 'METHOD'
  val: number;
  // D3 internal state
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  // Metadata for details panel
  metadata?: any; 
}

export interface GraphEdge {
  source: string | GraphNode; // D3 transforms string ID to Node object
  target: string | GraphNode;
  relation: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type ResearchStatus = 'PROCESSING' | 'COMPLETE' | 'ERROR';

export interface Attachment {
  name: string;
  type: 'PDF' | 'CSV' | 'CODE' | 'IMAGE' | 'OTHER';
  size: string;
  url?: string;
}

// --- COLLABORATION ---

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Annotation {
  id: string;
  targetField: 'abstract' | 'summary';
  startOffset: number;
  endOffset: number;
  text: string;
  color: 'yellow' | 'green' | 'pink' | 'blue';
  commentId?: string; // Optional link to a comment
}

export enum AccessLevel {
  PUBLIC = 'PUBLIC',
  INSTITUTE = 'INSTITUTE',
  PRIVATE = 'PRIVATE'
}

export interface ResearchDocument {
  id: string;
  title: string;
  uploadedBy: string; // Wallet Address
  timestamp: number;
  domain: string; // e.g., "Computer Science", "Biology"
  status: ResearchStatus;
  fileName: string;

  // Organization
  userTags: string[]; // Custom user tags
  attachments: Attachment[];

  // Collaboration & Privacy
  accessLevel: AccessLevel; // Replaces simple boolean for granular control
  encryptionHash?: string; // Simulated encryption proof
  sharedWith: string[]; // List of wallet addresses with access
  comments: Comment[];
  annotations: Annotation[];

  // Basic Info & Metadata
  authors: string[];
  institute: string;
  publicationDate: string;
  citationCount: number;
  
  // Content
  abstract: string;
  summary: string;
  keyConcepts: string[];
  methods: string[];
  tools: string[];
  
  // Analysis Data
  researchGaps: string[];
  hypotheses: string[];
  knowledgeGraph: KnowledgeGraphData;
  
  // Relationships
  relatedPapers: { title: string; year: string }[];
}

export interface ResearchCollection {
  id: string;
  name: string;
  description: string;
  paperIds: string[]; // References to ResearchDocument IDs
  color: string;
  created: number;
}

export interface SavedFilter {
  id: string;
  name: string;
  config: {
    domain: string;
    searchQuery: string;
    sortOrder: 'NEWEST' | 'OLDEST';
  }
}

// --- NOTIFICATIONS ---

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'ANNOUNCEMENT';

export interface AppNotification {
  id: string;
  recipientId: string; // 'ALL' or specific user address
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  linkTo?: string; // e.g., 'DETAIL:doc_id' or 'LIBRARY'
}

// --- AI SYNTHESIS ---

export interface SynthesisReport {
  id: string;
  timestamp: number;
  title: string;
  sourceDocIds: string[];
  executiveSummary: string; // Unified summary
  commonThemes: string[];
  conflicts: string[]; // Contradictions found
  synthesizedHypotheses: string[]; // New ideas merging multiple papers
}

// --- AI CHAT ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

// --- ACTIVITY FEED ---

export interface ActivityItem {
  id: string;
  type: 'UPLOAD' | 'ANALYSIS' | 'SYSTEM' | 'HYPOTHESIS' | 'SYNTHESIS' | 'COLLECTION';
  content: string;
  timestamp: number;
  relatedDocId?: string;
}

// --- SECURITY & RBAC TYPES ---

export enum UserRole {
  RESEARCHER = 'RESEARCHER',
  REVIEWER = 'REVIEWER',
  INSTITUTE_ADMIN = 'INSTITUTE_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

export enum AccountStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED'
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  details: string;
  blockHash: string;
  verified?: boolean; // UI state for integrity check
}

export interface UserProfile {
  address: string;
  name: string;
  institute: string;
  role: UserRole;
  status: AccountStatus;
  joinedAt: number;
  
  // Profile Extended Fields
  bio?: string;
  specializations?: string[];
  collaborators?: string[];
  publications?: number;
  citations?: number;
}
