
import React, { useState, useEffect, useRef } from 'react';
import { Chat } from "@google/genai";
import { ResearchDocument, ChatMessage } from '../types';
import { createResearchChat, runChatQuery } from '../services/geminiService';

interface ChatWidgetProps {
  selectedDoc: ResearchDocument | null;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ selectedDoc }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Gemini Chat Session Ref
  const chatSessionRef = useRef<Chat | null>(null);

  // Initialize or reset chat when context (selectedDoc) changes
  useEffect(() => {
    chatSessionRef.current = createResearchChat(selectedDoc || undefined);
    
    // Welcome Message
    const initialMsg: ChatMessage = {
      id: 'init',
      role: 'model',
      text: selectedDoc 
        ? `I've analyzed "**${selectedDoc.title}**". I can help you summarize sections, find research gaps, or compare it with other papers. What would you like to know?`
        : "Hello! I'm your IRDA Research Assistant. How can I help you accelerate your discovery process today?",
      timestamp: Date.now()
    };
    setMessages([initialMsg]);
  }, [selectedDoc]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Placeholder for streaming response
    const botMsgId = (Date.now() + 1).toString();
    const botMsgPlaceholder: ChatMessage = {
      id: botMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, botMsgPlaceholder]);

    await runChatQuery(chatSessionRef.current, userMsg.text, (streamedText) => {
        setMessages(prev => prev.map(m => 
            m.id === botMsgId ? { ...m, text: streamedText } : m
        ));
    });

    // Finalize state
    setMessages(prev => prev.map(m => 
        m.id === botMsgId ? { ...m, isStreaming: false } : m
    ));
    setIsTyping(false);
  };

  const handleQuickPrompt = (prompt: string) => {
      setInputText(prompt);
      // Optional: auto-send
      // handleSend(); 
  };

  return (
    <>
      {/* FAB (Floating Action Button) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105
            ${isOpen ? 'bg-indigo-600 rotate-90' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}
        `}
      >
        {isOpen ? (
            <i className="fa-solid fa-xmark text-white text-xl"></i>
        ) : (
            <i className="fa-solid fa-wand-magic-sparkles text-white text-xl"></i>
        )}
      </button>

      {/* Chat Window */}
      <div 
        className={`
            fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right
            ${isOpen ? 'opacity-100 scale-100 translate-y-0 h-[600px] max-h-[80vh]' : 'opacity-0 scale-95 translate-y-10 h-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs shadow-sm">
                    <i className="fa-solid fa-robot"></i>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">IRDA Assistant</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-slate-500">{selectedDoc ? 'Context Active' : 'Online'}</span>
                    </div>
                </div>
            </div>
            {selectedDoc && (
                <div className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded max-w-[120px] truncate border border-indigo-100">
                    <i className="fa-regular fa-file-lines mr-1"></i>
                    {selectedDoc.title}
                </div>
            )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {messages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                    <div className={`
                        w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-1
                        ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-slate-600'}
                    `}>
                        <i className={`fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-wand-magic-sparkles'}`}></i>
                    </div>
                    
                    <div className={`
                        max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                        ${msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}
                    `}>
                        {msg.text ? (
                            <div className="markdown-body">
                                {/* Simple text rendering, could be markdown parsed in real app */}
                                {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
                            </div>
                        ) : (
                            <div className="flex gap-1 h-5 items-center px-1">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-0"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300"></div>
                            </div>
                        )}
                        
                        {/* Fake citations for demo effect if model mentioned them */}
                        {msg.role === 'model' && !msg.isStreaming && msg.text.length > 50 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex gap-2">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Sources:</span>
                                <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 rounded cursor-pointer hover:bg-indigo-100 transition-colors">[1] Abstract</span>
                                {Math.random() > 0.5 && <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 rounded cursor-pointer hover:bg-indigo-100 transition-colors">[2] Methods</span>}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts (Only if history is short and model isn't typing) */}
        {!isTyping && messages.length < 4 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
                {selectedDoc ? (
                    <>
                        <button onClick={() => handleQuickPrompt("Summarize the key findings")} className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full text-xs transition-colors shadow-sm">Summarize findings</button>
                        <button onClick={() => handleQuickPrompt("What are the research gaps?")} className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full text-xs transition-colors shadow-sm">Identify gaps</button>
                        <button onClick={() => handleQuickPrompt("Explain the methodology")} className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full text-xs transition-colors shadow-sm">Explain methods</button>
                    </>
                ) : (
                    <>
                         <button onClick={() => handleQuickPrompt("What are the latest trends in AI?")} className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full text-xs transition-colors shadow-sm">Trends in AI</button>
                         <button onClick={() => handleQuickPrompt("Help me draft a hypothesis")} className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full text-xs transition-colors shadow-sm">Draft hypothesis</button>
                    </>
                )}
            </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Ask a question..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-12 max-h-32 shadow-inner"
                />
                <button 
                    onClick={handleSend}
                    disabled={!inputText.trim() || isTyping}
                    className="absolute right-2 top-2 w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
                Powered by Gemini 2.5 • Answers may be generated
            </p>
        </div>
      </div>
    </>
  );
};
