
import React, { useCallback, useState } from 'react';
import { analyzePaper } from '../services/geminiService';
import { Attachment, ResearchDocument, AccessLevel } from '../types';

interface UploadViewProps {
  onAnalysisComplete: (result: ResearchDocument) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  userAddress: string;
  onBack: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ 
  onAnalysisComplete, 
  isLoading, 
  setIsLoading,
  userAddress,
  onBack
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [progressText, setProgressText] = useState('');
  
  // Staging area for multiple files
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [mainFileIndex, setMainFileIndex] = useState<number>(0);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(AccessLevel.PUBLIC);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setStagedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
    if (mainFileIndex === index) setMainFileIndex(0);
    if (mainFileIndex > index) setMainFileIndex(prev => prev - 1);
  };

  const processUpload = async () => {
    if (stagedFiles.length === 0) return;
    
    setIsLoading(true);
    
    const mainFile = stagedFiles[mainFileIndex];
    
    // Process Attachments (All files except main, or all if we treat main as an attachment too)
    const attachments: Attachment[] = stagedFiles.map(f => {
        let type: Attachment['type'] = 'OTHER';
        if (f.name.endsWith('.pdf')) type = 'PDF';
        if (f.name.endsWith('.csv')) type = 'CSV';
        if (f.name.endsWith('.py') || f.name.endsWith('.js')) type = 'CODE';
        if (f.name.endsWith('.png') || f.name.endsWith('.jpg')) type = 'IMAGE';
        
        return {
            name: f.name,
            type,
            size: `${(f.size / 1024 / 1024).toFixed(2)} MB`
        };
    });

    setProgressText("Reading primary document...");

    try {
      let text = "";
      
      // MOCK PDF PARSING (In a real app, use pdf.js)
      if (mainFile.name.endsWith('.pdf')) {
          setProgressText("Extracting text from PDF (Simulated)...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          // Fake text extraction for demo purposes
          text = `
            [Extracted from ${mainFile.name}]
            Abstract
            This is a simulated extraction of content from the uploaded PDF document. 
            The system assumes this paper discusses advanced topics in its domain.
            
            Introduction
            Research in this area has grown significantly.
            
            Methodology
            We employed standard verification techniques.
            
            Results
            Our findings suggest positive correlation.
            
            Discussion
            Further study is required.
          `;
      } else {
          text = await mainFile.text();
      }

      if (accessLevel === AccessLevel.PRIVATE) {
          setProgressText("Encrypting data for secure storage...");
          await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const result = await analyzePaper(
          text, 
          mainFile.name, 
          userAddress, 
          attachments, 
          (stage) => setProgressText(stage),
          accessLevel
      );
      onAnalysisComplete(result);
    } catch (error) {
      console.error(error);
      alert("An error occurred during analysis.");
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const loadSample = async () => {
    setIsLoading(true);
    setProgressText("Loading sample data...");
    const sampleText = `
    Abstract
    This paper introduces a novel approach to reinforcement learning called "Deep Discovery". 
    Unlike traditional methods that rely on dense rewards, Deep Discovery utilizes intrinsic motivation 
    derived from knowledge graph expansion. We demonstrate that agents rewarded for discovering new 
    conceptual links in a simulated environment learn 40% faster than baselines. 
    
    Introduction
    Exploration in RL remains a significant challenge. Most agents struggle in sparse reward settings.
    We propose a framework where the agent builds an internal graph representation of the world.
    
    Methodology
    We constructed a GridWorld environment where objects have latent properties.
    The agent is equipped with a Graph Neural Network (GNN) to process observations.
    
    Results
    The Deep Discovery agent achieved state-of-the-art performance on the MiniGrid suite.
    Analysis shows the internal graph closely matches the ground truth causal structure of the environment.
    
    Discussion
    This suggests that structural knowledge discovery is a powerful inductive bias. 
    However, scaling to continuous domains requires further research into differentiable graph building.
    `;
    try {
       const result = await analyzePaper(sampleText, "sample_paper.txt", userAddress, [], (stage) => setProgressText(stage), AccessLevel.PUBLIC);
       onAnalysisComplete(result);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 relative">
      {/* Back Button */}
      <div className="absolute top-8 left-8">
        <button 
          onClick={onBack}
          className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <i className="fa-solid fa-arrow-left"></i> Back to Library
        </button>
      </div>

      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            New Research Analysis
          </h2>
          <p className="text-lg text-slate-600">
            Upload your research materials. Identify the main paper for AI processing.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-slate-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-6"></div>
            <h3 className="text-xl font-semibold text-slate-800 animate-pulse">{progressText}</h3>
            <p className="text-slate-500 mt-2">Powered by Gemini 2.5</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
             
             {stagedFiles.length === 0 ? (
                 <div
                    className={`
                    cursor-pointer transition-all duration-300
                    flex flex-col items-center justify-center p-16
                    ${dragActive ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".txt,.pdf,.csv,.json,.zip"
                    multiple
                    onChange={handleChange}
                    />
                    
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                        <i className="fa-solid fa-cloud-arrow-up text-3xl text-indigo-600"></i>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Drag & drop research files
                    </h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-md text-center">
                    Support for PDF, TXT, CSV, JSON, and ZIP.
                    </p>
                    
                    <div className="flex gap-4">
                        <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-md hover:bg-indigo-700 transition-colors">
                            Select Files
                        </span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); loadSample(); }}
                            className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
                        >
                            Try Sample
                        </button>
                    </div>
                </div>
             ) : (
                 <div className="p-8">
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Files Ready for Upload ({stagedFiles.length})</h3>
                     <div className="space-y-3 mb-8">
                         {stagedFiles.map((file, idx) => (
                             <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${mainFileIndex === idx ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-white border-slate-200'}`}>
                                 <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded flex items-center justify-center text-lg
                                         ${file.name.endsWith('.pdf') ? 'bg-red-100 text-red-600' : 
                                           file.name.endsWith('.csv') ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}
                                     `}>
                                         <i className={`fa-solid ${file.name.endsWith('.pdf') ? 'fa-file-pdf' : file.name.endsWith('.csv') ? 'fa-file-csv' : 'fa-file-lines'}`}></i>
                                     </div>
                                     <div>
                                         <p className="text-sm font-bold text-slate-900">{file.name}</p>
                                         <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                     <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                         <input 
                                            type="radio" 
                                            name="mainFile" 
                                            checked={mainFileIndex === idx} 
                                            onChange={() => setMainFileIndex(idx)}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                         />
                                         Main Paper
                                     </label>
                                     <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                                         <i className="fa-solid fa-trash"></i>
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>

                     {/* Security & Access Controls */}
                     <div className="mb-8">
                         <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                             <i className="fa-solid fa-shield-halved text-indigo-500"></i> Security & Access Control
                         </h3>
                         <div className="grid grid-cols-3 gap-4">
                             <label className={`
                                 border p-3 rounded-lg cursor-pointer transition-all relative
                                 ${accessLevel === AccessLevel.PUBLIC ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-200'}
                             `}>
                                 <input 
                                     type="radio" 
                                     name="access" 
                                     className="hidden"
                                     checked={accessLevel === AccessLevel.PUBLIC}
                                     onChange={() => setAccessLevel(AccessLevel.PUBLIC)}
                                 />
                                 <div className="text-center">
                                     <i className="fa-solid fa-globe text-2xl mb-2 text-indigo-600"></i>
                                     <p className="text-sm font-bold text-slate-800">Public</p>
                                     <p className="text-xs text-slate-500 mt-1">Visible to all institute members</p>
                                 </div>
                             </label>

                             <label className={`
                                 border p-3 rounded-lg cursor-pointer transition-all relative
                                 ${accessLevel === AccessLevel.INSTITUTE ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-200'}
                             `}>
                                 <input 
                                     type="radio" 
                                     name="access" 
                                     className="hidden"
                                     checked={accessLevel === AccessLevel.INSTITUTE}
                                     onChange={() => setAccessLevel(AccessLevel.INSTITUTE)}
                                 />
                                 <div className="text-center">
                                     <i className="fa-solid fa-building-columns text-2xl mb-2 text-emerald-600"></i>
                                     <p className="text-sm font-bold text-slate-800">Institute Only</p>
                                     <p className="text-xs text-slate-500 mt-1">Restricted to internal research teams</p>
                                 </div>
                             </label>

                             <label className={`
                                 border p-3 rounded-lg cursor-pointer transition-all relative
                                 ${accessLevel === AccessLevel.PRIVATE ? 'bg-slate-100 border-slate-500 ring-1 ring-slate-500' : 'bg-white border-slate-200 hover:border-slate-300'}
                             `}>
                                 <input 
                                     type="radio" 
                                     name="access" 
                                     className="hidden"
                                     checked={accessLevel === AccessLevel.PRIVATE}
                                     onChange={() => setAccessLevel(AccessLevel.PRIVATE)}
                                 />
                                 <div className="text-center">
                                     <i className="fa-solid fa-lock text-2xl mb-2 text-slate-700"></i>
                                     <p className="text-sm font-bold text-slate-800">Private</p>
                                     <p className="text-xs text-slate-500 mt-1">Encrypted. Only you & invites.</p>
                                 </div>
                             </label>
                         </div>
                     </div>
                     
                     <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                         <button onClick={() => document.getElementById('file-upload-add')?.click()} className="text-indigo-600 text-sm font-medium hover:underline">
                            + Add more files
                         </button>
                         <input
                            id="file-upload-add"
                            type="file"
                            className="hidden"
                            accept=".txt,.pdf,.csv,.json,.zip"
                            multiple
                            onChange={(e) => { if(e.target.files) handleFiles(e.target.files) }}
                        />
                         <div className="flex gap-3">
                             <button onClick={() => setStagedFiles([])} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
                             <button onClick={processUpload} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md">
                                Analyze & Upload
                             </button>
                         </div>
                     </div>
                 </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
