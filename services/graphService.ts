
import { ResearchDocument, KnowledgeGraphData, GraphNode, GraphEdge } from "../types";

export const graphService = {
  /**
   * Transforms a list of ResearchDocuments into a single, connected KnowledgeGraph.
   * Connects Papers to Authors, Institutes, and Concepts.
   */
  buildGlobalGraph(documents: ResearchDocument[]): KnowledgeGraphData {
    const nodes: Map<string, GraphNode> = new Map();
    const edges: GraphEdge[] = [];

    const addNode = (id: string, label: string, group: string, val: number, metadata: any = {}) => {
      if (!nodes.has(id)) {
        nodes.set(id, { id, label, group, val, metadata });
      } else {
        // Update value (weight) if node exists
        const node = nodes.get(id)!;
        node.val += 1;
      }
    };

    const addEdge = (source: string, target: string, relation: string) => {
      // Prevent self-loops
      if (source === target) return;
      
      // Check for existing edge to prevent duplicates
      const exists = edges.some(e => 
        (e.source === source && e.target === target && e.relation === relation) ||
        (e.source === target && e.target === source && e.relation === relation) // Undirected visually
      );
      
      if (!exists) {
        edges.push({ source, target, relation });
      }
    };

    documents.forEach(doc => {
      // 1. PAPER NODE
      const docId = `paper:${doc.id}`;
      addNode(docId, doc.title, 'PAPER', 10, { 
        title: doc.title, 
        date: doc.publicationDate,
        summary: doc.summary,
        id: doc.id
      });

      // 2. AUTHOR NODES
      doc.authors.forEach(author => {
        const authorId = `author:${author.trim()}`;
        addNode(authorId, author.trim(), 'AUTHOR', 5);
        addEdge(docId, authorId, 'written_by');
      });

      // 3. INSTITUTE NODE
      if (doc.institute) {
        const instId = `inst:${doc.institute.trim()}`;
        addNode(instId, doc.institute.trim(), 'INSTITUTE', 6);
        addEdge(docId, instId, 'published_at');
        
        // Link Author to Institute (Implicitly)
        doc.authors.forEach(author => {
            const authorId = `author:${author.trim()}`;
            addEdge(authorId, instId, 'affiliated_with');
        });
      }

      // 4. CONCEPT NODES
      // We limit to top 5 concepts to avoid clutter
      doc.keyConcepts.slice(0, 5).forEach(concept => {
        const conceptId = `concept:${concept.toLowerCase().trim()}`;
        // Proper Case for label
        const label = concept.charAt(0).toUpperCase() + concept.slice(1);
        addNode(conceptId, label, 'CONCEPT', 3);
        addEdge(docId, conceptId, 'discusses');
      });

      // 5. METHOD NODES
      doc.methods.slice(0, 3).forEach(method => {
         const methodId = `method:${method.toLowerCase().trim()}`;
         const label = method.charAt(0).toUpperCase() + method.slice(1);
         addNode(methodId, label, 'METHOD', 3);
         addEdge(docId, methodId, 'uses_method');
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      edges
    };
  }
};
