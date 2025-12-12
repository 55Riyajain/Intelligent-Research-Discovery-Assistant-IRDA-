
import { ActivityItem, ResearchDocument, SynthesisReport, ResearchCollection, SavedFilter, AppNotification, Comment, Annotation, AccessLevel } from "../types";

// Mock Data for "Research Columns" feature
const DEMO_DOCUMENTS: ResearchDocument[] = [
  {
    id: "doc_1",
    title: "Deep Discovery: Intrinsic Motivation in GNNs",
    fileName: "deep_discovery.txt",
    // Matches the Demo Researcher Address from ledgerService
    uploadedBy: "0xRes...1234", 
    timestamp: Date.now() - 86400000 * 2, // 2 days ago
    domain: "Artificial Intelligence",
    status: 'COMPLETE',
    accessLevel: AccessLevel.PUBLIC,
    encryptionHash: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    sharedWith: [],
    comments: [],
    annotations: [],
    authors: ["Dr. Elena R.", "K. Chen"],
    institute: "MIT Media Lab",
    publicationDate: "2024-03-15",
    citationCount: 12,
    userTags: ["Thesis Ref", "High Priority"],
    attachments: [
        { name: "deep_discovery.pdf", type: "PDF", size: "2.4 MB" },
        { name: "experiment_logs.csv", type: "CSV", size: "145 KB" }
    ],
    abstract: "This paper explores the integration of intrinsic motivation mechanisms within Graph Neural Networks (GNNs) to enhance exploration in sparse-reward reinforcement learning environments. By rewarding the discovery of novel topological structures, we demonstrate significantly improved convergence rates.",
    summary: "**Introduction:** RL agents struggle with exploration in sparse environments.\n\n**Methods:** We propose 'Deep Discovery', utilizing GNNs to model state transitions as graph expansions. Intrinsic rewards are given for novel node creation.\n\n**Results:** The agent outperformed baselines by 40% in MiniGrid.\n\n**Discussion:** Graph topology serves as a strong inductive bias for exploration.",
    keyConcepts: ["Reinforcement Learning", "Intrinsic Motivation", "Knowledge Graphs", "GNN"],
    methods: ["Graph Neural Networks (GNN)", "PPO Algorithm", "Intrinsic Reward Shaping"],
    tools: ["PyTorch Geometric", "OpenAI Gym", "MiniGrid"],
    researchGaps: ["Scalability to continuous state spaces", "Multi-agent consistency"],
    hypotheses: ["Hierarchical graph structures improve long-term planning", "Attention mechanisms reduce graph compute cost"],
    knowledgeGraph: {
      nodes: [
        { id: "1", label: "Reinforcement Learning", group: "Concept", val: 5 },
        { id: "2", label: "Deep Discovery", group: "Method", val: 4 },
        { id: "3", label: "Intrinsic Motivation", group: "Concept", val: 3 },
        { id: "4", label: "Knowledge Graph", group: "Tool", val: 3 }
      ],
      edges: [
        { source: "2", target: "1", relation: "improves" },
        { source: "2", target: "3", relation: "utilizes" },
        { source: "2", target: "4", relation: "constructs" }
      ]
    },
    relatedPapers: [
      { title: "Curiosity-driven Exploration by Self-supervised Prediction", year: "2017" },
      { title: "Graph Convolutional Networks", year: "2016" }
    ]
  },
  {
    id: "doc_2",
    title: "CRISPR-Cas9 Off-Target Effects Analysis",
    fileName: "genomics_study_v2.pdf",
    // Matches the Demo Researcher Address from ledgerService
    uploadedBy: "0xRes...1234",
    timestamp: Date.now() - 86400000 * 5,
    domain: "Genomics",
    status: 'COMPLETE',
    accessLevel: AccessLevel.PRIVATE, // Restricted
    encryptionHash: "0x4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
    sharedWith: ["0xRes...1234"],
    comments: [
        { id: "c1", userId: "0xRev...5678", userName: "Dr. Reviewer", text: "The statistical power calculation seems off in Table 2.", timestamp: Date.now() - 1000000 }
    ],
    annotations: [
        { id: "a1", targetField: "abstract", startOffset: 4, endOffset: 45, text: "specificity of CRISPR-Cas9 nucleases is a major concern", color: "yellow", commentId: "c1" }
    ],
    authors: ["Sarah J.", "M. Al-Fayed"],
    institute: "Broad Institute",
    publicationDate: "2024-01-20",
    citationCount: 45,
    userTags: [],
    attachments: [
        { name: "genomics_study_v2.pdf", type: "PDF", size: "5.1 MB" }
    ],
    abstract: "The specificity of CRISPR-Cas9 nucleases is a major concern for therapeutic applications. Here we present a comprehensive analysis of off-target effects using a novel high-fidelity variant, demonstrating a 50% reduction in unintended edits.",
    summary: "**Background:** CRISPR off-target effects pose safety risks.\n\n**Study:** We sequenced 50 loci after treating with High-Fi Cas9.\n\n**Findings:** 50% reduction in off-target indels compared to WT-Cas9.\n\n**Significance:** High-Fi variants are essential for clinical translation.",
    keyConcepts: ["CRISPR", "Gene Editing", "Off-target Effects", "Cas9"],
    methods: ["Whole Genome Sequencing", "GUIDE-seq", "Statistical Analysis"],
    tools: ["Illumina Sequencer", "Python (BioPython)", "R"],
    researchGaps: ["In-vivo delivery mechanisms", "Long-term stability of edits"],
    hypotheses: ["Modified guide RNAs can further reduce off-target rates by 15%"],
    knowledgeGraph: {
      nodes: [
        { id: "1", label: "CRISPR", group: "Method", val: 5 },
        { id: "2", label: "Cas9", group: "Protein", val: 4 },
        { id: "3", label: "Off-target", group: "Problem", val: 3 }
      ],
      edges: [
        { source: "1", target: "3", relation: "causes" },
        { source: "2", target: "1", relation: "enables" }
      ]
    },
    relatedPapers: [
      { title: "Programmable editing of a target base", year: "2016" }
    ]
  },
  {
    id: "doc_3",
    title: "GNNs for Protein Folding Prediction",
    fileName: "gnn_protein_folding.pdf",
    uploadedBy: "0xRes...1234",
    timestamp: Date.now() - 86400000 * 1,
    domain: "Bioinformatics",
    status: 'COMPLETE',
    accessLevel: AccessLevel.INSTITUTE,
    encryptionHash: "0x5d41402abc4b2a76b9719d911017c59228ad8e24f60cf0c379659828456f9326",
    sharedWith: [],
    comments: [],
    annotations: [],
    // Shares an author with doc_1 and concept with doc_1 (GNN) and doc_2 (Proteins/Biology context)
    authors: ["K. Chen", "L. Wei"], 
    institute: "Stanford University",
    publicationDate: "2024-02-10",
    citationCount: 28,
    userTags: ["Read Later"],
    attachments: [
        { name: "gnn_protein_folding.pdf", type: "PDF", size: "3.2 MB" }
    ],
    abstract: "We apply Graph Neural Networks to the problem of protein structure prediction, modeling amino acid residues as nodes in a graph. Our method achieves comparable accuracy to AlphaFold2 with significantly lower computational overhead.",
    summary: "**Overview:** Protein folding prediction is computationally expensive.\n\n**Method:** We use GNNs to predict inter-residue distances.\n\n**Results:** 90% accuracy on CASP14 targets.\n\n**Conclusion:** GNNs capture spatial dependencies efficiently.",
    keyConcepts: ["GNN", "Protein Folding", "Deep Learning", "Bioinformatics"],
    methods: ["Graph Neural Networks (GNN)", "Gradient Descent"],
    tools: ["PyTorch", "AlphaFold"],
    researchGaps: ["Predicting multi-protein complex structures"],
    hypotheses: ["Combining GNNs with attention mechanisms can further improve accuracy"],
    knowledgeGraph: {
        nodes: [
            { id: "1", label: "GNN", group: "Method", val: 5 },
            { id: "2", label: "Protein Folding", group: "Problem", val: 4 }
        ],
        edges: [
            { source: "1", target: "2", relation: "predicts" }
        ]
    },
    relatedPapers: []
  },
  {
    id: "doc_4",
    title: "Quantum Error Correction with Surface Codes",
    fileName: "quantum_codes.pdf",
    uploadedBy: "0xRes...1234",
    timestamp: Date.now() - 86400000 * 100,
    domain: "Quantum Computing",
    status: 'COMPLETE',
    accessLevel: AccessLevel.PUBLIC,
    encryptionHash: "0x...",
    sharedWith: [],
    comments: [],
    annotations: [],
    authors: ["Dr. A. Turing", "R. Feynman"],
    institute: "Institute for Advanced Study",
    publicationDate: "2023-11-05",
    citationCount: 89,
    userTags: [],
    attachments: [],
    abstract: "Surface codes are a promising candidate for quantum error correction. We present a scalable architecture.",
    summary: "Key advancement in stabilizing logical qubits.",
    keyConcepts: ["Quantum Computing", "Error Correction", "Surface Codes"],
    methods: ["Topology", "Simulation"],
    tools: ["Qiskit"],
    researchGaps: ["Hardware implementation at scale"],
    hypotheses: [],
    knowledgeGraph: { nodes: [], edges: [] },
    relatedPapers: []
  },
  {
    id: "doc_5",
    title: "Neuro-Symbolic AI for Reasoning",
    fileName: "neuro_symbolic.pdf",
    uploadedBy: "0xRes...1234",
    timestamp: Date.now() - 86400000 * 400,
    domain: "Artificial Intelligence",
    status: 'COMPLETE',
    accessLevel: AccessLevel.PUBLIC,
    encryptionHash: "0x...",
    sharedWith: [],
    comments: [],
    annotations: [],
    authors: ["K. Chen", "J. Tenenbaum"],
    institute: "MIT Media Lab",
    publicationDate: "2023-01-15",
    citationCount: 156,
    userTags: [],
    attachments: [],
    abstract: "Combining neural networks with symbolic logic engines.",
    summary: "Hybrid systems outperform pure connectionist models on reasoning tasks.",
    keyConcepts: ["Neuro-Symbolic", "Reasoning", "AI"],
    methods: ["Hybrid Architecture"],
    tools: ["TensorFlow"],
    researchGaps: [],
    hypotheses: [],
    knowledgeGraph: { nodes: [], edges: [] },
    relatedPapers: []
  },
  {
    id: "doc_6",
    title: "Single-Cell RNA Seq of Hippocampus",
    fileName: "scrna_seq.pdf",
    uploadedBy: "0xRes...1234",
    timestamp: Date.now() - 86400000 * 250,
    domain: "Neuroscience",
    status: 'COMPLETE',
    accessLevel: AccessLevel.PUBLIC,
    encryptionHash: "0x...",
    sharedWith: [],
    comments: [],
    annotations: [],
    authors: ["Sarah J.", "L. Wei"],
    institute: "Broad Institute",
    publicationDate: "2023-06-20",
    citationCount: 42,
    userTags: [],
    attachments: [],
    abstract: "Profiling gene expression at the single-cell level in murine hippocampus.",
    summary: "Identified 3 novel neuron subtypes.",
    keyConcepts: ["scRNA-seq", "Neuroscience", "Genomics"],
    methods: ["Sequencing", "Clustering"],
    tools: ["Seurat", "R"],
    researchGaps: [],
    hypotheses: [],
    knowledgeGraph: { nodes: [], edges: [] },
    relatedPapers: []
  }
];

// Mock Synthesis Reports
const DEMO_REPORTS: SynthesisReport[] = [
  {
    id: "synth_1",
    timestamp: Date.now() - 86400000 * 1,
    title: "Synthesis: AI & Genomics Intersection",
    sourceDocIds: ["doc_1", "doc_2"],
    executiveSummary: "This synthesis bridges Reinforcement Learning (RL) and Gene Editing. It identifies a potential methodology transfer where the 'Deep Discovery' graph expansion technique could be used to model the search space of CRISPR off-target effects, potentially automating the discovery of safer guide RNAs.",
    commonThemes: ["Optimization of Search Spaces", "High-dimensional Data Analysis", "Safety/Stability in Stochastic Systems"],
    conflicts: ["Paper 1 operates in a simulated, discrete environment (GridWorld), whereas Paper 2 deals with noisy, biological wet-lab data."],
    synthesizedHypotheses: [
      "Application of GNN-based intrinsic motivation to explore the 'state space' of possible gene edits.",
      "Using off-target sequencing data as a negative reward signal for RL-driven guide RNA design."
    ]
  }
];

// Mock Collections
const DEMO_COLLECTIONS: ResearchCollection[] = [
    {
        id: "col_1",
        name: "Q1 Research Goals",
        description: "Focus on Graph Neural Networks applications",
        paperIds: ["doc_1", "doc_3"],
        color: "indigo",
        created: Date.now() - 86400000 * 10
    },
    {
        id: "col_2",
        name: "Bio-Informatics",
        description: "Genomics and Protein folding studies",
        paperIds: ["doc_2", "doc_3"],
        color: "emerald",
        created: Date.now() - 86400000 * 5
    }
];

// Simple UUID generator fallback
const safeUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Mock Notifications
const DEMO_NOTIFICATIONS: AppNotification[] = [
    {
        id: "notif_1",
        recipientId: "ALL",
        type: "ANNOUNCEMENT",
        title: "System Maintenance",
        message: "IRDA Knowledge Graph engine will be updated this weekend.",
        timestamp: Date.now() - 86400000,
        read: false
    },
    {
        id: "notif_2",
        recipientId: "0xRes...1234",
        type: "INFO",
        title: "New Research Uploaded",
        message: "Dr. K. Chen uploaded 'GNNs for Protein Folding' which cites your work.",
        timestamp: Date.now() - 3600000 * 4,
        read: false,
        linkTo: "DETAIL:doc_3"
    },
    {
        id: "notif_3",
        recipientId: "0xRes...1234",
        type: "SUCCESS",
        title: "Synthesis Complete",
        message: "Your cross-paper analysis 'Synthesis: AI & Genomics' is ready.",
        timestamp: Date.now() - 3600000 * 24,
        read: true,
        linkTo: "DETAIL:synth_1"
    }
];

let documents: ResearchDocument[] = [...DEMO_DOCUMENTS];
let reports: SynthesisReport[] = [...DEMO_REPORTS];
let collections: ResearchCollection[] = [...DEMO_COLLECTIONS];
let savedFilters: SavedFilter[] = [];
let notifications: AppNotification[] = [...DEMO_NOTIFICATIONS];

export const storageService = {
  // --- DOCUMENTS ---
  getAllDocuments(): ResearchDocument[] {
    return [...documents].sort((a, b) => b.timestamp - a.timestamp);
  },

  getDocumentById(id: string): ResearchDocument | undefined {
    return documents.find(d => d.id === id);
  },

  addDocument(doc: ResearchDocument): void {
    documents.unshift(doc);
    
    // Auto-create notification for the uploader
    this.addNotification({
        id: safeUUID(),
        recipientId: doc.uploadedBy,
        type: 'SUCCESS',
        title: "Analysis Complete",
        message: `AI has finished processing "${doc.title}". Hypotheses and Knowledge Graph are ready.`,
        timestamp: Date.now(),
        read: false,
        linkTo: `DETAIL:${doc.id}`
    });

    // Simulate "Collaborator Notification"
    if(Math.random() > 0.5) {
       this.addNotification({
           id: safeUUID(),
           recipientId: "ALL", 
           type: 'INFO',
           title: "New Institute Research",
           message: `A new paper "${doc.title.substring(0,20)}..." was added to the shared repository.`,
           timestamp: Date.now(),
           read: false,
           linkTo: `DETAIL:${doc.id}`
       });
    }
  },
  
  updateDocumentTags(docId: string, tags: string[]): void {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
          doc.userTags = tags;
      }
  },

  updateAccessLevel(docId: string, level: AccessLevel): void {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
          doc.accessLevel = level;
      }
  },

  // --- COLLABORATION ---
  addComment(docId: string, comment: Comment): void {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
          doc.comments.push(comment);
      }
  },

  addAnnotation(docId: string, annotation: Annotation): void {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
          doc.annotations.push(annotation);
      }
  },

  shareDocument(docId: string, userAddresses: string[]): void {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
          // Merge unique addresses
          const updated = new Set([...doc.sharedWith, ...userAddresses]);
          doc.sharedWith = Array.from(updated);
          
          // Notify
          userAddresses.forEach(addr => {
              this.addNotification({
                  id: safeUUID(),
                  recipientId: addr,
                  type: 'INFO',
                  title: 'Research Shared With You',
                  message: `You have been given access to "${doc.title}".`,
                  timestamp: Date.now(),
                  read: false,
                  linkTo: `DETAIL:${doc.id}`
              });
          });
      }
  },

  requestAccess(docId: string, requesterId: string, requesterName: string): void {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
          // Notify owner
          this.addNotification({
              id: safeUUID(),
              recipientId: doc.uploadedBy,
              type: 'ALERT',
              title: 'Access Requested',
              message: `${requesterName} is requesting access to "${doc.title}".`,
              timestamp: Date.now(),
              read: false,
              linkTo: `DETAIL:${doc.id}` // In real app, link to permissions management
          });
      }
  },

  // --- COLLECTIONS ---
  getAllCollections(): ResearchCollection[] {
      return [...collections].sort((a,b) => b.created - a.created);
  },

  createCollection(name: string, description: string): ResearchCollection {
      const newCol: ResearchCollection = {
          id: safeUUID(),
          name,
          description,
          paperIds: [],
          color: ['indigo', 'emerald', 'amber', 'purple', 'rose'][Math.floor(Math.random()*5)],
          created: Date.now()
      };
      collections.unshift(newCol);
      return newCol;
  },

  addPapersToCollection(collectionId: string, paperIds: string[]): void {
      const col = collections.find(c => c.id === collectionId);
      if (col) {
          // Add unique ids
          const newSet = new Set([...col.paperIds, ...paperIds]);
          col.paperIds = Array.from(newSet);
      }
  },

  // --- SAVED FILTERS ---
  saveFilter(name: string, config: SavedFilter['config']): SavedFilter {
      const newFilter: SavedFilter = {
          id: safeUUID(),
          name,
          config
      };
      savedFilters.push(newFilter);
      return newFilter;
  },

  getSavedFilters(): SavedFilter[] {
      return [...savedFilters];
  },

  deleteFilter(id: string): void {
      savedFilters = savedFilters.filter(f => f.id !== id);
  },

  // --- REPORTS ---
  getAllReports(): SynthesisReport[] {
    return [...reports].sort((a, b) => b.timestamp - a.timestamp);
  },

  addReport(report: SynthesisReport): void {
    reports.unshift(report);
  },

  // --- NOTIFICATIONS ---
  getNotifications(userId: string): AppNotification[] {
      return notifications
        .filter(n => n.recipientId === 'ALL' || n.recipientId === userId)
        .sort((a,b) => b.timestamp - a.timestamp);
  },

  addNotification(notif: AppNotification): void {
      notifications.unshift(notif);
  },

  markAsRead(notifId: string): void {
      const n = notifications.find(x => x.id === notifId);
      if(n) n.read = true;
  },

  markAllAsRead(userId: string): void {
      notifications.forEach(n => {
          if (n.recipientId === 'ALL' || n.recipientId === userId) {
              n.read = true;
          }
      });
  },

  // --- STATS & UTILS ---
  getStats() {
    const allHypotheses = documents.reduce((acc, doc) => acc + doc.hypotheses.length, 0);
    return {
      totalPapers: documents.length,
      domains: Array.from(new Set(documents.map(d => d.domain))).length,
      totalHypotheses: allHypotheses,
      lastUpdate: documents[0]?.timestamp || Date.now()
    };
  },

  getRecentActivity(): ActivityItem[] {
    const activities: ActivityItem[] = [];

    // 1. Document activities
    documents.forEach(doc => {
      activities.push({
        id: `act_${doc.id}_upload`,
        type: 'UPLOAD',
        content: `Uploaded new research paper: "${doc.title.substring(0, 40)}..."`,
        timestamp: doc.timestamp,
        relatedDocId: doc.id
      });
      
      if (doc.hypotheses.length > 0) {
        activities.push({
          id: `act_${doc.id}_hyp`,
          type: 'HYPOTHESIS',
          content: `AI generated ${doc.hypotheses.length} new research hypotheses for "${doc.title.substring(0, 30)}..."`,
          timestamp: doc.timestamp + 1000 * 60, // 1 min later
          relatedDocId: doc.id
        });
      }
    });

    // 2. Report activities
    reports.forEach(rep => {
      activities.push({
        id: `act_${rep.id}_synth`,
        type: 'SYNTHESIS',
        content: `Gemini 3 generated a cross-paper synthesis: "${rep.title}"`,
        timestamp: rep.timestamp
      });
    });
    
    // 3. Collection activities
    collections.forEach(col => {
        activities.push({
            id: `act_${col.id}_create`,
            type: 'COLLECTION',
            content: `Created new project collection: "${col.name}"`,
            timestamp: col.created
        });
    });

    // 4. Mock System activities
    activities.push({
      id: "sys_1",
      type: 'SYSTEM',
      content: "System updated: Knowledge Graph v2.1 algorithm deployed.",
      timestamp: Date.now() - 86400000 * 10
    });

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  },

  exportToCSV(docs: ResearchDocument[]): string {
    const headers = ["Title", "Domain", "Date", "Authors", "Summary", "User Tags", "Key Concepts", "Research Gaps"];
    const rows = docs.map(d => [
        `"${d.title.replace(/"/g, '""')}"`,
        `"${d.domain}"`,
        new Date(d.timestamp).toLocaleDateString(),
        `"${d.authors.join(', ')}"`,
        `"${d.summary.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${d.userTags.join(', ')}"`,
        `"${d.keyConcepts.join(', ')}"`,
        `"${d.researchGaps.join(', ').replace(/"/g, '""')}"`
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
};
