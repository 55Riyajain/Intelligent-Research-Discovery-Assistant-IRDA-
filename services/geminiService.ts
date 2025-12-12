

import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { ResearchDocument, KnowledgeGraphData, SynthesisReport, Attachment, AccessLevel } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

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

// Fallback Mock Data
const MOCK_DOC: ResearchDocument = {
  id: "new_mock_doc",
  title: "Deep Discovery: Intrinsic Motivation",
  fileName: "sample_paper.txt",
  uploadedBy: "current_user",
  timestamp: Date.now(),
  domain: "Artificial Intelligence",
  status: 'COMPLETE',
  userTags: [],
  attachments: [],
  accessLevel: AccessLevel.PUBLIC,
  encryptionHash: "0xMockHash...",
  sharedWith: [],
  comments: [],
  annotations: [],
  authors: ["Dr. A. Turing", "J. Von Neumann"],
  institute: "Institute for Advanced Study",
  publicationDate: new Date().toISOString().split('T')[0],
  citationCount: 0,
  abstract: "This paper explores the utility of intrinsic motivation in reinforcement learning agents specifically for the task of knowledge graph construction.",
  summary: "**Introduction:** Exploration in RL remains a challenge.\n\n**Methodology:** We constructed a GridWorld environment where objects have latent properties.\n\n**Results:** The agent achieved state-of-the-art performance.\n\n**Conclusion:** Structural knowledge discovery is a powerful inductive bias.",
  keyConcepts: ["Reinforcement Learning", "Deep Discovery", "Intrinsic Motivation", "Knowledge Graphs"],
  methods: ["Graph Neural Networks", "Reinforcement Learning", "Intrinsic Reward Shaping"],
  tools: ["PyTorch", "NetworkX", "OpenAI Gym"],
  researchGaps: ["Scaling to continuous state spaces", "Multi-agent environments"],
  hypotheses: ["Integrating attention mechanisms", "Hierarchical structures", "Meta-learning adaptation"],
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
  relatedPapers: [{ title: "Curiosity-driven Exploration", year: "2017" }]
};

export const analyzePaper = async (
  text: string, 
  fileName: string,
  userAddress: string,
  attachments: Attachment[] = [],
  onProgress: (stage: string) => void,
  accessLevel: AccessLevel = AccessLevel.PUBLIC
): Promise<ResearchDocument> => {
  
  // Use 2.5 Flash for extraction to be fast, but structure it better
  const model = 'gemini-2.5-flash';
  
  if (!apiKey) {
    console.warn("No API_KEY found. Returning mock data.");
    onProgress('Simulating analysis (Demo Mode)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { ...MOCK_DOC, id: safeUUID(), timestamp: Date.now(), fileName, title: fileName.replace('.txt', '').replace('.pdf', ''), attachments, accessLevel };
  }

  try {
    // 1. Summarization & Meta
    onProgress('Analyzing content structure & extracting metadata...');
    
    const summaryPrompt = `
      Analyze the research paper text. 
      Extract:
      1. Title
      2. Domain (Field of Study)
      3. Abstract (Original or generated if missing)
      4. Summary (Structured section-wise using Markdown: Introduction, Methodology, Results, Discussion)
      5. Key Concepts (List of 5-7)
      6. Methods Used (List of techniques/methodologies)
      7. Tools/Software Mentioned
      8. Research Gaps identified
      
      Output JSON matching the schema.
    `;
    
    const summaryResponse = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: summaryPrompt }] },
        { role: 'user', parts: [{ text: text.substring(0, 30000) }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            domain: { type: Type.STRING },
            abstract: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            methods: { type: Type.ARRAY, items: { type: Type.STRING } },
            tools: { type: Type.ARRAY, items: { type: Type.STRING } },
            researchGaps: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const summaryData = JSON.parse(summaryResponse.text || "{}");

    // 2. Knowledge Graph
    onProgress('Constructing knowledge graph...');
    const graphPrompt = `Build a knowledge graph from the text. Output JSON: { "nodes": [{"id","label","group","val"}], "edges": [{"source","target","relation"}] }`;
    const graphResponse = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: graphPrompt + "\n\n" + text.substring(0, 30000) }] }],
      config: { responseMimeType: "application/json" }
    });
    const graphData = JSON.parse(graphResponse.text || "{\"nodes\":[], \"edges\":[]}");

    // 3. Hypotheses (Using Gemini 3 Pro for reasoning)
    onProgress('Formulating hypotheses using Gemini 3 Pro...');
    const hypPrompt = `Propose 3 future research hypotheses based on this paper. Output JSON: { "hypotheses": ["string"] }`;
    const hypResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // upgraded for better reasoning
      contents: [{ role: 'user', parts: [{ text: hypPrompt + "\n\n" + text.substring(0, 30000) }] }],
      config: { responseMimeType: "application/json" }
    });
    const hypData = JSON.parse(hypResponse.text || "{}");

    return {
      id: safeUUID(),
      uploadedBy: userAddress,
      timestamp: Date.now(),
      status: 'COMPLETE',
      fileName,
      title: summaryData.title || fileName,
      domain: summaryData.domain || "General Research",
      abstract: summaryData.abstract || "No abstract extracted.",
      summary: summaryData.summary,
      keyConcepts: summaryData.keyConcepts || [],
      methods: summaryData.methods || [],
      tools: summaryData.tools || [],
      researchGaps: summaryData.researchGaps || [],
      knowledgeGraph: graphData,
      hypotheses: hypData.hypotheses || [],
      // Defaults for uploaded content where these might not be explicit
      authors: ["Unknown Author"],
      institute: "Unknown Institute",
      publicationDate: new Date().toISOString().split('T')[0],
      citationCount: 0,
      relatedPapers: [],
      userTags: [],
      attachments: attachments,
      accessLevel: accessLevel,
      encryptionHash: accessLevel === AccessLevel.PRIVATE ? `0x${safeUUID().replace(/-/g, '')}` : undefined,
      sharedWith: [],
      comments: [],
      annotations: []
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { ...MOCK_DOC, id: safeUUID(), timestamp: Date.now(), fileName, attachments, accessLevel };
  }
};

/**
 * Performs reasoning across multiple papers to find connections and generate synthesis.
 * Uses Gemini 3 Pro for deep reasoning.
 */
export const generateCrossPaperSynthesis = async (
  docs: ResearchDocument[],
  onProgress?: (msg: string) => void
): Promise<SynthesisReport> => {
  const model = 'gemini-3-pro-preview'; // Required for complex cross-doc reasoning

  if (!apiKey) {
    console.warn("No API_KEY. Returning mock synthesis.");
    if(onProgress) onProgress("Simulating Gemini 3 cross-analysis...");
    await new Promise(r => setTimeout(r, 2000));
    return {
      id: safeUUID(),
      timestamp: Date.now(),
      title: "Synthesized Research Report (Demo)",
      sourceDocIds: docs.map(d => d.id),
      executiveSummary: "A unified analysis revealing a strong correlation between graph-based methods and gene editing efficiency.",
      commonThemes: ["Optimization through Graph Theory", "Iterative Refinement", "Data-driven discovery"],
      conflicts: ["Paper A suggests continuous state spaces are problematic, while Paper B solves a similar continuity issue in genomics via sequencing."],
      synthesizedHypotheses: ["Applying the GNN-based intrinsic motivation from Paper A could optimize the guide RNA selection process in Paper B.", "Using CRISPR off-target data as a 'negative reward' signal for RL agents."]
    };
  }

  try {
    if(onProgress) onProgress("Gemini 3 is reading selected papers...");

    const combinedContext = docs.map((d, i) => `
      Paper ${i+1}: ${d.title}
      Abstract: ${d.abstract}
      Key Findings: ${d.summary}
      Methods: ${d.methods.join(', ')}
      Gaps: ${d.researchGaps.join(', ')}
    `).join("\n\n------------------------\n\n");

    if(onProgress) onProgress("Identifying cross-paper patterns and conflicts...");

    const prompt = `
      Perform a deep cross-paper analysis on these ${docs.length} research papers.
      
      Tasks:
      1. Generate a "Unified Executive Summary" that weaves their findings together.
      2. Identify "Common Themes" shared across the papers.
      3. Find "Conflicts" or contradictions (or contrasting approaches).
      4. Generate "Synthesized Hypotheses": novel research ideas that exist ONLY by combining these specific papers.
      
      Output JSON.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'user', parts: [{ text: combinedContext }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            commonThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
            conflicts: { type: Type.ARRAY, items: { type: Type.STRING } },
            synthesizedHypotheses: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");

    return {
      id: safeUUID(),
      timestamp: Date.now(),
      title: `Synthesis: ${docs[0].title.substring(0, 15)}... & ${docs.length - 1} others`,
      sourceDocIds: docs.map(d => d.id),
      executiveSummary: data.executiveSummary || "Analysis failed.",
      commonThemes: data.commonThemes || [],
      conflicts: data.conflicts || [],
      synthesizedHypotheses: data.synthesizedHypotheses || []
    };

  } catch (err) {
    console.error(err);
    throw new Error("Failed to synthesize documents.");
  }
};

/**
 * Creates a Chat session grounded in a specific research document or general context.
 */
export const createResearchChat = (doc?: ResearchDocument): Chat | null => {
  if (!apiKey) return null;

  let systemInstruction = "You are IRDA, an expert AI Research Assistant. Your goal is to help researchers discover insights, generate hypotheses, and understand complex scientific texts.";
  
  if (doc) {
    systemInstruction += `
      You are currently assisting with the analysis of a specific paper:
      Title: "${doc.title}"
      Authors: ${doc.authors.join(', ')}
      Abstract: ${doc.abstract}
      
      Key Concepts: ${doc.keyConcepts.join(', ')}
      Research Gaps: ${doc.researchGaps.join(', ')}

      Answer questions strictly based on the paper's context when possible. If the user asks about something not in the paper, check if it's related to the general domain (${doc.domain}).
      Provide concise, evidence-based answers. Use bullet points for clarity.
    `;
  } else {
    systemInstruction += `
      You are in "General Mode". You can answer questions about research methodology, state-of-the-art in various fields, or help structure new research proposals.
    `;
  }

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction
    }
  });
};

/**
 * Runs a chat query, supporting streaming for a 'real-time' feel.
 */
export const runChatQuery = async (
  chat: Chat | null, 
  message: string, 
  onChunk: (text: string) => void
): Promise<string> => {
  if (!chat) {
    // Mock response for demo mode
    const mockResponses = [
      "Based on the abstract, the primary contribution is a novel GNN architecture.",
      "The authors utilized a Graph Neural Network to model the state space.",
      "A potential limitation mentioned is the computational cost of the attention mechanism.",
      "I recommend looking into related work by Velickovic et al. (2018) for comparison."
    ];
    let fullText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    // Simulate streaming
    const words = fullText.split(' ');
    let currentText = "";
    for (const word of words) {
      currentText += word + " ";
      onChunk(currentText);
      await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
    }
    return fullText;
  }

  try {
    const resultStream = await chat.sendMessageStream({ message });
    let fullText = "";
    
    for await (const chunk of resultStream) {
      const text = (chunk as GenerateContentResponse).text; // Correct property access
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (e) {
    console.error("Chat Error", e);
    const errorMsg = "I encountered an error processing your request. Please try again.";
    onChunk(errorMsg);
    return errorMsg;
  }
};
