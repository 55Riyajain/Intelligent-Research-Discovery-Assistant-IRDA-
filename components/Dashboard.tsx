
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { ResearchDocument, UserProfile, ActivityItem, SynthesisReport, GraphNode, ResearchCollection, SavedFilter, AppNotification, Comment, Annotation, AccessLevel } from '../types';
import { KnowledgeGraph } from './KnowledgeGraph';
import { UploadView } from './UploadView';
import { ChatWidget } from './ChatWidget';
import { storageService } from '../services/storageService';
import { generateCrossPaperSynthesis } from '../services/geminiService';
import { graphService } from '../services/graphService';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

type ViewState = 'HOME' | 'LIBRARY' | 'UPLOAD' | 'DETAIL' | 'PROFILE' | 'SYNTHESIS_RESULT' | 'GRAPH_EXPLORER' | 'ANALYTICS';
type ListViewMode = 'GRID' | 'TABLE';

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [selectedDoc, setSelectedDoc] = useState<ResearchDocument | null>(null);
  const [selectedReport, setSelectedReport] = useState<SynthesisReport | null>(null);
  const [documents, setDocuments] = useState<ResearchDocument[]>([]);
  const [collections, setCollections] = useState<ResearchCollection[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null); // Null = All

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [reports, setReports] = useState<SynthesisReport[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ totalPapers: 0, domains: 0, totalHypotheses: 0 });

  // Library State
  const [viewMode, setViewMode] = useState<ListViewMode>('GRID');
  const [filterDomain, setFilterDomain] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  
  // Selection State
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
  
  // Modals & Popups
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUserEmail, setShareUserEmail] = useState('');

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthProgress, setSynthProgress] = useState('');

  // Graph Explorer State
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);
  const [graphFilters, setGraphFilters] = useState({
      showConcepts: true,
      showAuthors: true,
      showInstitutes: true
  });

  // Profile View State
  const [profileTab, setProfileTab] = useState<'TIMELINE' | 'WORKS' | 'SECURITY'>('TIMELINE');

  // Detail View State
  const [newTagInput, setNewTagInput] = useState('');
  const [detailTab, setDetailTab] = useState<'INSIGHTS' | 'DISCUSSION'>('INSIGHTS');
  const [newComment, setNewComment] = useState('');
  const [highlightColor, setHighlightColor] = useState<'yellow' | 'green' | 'pink' | 'blue'>('yellow');

  useEffect(() => {
    // Load data
    const docs = storageService.getAllDocuments();
    setDocuments(docs);
    setCollections(storageService.getAllCollections());
    setSavedFilters(storageService.getSavedFilters());
    setActivities(storageService.getRecentActivity());
    setReports(storageService.getAllReports());
    setStats(storageService.getStats());
    setNotifications(storageService.getNotifications(user.address));
  }, [currentView, isSynthesizing]);

  // Derived Global Graph Data
  const globalGraphData = useMemo(() => {
     const rawData = graphService.buildGlobalGraph(documents);
     // Apply Filters
     const filteredNodes = rawData.nodes.filter(n => {
         if (n.group === 'CONCEPT' && !graphFilters.showConcepts) return false;
         if (n.group === 'AUTHOR' && !graphFilters.showAuthors) return false;
         if (n.group === 'INSTITUTE' && !graphFilters.showInstitutes) return false;
         return true;
     });
     // Filter edges where both source and target exist
     const nodeIds = new Set(filteredNodes.map(n => n.id));
     const filteredEdges = rawData.edges.filter(e => 
        nodeIds.has(typeof e.source === 'string' ? e.source : (e.source as GraphNode).id) && 
        nodeIds.has(typeof e.target === 'string' ? e.target : (e.target as GraphNode).id)
     );
     return { nodes: filteredNodes, edges: filteredEdges };
  }, [documents, graphFilters]);

  const handleAnalysisComplete = (doc: ResearchDocument) => {
    storageService.addDocument(doc);
    // Refresh notifications immediately to show the "Success" alert
    setNotifications(storageService.getNotifications(user.address));
    setSelectedDoc(doc);
    setCurrentView('DETAIL');
    setIsLoading(false);
  };

  const togglePaperSelection = (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSet = new Set(selectedPaperIds);
    if (newSet.has(docId)) {
      newSet.delete(docId);
    } else {
      newSet.add(docId);
    }
    setSelectedPaperIds(newSet);
  };

  const handleSynthesize = async () => {
    if (selectedPaperIds.size < 2) return;
    setIsSynthesizing(true);
    setSynthProgress('Initializing Gemini 3 cross-paper reasoning engine...');
    
    try {
      const docsToSynthesize = documents.filter(d => selectedPaperIds.has(d.id));
      const report = await generateCrossPaperSynthesis(docsToSynthesize, (msg) => setSynthProgress(msg));
      storageService.addReport(report);
      setSelectedReport(report);
      setSelectedPaperIds(new Set()); // Clear selection
      setCurrentView('SYNTHESIS_RESULT');
    } catch (error) {
      alert("Synthesis failed. Please try again.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCreateCollection = () => {
      if(!newCollectionName.trim()) return;
      storageService.createCollection(newCollectionName, "New user collection");
      setCollections(storageService.getAllCollections());
      setNewCollectionName('');
      setShowCollectionModal(false);
  };

  const handleAddToCollection = (colId: string) => {
      if(selectedPaperIds.size === 0) return;
      storageService.addPapersToCollection(colId, Array.from(selectedPaperIds));
      setCollections(storageService.getAllCollections());
      alert(`Added ${selectedPaperIds.size} papers to collection.`);
      setSelectedPaperIds(new Set()); // Reset selection
  };

  const handleSaveView = () => {
      if(!newViewName.trim()) return;
      storageService.saveFilter(newViewName, { domain: filterDomain, searchQuery, sortOrder });
      setSavedFilters(storageService.getSavedFilters());
      setNewViewName('');
      setShowSaveViewModal(false);
  };

  const applySavedFilter = (filter: SavedFilter) => {
      setFilterDomain(filter.config.domain);
      setSearchQuery(filter.config.searchQuery);
      setSortOrder(filter.config.sortOrder);
  };

  const handleExportCSV = () => {
      const docsToExport = getFilteredDocuments(); // Export currently visible
      const csvContent = storageService.exportToCSV(docsToExport);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `research_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = () => {
      // Trigger browser print, user can save as PDF
      window.print();
  };

  const handleAddTag = () => {
      if(!selectedDoc || !newTagInput.trim()) return;
      const updatedTags = [...selectedDoc.userTags, newTagInput.trim()];
      storageService.updateDocumentTags(selectedDoc.id, updatedTags);
      
      // Update local state
      const updatedDoc = { ...selectedDoc, userTags: updatedTags };
      setSelectedDoc(updatedDoc);
      // Update documents list state
      setDocuments(documents.map(d => d.id === selectedDoc.id ? updatedDoc : d));
      setNewTagInput('');
  };

  const removeTag = (tag: string) => {
    if(!selectedDoc) return;
    const updatedTags = selectedDoc.userTags.filter(t => t !== tag);
    storageService.updateDocumentTags(selectedDoc.id, updatedTags);
    const updatedDoc = { ...selectedDoc, userTags: updatedTags };
    setSelectedDoc(updatedDoc);
    setDocuments(documents.map(d => d.id === selectedDoc.id ? updatedDoc : d));
  };

  // Notification Handling
  const handleMarkRead = (id: string) => {
    storageService.markAsRead(id);
    setNotifications(storageService.getNotifications(user.address));
  };
  
  const handleMarkAllRead = () => {
    storageService.markAllAsRead(user.address);
    setNotifications(storageService.getNotifications(user.address));
  };

  const handleNotificationClick = (notif: AppNotification) => {
      handleMarkRead(notif.id);
      if(notif.linkTo) {
          if(notif.linkTo.startsWith("DETAIL:")) {
              const docId = notif.linkTo.split(":")[1];
              const doc = documents.find(d => d.id === docId);
              if(doc) {
                  setSelectedDoc(doc);
                  setCurrentView('DETAIL');
              }
          }
      }
      setShowNotifications(false);
  };

  // Sharing & Comments
  const handleShare = () => {
      if(!selectedDoc || !shareUserEmail.trim()) return;
      // Mock address lookup
      const mockAddr = `0xUser...${Math.floor(Math.random()*1000)}`;
      storageService.shareDocument(selectedDoc.id, [mockAddr]);
      
      // Refresh doc
      const updatedDoc = storageService.getDocumentById(selectedDoc.id);
      if(updatedDoc) setSelectedDoc(updatedDoc);
      
      setShareUserEmail('');
      setShowShareModal(false);
      alert(`Shared with ${mockAddr}`);
  };

  const handlePostComment = () => {
      if(!selectedDoc || !newComment.trim()) return;
      const comment: Comment = {
          id: `c_${Date.now()}`,
          userId: user.address,
          userName: user.name,
          text: newComment,
          timestamp: Date.now()
      };
      storageService.addComment(selectedDoc.id, comment);
      
      // Refresh
      const updatedDoc = { ...selectedDoc, comments: [...selectedDoc.comments, comment] };
      setSelectedDoc(updatedDoc);
      setDocuments(documents.map(d => d.id === selectedDoc.id ? updatedDoc : d));
      setNewComment('');
  };

  const handleTextSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      
      const range = selection.getRangeAt(0);
      const text = selection.toString();
      
      // Simple offset calculation simulation (In real app, needs robust DOM traversal)
      // We'll just append it for now as a demo of the "Action"
      
      if(confirm(`Highlight selection: "${text}"?`)) {
          if(!selectedDoc) return;
          const annotation: Annotation = {
              id: `a_${Date.now()}`,
              targetField: 'abstract',
              startOffset: 0, // Placeholder
              endOffset: 0, // Placeholder
              text: text,
              color: highlightColor
          };
          storageService.addAnnotation(selectedDoc.id, annotation);
          
          // Refresh
          const updatedDoc = { ...selectedDoc, annotations: [...selectedDoc.annotations, annotation] };
          setSelectedDoc(updatedDoc);
          setDocuments(documents.map(d => d.id === selectedDoc.id ? updatedDoc : d));
      }
      selection.removeAllRanges();
  };

  const handleRequestAccess = (docId: string) => {
      storageService.requestAccess(docId, user.address, user.name);
      alert("Access request sent to the document owner.");
  };

  const handleChangeAccessLevel = (newLevel: AccessLevel) => {
      if(!selectedDoc) return;
      storageService.updateAccessLevel(selectedDoc.id, newLevel);
      const updatedDoc = { ...selectedDoc, accessLevel: newLevel };
      setSelectedDoc(updatedDoc);
      setDocuments(documents.map(d => d.id === selectedDoc.id ? updatedDoc : d));
  };

  const getFilteredDocuments = () => {
    let docs = documents;
    
    // 1. Filter by Collection
    if (activeCollectionId) {
        const col = collections.find(c => c.id === activeCollectionId);
        if (col) {
            docs = docs.filter(d => col.paperIds.includes(d.id));
        }
    }

    // 2. Filter by Search & Domain
    return docs
      .filter(doc => {
        const matchesDomain = filterDomain === 'All' || doc.domain === filterDomain;
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              doc.keyConcepts.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              doc.userTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesDomain && matchesSearch;
      })
      .sort((a, b) => sortOrder === 'NEWEST' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
  };

  const uniqueDomains = ['All', ...Array.from(new Set(documents.map(d => d.domain)))];
  const unreadCount = notifications.filter(n => !n.read).length;

  // --- SUB-COMPONENTS ---

  const Sidebar = () => (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 print:hidden">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">IR</div>
        <span className="font-bold text-white text-lg">IRDA</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <button 
          onClick={() => setCurrentView('HOME')}
          className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'HOME' ? 'bg-indigo-900/50 text-white' : 'hover:bg-slate-800'}`}
        >
          <i className="fa-solid fa-chart-line w-5"></i> Dashboard
        </button>
        <button 
          onClick={() => { setCurrentView('LIBRARY'); setActiveCollectionId(null); }}
          className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'LIBRARY' && activeCollectionId === null ? 'bg-indigo-900/50 text-white' : 'hover:bg-slate-800'}`}
        >
          <i className="fa-solid fa-layer-group w-5"></i> All Papers
        </button>
        <button 
          onClick={() => setCurrentView('ANALYTICS')}
          className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'ANALYTICS' ? 'bg-indigo-900/50 text-white' : 'hover:bg-slate-800'}`}
        >
          <i className="fa-solid fa-chart-pie w-5"></i> Analytics
        </button>
        <button 
          onClick={() => setCurrentView('GRAPH_EXPLORER')}
          className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'GRAPH_EXPLORER' ? 'bg-indigo-900/50 text-white' : 'hover:bg-slate-800'}`}
        >
          <i className="fa-solid fa-circle-nodes w-5"></i> Graph Explorer
        </button>
        <button 
          onClick={() => setCurrentView('PROFILE')}
          className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'PROFILE' ? 'bg-indigo-900/50 text-white' : 'hover:bg-slate-800'}`}
        >
          <i className="fa-regular fa-id-badge w-5"></i> My Profile
        </button>
        <button 
          onClick={() => setCurrentView('UPLOAD')}
          className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${currentView === 'UPLOAD' ? 'bg-indigo-900/50 text-white' : 'hover:bg-slate-800'}`}
        >
          <i className="fa-solid fa-cloud-arrow-up w-5"></i> Upload New
        </button>

        {/* Notifications Button */}
        <button 
          onClick={() => setShowNotifications(true)}
          className="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors hover:bg-slate-800 mt-2"
        >
            <div className="relative">
                <i className="fa-solid fa-bell w-5"></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
                )}
            </div>
            <span>Notifications</span>
            {unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
            )}
        </button>
        
        {/* Collections Section */}
        <div className="pt-4 mt-2 mb-2">
            <div className="flex justify-between items-center px-4 mb-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Projects / Collections</p>
                <button onClick={() => setShowCollectionModal(true)} className="text-xs text-slate-400 hover:text-white"><i className="fa-solid fa-plus"></i></button>
            </div>
            {collections.map(col => (
                <button 
                    key={col.id}
                    onClick={() => { setCurrentView('LIBRARY'); setActiveCollectionId(col.id); }}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${currentView === 'LIBRARY' && activeCollectionId === col.id ? 'bg-indigo-900/50 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                    <i className={`fa-regular fa-folder text-${col.color}-400 w-5`}></i> {col.name}
                </button>
            ))}
        </div>

        <div className="pt-4 mt-4 border-t border-slate-800">
          <div className="px-4 text-sm flex flex-col gap-2">
            <span className="flex justify-between"><span>Papers</span> <span className="text-white">{stats.totalPapers}</span></span>
            <span className="flex justify-between"><span>Hypotheses</span> <span className="text-white">{stats.totalHypotheses}</span></span>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors" onClick={() => setCurrentView('PROFILE')}>
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.institute}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors text-sm"
        >
          <i className="fa-solid fa-right-from-bracket w-5"></i> Sign Out
        </button>
      </div>
    </div>
  );

  const NotificationsPanel = () => (
      <>
        {showNotifications && (
            <div className="fixed inset-0 z-50 flex justify-end">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowNotifications(false)}></div>
                
                {/* Panel */}
                <div className="relative w-full max-w-sm bg-white shadow-2xl h-full flex flex-col animate-slide-in-right">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Notifications</h3>
                        <div className="flex gap-2">
                            <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Mark all read</button>
                            <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <i className="fa-regular fa-bell-slash text-2xl mb-2"></i>
                                <p className="text-sm">No notifications</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors flex gap-3 ${notif.read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50'}`}
                                    >
                                        <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${notif.read ? 'bg-slate-200' : 'bg-indigo-500'}`}></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm ${notif.read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>{notif.title}</h4>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                                            {notif.type === 'ANNOUNCEMENT' && (
                                                <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200 font-bold">ANNOUNCEMENT</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </>
  );

  const AnalyticsView = () => {
    // Data Preparation
    const years = useMemo(() => {
        const counts: Record<string, number> = {};
        documents.forEach(d => {
            const year = d.publicationDate.split('-')[0];
            counts[year] = (counts[year] || 0) + 1;
        });
        return Object.entries(counts).sort((a,b) => a[0].localeCompare(b[0]));
    }, [documents]);

    const domains = useMemo(() => {
        const counts: Record<string, number> = {};
        documents.forEach(d => { counts[d.domain] = (counts[d.domain] || 0) + 1; });
        return Object.entries(counts).sort((a,b) => b[1] - a[1]);
    }, [documents]);

    const topAuthors = useMemo(() => {
        const authorStats: Record<string, { papers: number, citations: number }> = {};
        documents.forEach(d => {
            d.authors.forEach(a => {
                if(!authorStats[a]) authorStats[a] = { papers: 0, citations: 0 };
                authorStats[a].papers += 1;
                authorStats[a].citations += d.citationCount;
            });
        });
        return Object.entries(authorStats)
            .sort((a,b) => b[1].citations - a[1].citations)
            .slice(0, 5);
    }, [documents]);

    // Institute Graph Logic
    const instituteGraph = useMemo(() => {
        const nodes = new Map();
        const links: any[] = [];
        
        // Extract Institutes
        const institutes = Array.from(new Set(documents.map(d => d.institute).filter(Boolean)));
        institutes.forEach(inst => nodes.set(inst, { id: inst, group: 'INSTITUTE', val: 10 }));

        // Connect Institutes via shared authors or domains
        // For simple demo: Connect institutes if they publish in the same domain
        const domainMap: Record<string, string[]> = {};
        documents.forEach(d => {
            if(!domainMap[d.domain]) domainMap[d.domain] = [];
            if(d.institute && !domainMap[d.domain].includes(d.institute)) {
                domainMap[d.domain].push(d.institute);
            }
        });

        Object.values(domainMap).forEach(instList => {
            if(instList.length > 1) {
                for(let i=0; i<instList.length; i++) {
                    for(let j=i+1; j<instList.length; j++) {
                        links.push({ source: instList[i], target: instList[j] });
                    }
                }
            }
        });

        return { nodes: Array.from(nodes.values()), edges: links };
    }, [documents]);

    return (
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Research Analytics</h1>
                    <p className="text-slate-500">Insights into publication trends, collaborations, and impact.</p>
                </div>
                <div className="flex gap-2">
                    <select className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
                        <option>Last 12 Months</option>
                        <option>All Time</option>
                    </select>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Export Report</button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Papers</p>
                    <p className="text-3xl font-bold text-slate-900">{documents.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Citations</p>
                    <p className="text-3xl font-bold text-emerald-600">
                        {(documents.reduce((acc, d) => acc + d.citationCount, 0) / (documents.length || 1)).toFixed(1)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Unique Domains</p>
                    <p className="text-3xl font-bold text-indigo-600">{domains.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Datasets</p>
                    <p className="text-3xl font-bold text-amber-600">
                        {documents.reduce((acc, d) => acc + (d.attachments?.filter(a => a.type === 'CSV').length || 0), 0)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Publication Trends Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6">Publication Timeline</h3>
                    <div className="flex-1 flex items-end gap-4 relative px-4 pb-6">
                        {years.map(([year, count]) => {
                            const height = `${(count / Math.max(...years.map(y => y[1]))) * 100}%`;
                            return (
                                <div key={year} className="flex-1 flex flex-col justify-end group relative h-full">
                                    <div 
                                        className="bg-indigo-500 w-full rounded-t-sm opacity-80 group-hover:opacity-100 transition-all" 
                                        style={{ height }}
                                    ></div>
                                    <span className="text-xs text-slate-500 absolute -bottom-6 w-full text-center">{year}</span>
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded">
                                        {count} papers
                                    </div>
                                </div>
                            );
                        })}
                        {/* Horizontal Axis Line */}
                        <div className="absolute bottom-0 left-0 w-full h-px bg-slate-200"></div>
                    </div>
                </div>

                {/* Topic Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6">Research Topics</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {domains.map(([domain, count], i) => (
                            <div key={domain} className="mb-4 last:mb-0">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">{domain}</span>
                                    <span className="text-slate-500">{count} ({Math.round(count/documents.length*100)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div 
                                        className={`h-2 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500'][i % 5]}`} 
                                        style={{ width: `${(count / documents.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Institute Network Map */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm h-96 relative overflow-hidden">
                    <div className="absolute top-4 left-4 z-10">
                        <h3 className="font-bold text-slate-800">Institute Collaboration Map</h3>
                        <p className="text-xs text-slate-500">Connections based on shared research domains</p>
                    </div>
                    <div className="w-full h-full bg-slate-50">
                        {/* Reuse KnowledgeGraph but with Institute Data */}
                        <KnowledgeGraph data={instituteGraph} />
                    </div>
                </div>

                {/* Top Authors */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4">Top Contributors</h3>
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {topAuthors.map(([name, stat], i) => (
                            <div key={name} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white
                                    ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-400' : 'bg-indigo-400'}
                                `}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-800">{name}</p>
                                    <p className="text-xs text-slate-500">{stat.papers} papers • {stat.citations} citations</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const HomeView = () => (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <header className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user.name.split(' ')[1] || user.name}</h1>
            <p className="text-slate-500">Here's an overview of your research activities and insights.</p>
        </div>
        {/* Mobile/Quick notification trigger if needed */}
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Papers</p>
            <p className="text-3xl font-bold text-slate-900">{stats.totalPapers}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl">
            <i className="fa-regular fa-file-lines"></i>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Research Domains</p>
            <p className="text-3xl font-bold text-slate-900">{stats.domains}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl">
            <i className="fa-solid fa-tags"></i>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">AI Hypotheses</p>
            <p className="text-3xl font-bold text-slate-900">{stats.totalHypotheses}</p>
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl">
            <i className="fa-solid fa-lightbulb"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Personalized Activity Feed</h2>
            <button className="text-sm text-indigo-600 font-medium hover:underline">View All</button>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No recent activity found.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`
                    w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white
                    ${act.type === 'UPLOAD' ? 'bg-indigo-500' : ''}
                    ${act.type === 'HYPOTHESIS' ? 'bg-amber-500' : ''}
                    ${act.type === 'SYNTHESIS' ? 'bg-purple-500' : ''}
                    ${act.type === 'COLLECTION' ? 'bg-emerald-500' : ''}
                    ${act.type === 'SYSTEM' ? 'bg-slate-500' : ''}
                  `}>
                    {act.type === 'UPLOAD' && <i className="fa-solid fa-file-arrow-up"></i>}
                    {act.type === 'HYPOTHESIS' && <i className="fa-solid fa-lightbulb"></i>}
                    {act.type === 'SYNTHESIS' && <i className="fa-solid fa-wand-magic-sparkles"></i>}
                    {act.type === 'COLLECTION' && <i className="fa-regular fa-folder-open"></i>}
                    {act.type === 'SYSTEM' && <i className="fa-solid fa-gear"></i>}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-800 text-sm font-medium">{act.content}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {act.relatedDocId && (
                    <button 
                      onClick={() => {
                        const doc = documents.find(d => d.id === act.relatedDocId);
                        if(doc) { setSelectedDoc(doc); setCurrentView('DETAIL'); }
                      }}
                      className="text-slate-400 hover:text-indigo-600 self-center"
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions & Recent */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 text-white shadow-lg">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setCurrentView('UPLOAD')}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-medium flex flex-col items-center gap-2 transition-colors border border-white/10"
              >
                <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                Upload Paper
              </button>
              <button 
                onClick={() => setCurrentView('LIBRARY')}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-medium flex flex-col items-center gap-2 transition-colors border border-white/10"
              >
                <i className="fa-solid fa-magnifying-glass text-xl"></i>
                Browse Library
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
             <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 text-slate-500">
               <i className="fa-solid fa-wand-magic-sparkles text-purple-500 mr-2"></i>
               Smart Reports
             </h2>
             <div className="space-y-3">
               {reports.map(rep => (
                 <div key={rep.id} onClick={() => { setSelectedReport(rep); setCurrentView('SYNTHESIS_RESULT'); }} className="group cursor-pointer">
                    <h4 className="text-sm font-medium text-slate-800 group-hover:text-purple-600 transition-colors truncate">{rep.title}</h4>
                    <p className="text-xs text-slate-400">{new Date(rep.timestamp).toLocaleDateString()}</p>
                 </div>
               ))}
               {reports.length === 0 && <p className="text-slate-500 text-sm">No reports generated yet.</p>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const LibraryView = () => {
      const filteredDocs = getFilteredDocuments();
      
      return (
          <div className="h-full flex flex-col bg-white">
              <div className="p-6 border-b border-slate-200 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-slate-900">Research Library</h2>
                      <div className="flex gap-2">
                           <button onClick={() => setViewMode('GRID')} className={`p-2 rounded ${viewMode === 'GRID' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><i className="fa-solid fa-grip"></i></button>
                           <button onClick={() => setViewMode('TABLE')} className={`p-2 rounded ${viewMode === 'TABLE' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><i className="fa-solid fa-list"></i></button>
                      </div>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center">
                      <div className="relative flex-1 max-w-md">
                          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                          <input 
                              type="text" 
                              placeholder="Search titles, concepts, tags..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>
                      <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                          {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="NEWEST">Newest First</option>
                          <option value="OLDEST">Oldest First</option>
                      </select>
                      {savedFilters.length > 0 && (
                          <select onChange={(e) => { const f = savedFilters.find(x => x.id === e.target.value); if(f) applySavedFilter(f); }} className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm outline-none font-medium">
                              <option value="">Load Saved View</option>
                              {savedFilters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                      )}
                      <button onClick={() => setShowSaveViewModal(true)} className="text-slate-400 hover:text-indigo-600 text-sm"><i className="fa-solid fa-floppy-disk"></i></button>
                  </div>

                  {/* Bulk Actions */}
                  {selectedPaperIds.size > 0 && (
                      <div className="flex items-center gap-4 bg-indigo-600 text-white p-3 rounded-lg shadow-md animate-fade-in">
                          <span className="font-bold text-sm">{selectedPaperIds.size} Selected</span>
                          <div className="h-4 w-px bg-white/30"></div>
                          <button onClick={handleSynthesize} className="text-sm font-medium hover:text-indigo-200 flex items-center gap-2">
                              <i className="fa-solid fa-wand-magic-sparkles"></i> Synthesize
                          </button>
                          <button onClick={() => setShowCollectionModal(true)} className="text-sm font-medium hover:text-indigo-200 flex items-center gap-2">
                              <i className="fa-regular fa-folder-open"></i> Add to Collection
                          </button>
                          <div className="flex-1"></div>
                          <button onClick={() => setSelectedPaperIds(new Set())} className="text-xs hover:text-indigo-200">Clear</button>
                      </div>
                  )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                  {isSynthesizing ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                          <h3 className="text-xl font-bold text-slate-800">Generating Research Synthesis</h3>
                          <p className="text-slate-500 mt-2 max-w-md">{synthProgress}</p>
                      </div>
                  ) : filteredDocs.length === 0 ? (
                      <div className="text-center py-20 text-slate-400">
                          <i className="fa-regular fa-file-excel text-4xl mb-4"></i>
                          <p>No documents found matching your criteria.</p>
                      </div>
                  ) : (
                      <>
                        {viewMode === 'GRID' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredDocs.map(doc => (
                                    <div 
                                        key={doc.id} 
                                        onClick={() => { setSelectedDoc(doc); setCurrentView('DETAIL'); }}
                                        className={`
                                            group bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-lg relative
                                            ${selectedPaperIds.has(doc.id) ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-300'}
                                        `}
                                    >
                                        <div className="absolute top-4 right-4 z-10" onClick={(e) => togglePaperSelection(doc.id, e)}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedPaperIds.has(doc.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 hover:border-indigo-400'}`}>
                                                {selectedPaperIds.has(doc.id) && <i className="fa-solid fa-check text-xs"></i>}
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide mb-2
                                                ${doc.domain === 'Artificial Intelligence' ? 'bg-indigo-100 text-indigo-700' : 
                                                  doc.domain === 'Genomics' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}
                                            `}>
                                                {doc.domain}
                                            </span>
                                            <h3 className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{doc.title}</h3>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-4 line-clamp-3">{doc.abstract}</p>
                                        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                                            <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><i className="fa-solid fa-quote-right"></i> {doc.citationCount}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="text-xs text-slate-500 uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-10"></th>
                                        <th className="px-4 py-3">Title</th>
                                        <th className="px-4 py-3">Domain</th>
                                        <th className="px-4 py-3">Authors</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 text-right">Citations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredDocs.map(doc => (
                                        <tr key={doc.id} onClick={() => { setSelectedDoc(doc); setCurrentView('DETAIL'); }} className="hover:bg-slate-50 cursor-pointer">
                                            <td className="px-4 py-3" onClick={(e) => togglePaperSelection(doc.id, e)}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedPaperIds.has(doc.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                                    {selectedPaperIds.has(doc.id) && <i className="fa-solid fa-check text-[10px]"></i>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{doc.title}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{doc.domain}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{doc.authors.slice(0, 2).join(', ')}{doc.authors.length > 2 && '...'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{new Date(doc.timestamp).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-right text-sm text-slate-500">{doc.citationCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                      </>
                  )}
              </div>
          </div>
      );
  };

  const DetailView = () => {
      if(!selectedDoc) return null;
      
      const isOwner = selectedDoc.uploadedBy === user.address;
      const hasAccess = selectedDoc.accessLevel === AccessLevel.PUBLIC || 
                        selectedDoc.accessLevel === AccessLevel.INSTITUTE || 
                        (selectedDoc.accessLevel === AccessLevel.PRIVATE && (isOwner || selectedDoc.sharedWith.includes(user.address)));

      if(!hasAccess) {
          return (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6 text-3xl">
                      <i className="fa-solid fa-lock"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
                  <p className="text-slate-500 max-w-md mb-8">This document is encrypted and private. You must request access from the owner to view its contents.</p>
                  <button onClick={() => handleRequestAccess(selectedDoc.id)} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                      Request Access
                  </button>
                  <button onClick={() => setCurrentView('LIBRARY')} className="text-slate-500 hover:text-slate-800 mt-4 text-sm underline">Back to Library</button>
              </div>
          );
      }

      return (
          <div className="h-full flex flex-col bg-white">
              {/* Toolbar */}
              <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between bg-slate-50/50">
                  <button onClick={() => setCurrentView('LIBRARY')} className="text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-2">
                      <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                  <div className="flex gap-3">
                      <button onClick={handleExportPDF} className="text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded text-sm transition-colors"><i className="fa-solid fa-print"></i> Print</button>
                      <button onClick={() => setShowShareModal(true)} className="text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded text-sm transition-colors"><i className="fa-solid fa-share-nodes"></i> Share</button>
                      {isOwner && (
                         <div className="relative group">
                             <button className="text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded text-sm transition-colors"><i className="fa-solid fa-shield-halved"></i> Access</button>
                             <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-20">
                                 <button onClick={() => handleChangeAccessLevel(AccessLevel.PUBLIC)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">Public</button>
                                 <button onClick={() => handleChangeAccessLevel(AccessLevel.INSTITUTE)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">Institute Only</button>
                                 <button onClick={() => handleChangeAccessLevel(AccessLevel.PRIVATE)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">Private</button>
                             </div>
                         </div>
                      )}
                  </div>
              </div>

              <div className="flex-1 overflow-hidden flex">
                  {/* Left: Content */}
                  <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto">
                      <div className="mb-8">
                          <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2 block">{selectedDoc.domain}</span>
                          <h1 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">{selectedDoc.title}</h1>
                          <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                              <span>{selectedDoc.authors.join(', ')}</span>
                              <span>•</span>
                              <span>{selectedDoc.institute}</span>
                              <span>•</span>
                              <span>{new Date(selectedDoc.timestamp).toLocaleDateString()}</span>
                          </div>
                          
                          {/* Access Badge */}
                          <div className="flex gap-2 mb-6">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                                ${selectedDoc.accessLevel === AccessLevel.PUBLIC ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                  selectedDoc.accessLevel === AccessLevel.INSTITUTE ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}
                              `}>
                                  <i className={`fa-solid ${selectedDoc.accessLevel === AccessLevel.PUBLIC ? 'fa-globe' : selectedDoc.accessLevel === AccessLevel.INSTITUTE ? 'fa-building-columns' : 'fa-lock'}`}></i>
                                  {selectedDoc.accessLevel}
                              </span>
                              {selectedDoc.encryptionHash && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200" title={selectedDoc.encryptionHash}>
                                      <i className="fa-solid fa-key"></i> Encrypted
                                  </span>
                              )}
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-8">
                              {selectedDoc.userTags.map(tag => (
                                  <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                                      {tag}
                                      <button onClick={() => removeTag(tag)} className="hover:text-red-500"><i className="fa-solid fa-times"></i></button>
                                  </span>
                              ))}
                              <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="+ Tag" 
                                    value={newTagInput}
                                    onChange={(e) => setNewTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                    className="bg-transparent border-b border-slate-300 text-xs w-20 focus:w-32 transition-all focus:border-indigo-500 outline-none px-1 py-1"
                                  />
                              </div>
                          </div>
                          
                          {/* Interactive Abstract */}
                          <div className="prose prose-slate max-w-none mb-10" onMouseUp={handleTextSelection}>
                              <h3 className="text-lg font-bold text-slate-900 mb-2">Abstract</h3>
                              <p className="text-slate-600 leading-relaxed p-4 bg-slate-50 rounded-lg border border-slate-100 select-text">
                                  {selectedDoc.abstract}
                              </p>
                              {selectedDoc.annotations.length > 0 && (
                                  <div className="mt-2 text-xs text-slate-500">
                                      <i className="fa-solid fa-highlighter text-amber-50 mr-1"></i> {selectedDoc.annotations.length} highlights
                                  </div>
                              )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                              <div>
                                  <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Key Concepts</h4>
                                  <ul className="space-y-2">
                                      {selectedDoc.keyConcepts.map(c => <li key={c} className="text-sm text-slate-600 flex items-start gap-2"><i className="fa-solid fa-angle-right text-indigo-400 mt-1"></i> {c}</li>)}
                                  </ul>
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Identified Research Gaps</h4>
                                  <ul className="space-y-2">
                                      {selectedDoc.researchGaps.map(g => <li key={g} className="text-sm text-slate-600 flex items-start gap-2"><i className="fa-regular fa-circle-question text-rose-400 mt-1"></i> {g}</li>)}
                                  </ul>
                              </div>
                          </div>

                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-10">
                              <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                  <i className="fa-solid fa-lightbulb text-indigo-500"></i> AI Generated Hypotheses
                              </h3>
                              <div className="space-y-4">
                                  {selectedDoc.hypotheses.map((h, i) => (
                                      <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                                          <p className="text-slate-800 font-medium text-sm">{h}</p>
                                          <div className="mt-2 flex gap-2">
                                              <button className="text-[10px] text-slate-400 hover:text-indigo-600 font-bold uppercase"><i className="fa-solid fa-flask"></i> Design Experiment</button>
                                              <button className="text-[10px] text-slate-400 hover:text-indigo-600 font-bold uppercase"><i className="fa-solid fa-magnifying-glass"></i> Validate</button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="mb-8">
                               <h3 className="text-lg font-bold text-slate-900 mb-4">Detailed Summary</h3>
                               <div className="prose prose-sm max-w-none text-slate-600">
                                   <div dangerouslySetInnerHTML={{ __html: selectedDoc.summary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                               </div>
                          </div>
                      </div>
                  </div>

                  {/* Right Panel: Graph & Discussion */}
                  <div className="w-80 border-l border-slate-200 bg-slate-50 flex flex-col">
                      <div className="flex border-b border-slate-200">
                          <button onClick={() => setDetailTab('INSIGHTS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${detailTab === 'INSIGHTS' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Graph</button>
                          <button onClick={() => setDetailTab('DISCUSSION')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${detailTab === 'DISCUSSION' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Comments ({selectedDoc.comments.length})</button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto">
                          {detailTab === 'INSIGHTS' ? (
                              <div className="h-full flex flex-col">
                                  <div className="h-64 bg-white border-b border-slate-200 relative">
                                       <KnowledgeGraph data={selectedDoc.knowledgeGraph} />
                                       <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 pointer-events-none">Local Graph</div>
                                  </div>
                                  <div className="p-4">
                                      <h4 className="font-bold text-slate-800 text-sm mb-3">Methods & Tools</h4>
                                      <div className="flex flex-wrap gap-2 mb-6">
                                          {selectedDoc.methods.map(m => <span key={m} className="px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs">{m}</span>)}
                                          {selectedDoc.tools.map(t => <span key={t} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs">{t}</span>)}
                                      </div>
                                      
                                      <h4 className="font-bold text-slate-800 text-sm mb-3">Attachments</h4>
                                      <div className="space-y-2">
                                          {selectedDoc.attachments.map((att, i) => (
                                              <div key={i} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 text-xs">
                                                  <i className={`fa-solid ${att.type === 'PDF' ? 'fa-file-pdf text-red-500' : att.type === 'CSV' ? 'fa-file-csv text-green-500' : 'fa-file text-slate-400'}`}></i>
                                                  <div className="flex-1 truncate">{att.name}</div>
                                                  <span className="text-slate-400">{att.size}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <div className="p-4 flex flex-col h-full">
                                  <div className="flex-1 space-y-4 mb-4">
                                      {selectedDoc.comments.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">No comments yet.</p>}
                                      {selectedDoc.comments.map(comment => (
                                          <div key={comment.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                              <div className="flex justify-between items-start mb-1">
                                                  <span className="font-bold text-xs text-slate-900">{comment.userName}</span>
                                                  <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleDateString()}</span>
                                              </div>
                                              <p className="text-sm text-slate-600">{comment.text}</p>
                                          </div>
                                      ))}
                                  </div>
                                  <div className="mt-auto">
                                      <textarea 
                                          value={newComment}
                                          onChange={e => setNewComment(e.target.value)}
                                          placeholder="Add a comment..."
                                          className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none resize-none h-20 mb-2"
                                      ></textarea>
                                      <button onClick={handlePostComment} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700">Post Comment</button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const SynthesisResultView = () => {
      if(!selectedReport) return null;
      return (
          <div className="h-full bg-white flex flex-col">
              <div className="border-b border-slate-200 px-8 py-4 flex justify-between items-center bg-purple-50">
                   <div>
                       <div className="flex items-center gap-2 mb-1">
                           <span className="bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">AI Synthesis</span>
                           <span className="text-slate-500 text-xs">{new Date(selectedReport.timestamp).toLocaleString()}</span>
                       </div>
                       <h2 className="text-xl font-bold text-slate-900">{selectedReport.title}</h2>
                   </div>
                   <button onClick={() => setCurrentView('LIBRARY')} className="text-slate-500 hover:text-slate-800"><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 mb-8">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Executive Summary</h3>
                      <p className="text-slate-700 leading-relaxed">{selectedReport.executiveSummary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                          <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><i className="fa-solid fa-layer-group"></i> Common Themes</h3>
                          <ul className="space-y-2">
                              {selectedReport.commonThemes.map((t, i) => (
                                  <li key={i} className="flex gap-2 text-indigo-800 text-sm">
                                      <span className="font-bold">•</span> {t}
                                  </li>
                              ))}
                          </ul>
                      </div>
                      <div className="bg-rose-50 p-6 rounded-xl border border-rose-100">
                          <h3 className="font-bold text-rose-900 mb-4 flex items-center gap-2"><i className="fa-solid fa-bolt"></i> Conflicts & Contrasts</h3>
                          <ul className="space-y-2">
                              {selectedReport.conflicts.map((c, i) => (
                                  <li key={i} className="flex gap-2 text-rose-800 text-sm">
                                      <span className="font-bold">!</span> {c}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-8 rounded-xl border border-amber-100 shadow-sm">
                      <h3 className="text-xl font-bold text-amber-900 mb-6 flex items-center gap-3">
                          <i className="fa-solid fa-lightbulb text-2xl"></i> Novel Research Opportunities
                      </h3>
                      <div className="space-y-4">
                          {selectedReport.synthesizedHypotheses.map((h, i) => (
                              <div key={i} className="bg-white/80 p-4 rounded-lg border border-amber-200">
                                  <span className="text-amber-500 font-bold text-xs uppercase tracking-wider mb-1 block">Hypothesis {i+1}</span>
                                  <p className="text-slate-800 font-medium">{h}</p>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-slate-200">
                      <h4 className="font-bold text-slate-500 text-xs uppercase mb-4">Source Documents</h4>
                      <div className="flex flex-wrap gap-4">
                          {documents.filter(d => selectedReport.sourceDocIds.includes(d.id)).map(doc => (
                              <div key={doc.id} onClick={() => { setSelectedDoc(doc); setCurrentView('DETAIL'); }} className="p-3 border border-slate-200 rounded-lg hover:border-indigo-400 cursor-pointer bg-slate-50 w-64">
                                  <p className="font-bold text-slate-800 text-sm truncate">{doc.title}</p>
                                  <p className="text-xs text-slate-500">{doc.authors[0]} et al.</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const GraphExplorerView = () => (
      <div className="h-full flex flex-col relative">
           <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 w-64">
               <h2 className="font-bold text-slate-900 mb-2">Knowledge Explorer</h2>
               <p className="text-xs text-slate-500 mb-4">Interactive global view of all research concepts, authors, and papers.</p>
               
               <div className="space-y-2">
                   <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                       <input type="checkbox" checked={graphFilters.showConcepts} onChange={e => setGraphFilters(prev => ({...prev, showConcepts: e.target.checked}))} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                       Show Concepts
                   </label>
                   <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                       <input type="checkbox" checked={graphFilters.showAuthors} onChange={e => setGraphFilters(prev => ({...prev, showAuthors: e.target.checked}))} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                       Show Authors
                   </label>
                   <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                       <input type="checkbox" checked={graphFilters.showInstitutes} onChange={e => setGraphFilters(prev => ({...prev, showInstitutes: e.target.checked}))} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                       Show Institutes
                   </label>
               </div>
           </div>

           <div className="flex-1 bg-slate-100 cursor-move">
               <KnowledgeGraph 
                  data={globalGraphData} 
                  onNodeClick={(node) => setSelectedGraphNode(node)}
               />
           </div>

           {selectedGraphNode && (
               <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 w-80 animate-fade-in">
                   <div className="flex justify-between items-start mb-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedGraphNode.group === 'PAPER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                           {selectedGraphNode.group}
                       </span>
                       <button onClick={() => setSelectedGraphNode(null)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
                   </div>
                   <h3 className="font-bold text-slate-900 text-lg mb-2">{selectedGraphNode.label}</h3>
                   
                   {selectedGraphNode.group === 'PAPER' && selectedGraphNode.metadata && (
                       <div className="text-sm text-slate-600 space-y-2">
                           <p>{selectedGraphNode.metadata.summary}</p>
                           <button 
                             onClick={() => {
                                 const doc = documents.find(d => d.id === selectedGraphNode.metadata.id);
                                 if(doc) { setSelectedDoc(doc); setCurrentView('DETAIL'); }
                             }}
                             className="text-indigo-600 hover:underline font-medium text-xs"
                           >
                               View Full Paper
                           </button>
                       </div>
                   )}
                   {/* Contextual stats could go here */}
               </div>
           )}
      </div>
  );

  const ProfileView = () => (
      <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
              <div className="h-32 bg-gradient-to-r from-indigo-600 to-blue-500"></div>
              <div className="px-8 pb-8">
                  <div className="flex justify-between items-end -mt-12 mb-6">
                      <div className="flex items-end gap-6">
                          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
                              <div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center text-3xl font-bold text-slate-500">
                                  {user.name.charAt(0)}
                              </div>
                          </div>
                          <div className="mb-1">
                              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                              <p className="text-slate-500">{user.institute} • {user.role}</p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Edit Profile</button>
                          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Share Publicly</button>
                      </div>
                  </div>
                  
                  {user.bio && <p className="text-slate-600 mb-6 max-w-2xl">{user.bio}</p>}

                  <div className="grid grid-cols-4 gap-4 border-t border-slate-100 pt-6">
                      <div>
                          <p className="text-xs text-slate-400 uppercase font-bold">Wallet Address</p>
                          <p className="font-mono text-sm text-slate-800">{user.address.slice(0, 8)}...{user.address.slice(-6)}</p>
                      </div>
                      <div>
                          <p className="text-xs text-slate-400 uppercase font-bold">Publications</p>
                          <p className="font-medium text-slate-800">{user.publications || 0}</p>
                      </div>
                      <div>
                          <p className="text-xs text-slate-400 uppercase font-bold">Citations</p>
                          <p className="font-medium text-slate-800">{user.citations || 0}</p>
                      </div>
                      <div>
                          <p className="text-xs text-slate-400 uppercase font-bold">Reputation Score</p>
                          <p className="font-medium text-emerald-600">98/100</p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="border-b border-slate-200 flex">
                  <button onClick={() => setProfileTab('TIMELINE')} className={`px-6 py-3 text-sm font-medium border-b-2 ${profileTab === 'TIMELINE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Activity Timeline</button>
                  <button onClick={() => setProfileTab('WORKS')} className={`px-6 py-3 text-sm font-medium border-b-2 ${profileTab === 'WORKS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>My Works</button>
              </div>
              <div className="p-6">
                  {profileTab === 'TIMELINE' ? (
                      <div className="space-y-6">
                          {activities.map(act => (
                              <div key={act.id} className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                      <div className={`w-3 h-3 rounded-full ${act.type === 'UPLOAD' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                      <div className="w-px h-full bg-slate-200 my-1"></div>
                                  </div>
                                  <div className="pb-4">
                                      <p className="text-sm text-slate-800">{act.content}</p>
                                      <p className="text-xs text-slate-400 mt-1">{new Date(act.timestamp).toLocaleString()}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {documents.filter(d => d.uploadedBy === user.address).map(doc => (
                              <div key={doc.id} onClick={() => { setSelectedDoc(doc); setCurrentView('DETAIL'); }} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                                  <h3 className="font-bold text-slate-900 truncate">{doc.title}</h3>
                                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                                      <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
                                      <span className="flex items-center gap-1"><i className="fa-solid fa-eye"></i> {doc.citationCount * 2} views</span>
                                  </div>
                              </div>
                          ))}
                          {documents.filter(d => d.uploadedBy === user.address).length === 0 && (
                              <p className="text-slate-400 text-sm">No publications yet.</p>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <NotificationsPanel />
        
        <main className="flex-1 overflow-y-auto scroll-smooth">
          {currentView === 'HOME' && <HomeView />}
          {currentView === 'ANALYTICS' && <AnalyticsView />}
          {currentView === 'LIBRARY' && <LibraryView />}
          {currentView === 'UPLOAD' && (
              <UploadView 
                onAnalysisComplete={handleAnalysisComplete}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                userAddress={user.address}
                onBack={() => setCurrentView('HOME')}
              />
          )}
          {currentView === 'DETAIL' && <DetailView />}
          {currentView === 'SYNTHESIS_RESULT' && <SynthesisResultView />}
          {currentView === 'GRAPH_EXPLORER' && <GraphExplorerView />}
          {currentView === 'PROFILE' && <ProfileView />}
        </main>
        
        {/* --- GLOBAL CHAT WIDGET --- */}
        <ChatWidget selectedDoc={selectedDoc} />
      </div>

      {/* MODALS */}
      {showCollectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
                  <h3 className="text-lg font-bold mb-4">Create New Collection</h3>
                  <input 
                      type="text" 
                      placeholder="Collection Name" 
                      value={newCollectionName} 
                      onChange={e => setNewCollectionName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 mb-4 outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowCollectionModal(false)} className="px-4 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleCreateCollection} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold">Create</button>
                  </div>
                  {/* If triggered from bulk action */}
                  {selectedPaperIds.size > 0 && collections.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-2">Or add to existing:</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                              {collections.map(c => (
                                  <button key={c.id} onClick={() => { handleAddToCollection(c.id); setShowCollectionModal(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded text-sm flex items-center gap-2">
                                      <i className={`fa-regular fa-folder text-${c.color}-400`}></i> {c.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {showSaveViewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
                  <h3 className="text-lg font-bold mb-4">Save Current Filter</h3>
                  <input 
                      type="text" 
                      placeholder="View Name (e.g. 'Genomics 2024')" 
                      value={newViewName} 
                      onChange={e => setNewViewName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 mb-4 outline-none focus:border-indigo-500"
                  />
                  <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">
                      <p>Domain: {filterDomain}</p>
                      <p>Search: {searchQuery || '(None)'}</p>
                      <p>Sort: {sortOrder}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowSaveViewModal(false)} className="px-4 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleSaveView} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}

      {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
                  <h3 className="text-lg font-bold mb-2">Share Document</h3>
                  <p className="text-xs text-slate-500 mb-4">Grant secure access to another researcher.</p>
                  <input 
                      type="text" 
                      placeholder="Researcher Wallet Address or Email" 
                      value={shareUserEmail} 
                      onChange={e => setShareUserEmail(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 mb-4 outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowShareModal(false)} className="px-4 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleShare} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold">Share Access</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
