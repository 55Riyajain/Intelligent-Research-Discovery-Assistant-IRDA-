import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraphData, GraphNode, GraphEdge } from '../types';

interface KnowledgeGraphProps {
  data: KnowledgeGraphData;
  onNodeClick?: (node: GraphNode) => void;
  width?: string | number;
  height?: string | number;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ 
  data, 
  onNodeClick,
  width = "100%",
  height = "100%" 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Group colors
  const getColor = (group: string) => {
    switch(group) {
      case 'PAPER': return '#4f46e5'; // Indigo-600
      case 'AUTHOR': return '#059669'; // Emerald-600
      case 'INSTITUTE': return '#d97706'; // Amber-600
      case 'CONCEPT': return '#64748b'; // Slate-500
      case 'METHOD': return '#db2777'; // Pink-600
      default: return '#94a3b8';
    }
  };

  const getRadius = (group: string, val: number) => {
    switch(group) {
      case 'PAPER': return 12 + Math.min(val, 5);
      case 'AUTHOR': return 8 + Math.min(val, 3);
      case 'INSTITUTE': return 10;
      default: return 5 + Math.min(val, 3);
    }
  };

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, containerWidth, containerHeight]);

    // Graph Group (for Zoom)
    const g = svg.append("g");

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force("link", d3.forceLink<GraphNode, GraphEdge>(data.edges).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("collide", d3.forceCollide<GraphNode>().radius(d => getRadius(d.group, d.val) + 5))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2));

    // Edges
    const link = g.append("g")
      .attr("stroke", "#cbd5e1") // Slate-300
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke-width", 1.5);

    // Nodes Group
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(drag(simulation));

    // Node Circles
    const circles = node.append("circle")
      .attr("r", d => getRadius(d.group, d.val))
      .attr("fill", d => getColor(d.group))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "transition-all duration-300");

    // Node Labels (Only for Papers and large nodes initially, or on hover)
    const labels = node.append("text")
      .text(d => d.label)
      .attr("x", d => getRadius(d.group, d.val) + 4)
      .attr("y", 4)
      .attr("font-size", d => d.group === 'PAPER' ? "10px" : "8px")
      .attr("font-weight", d => d.group === 'PAPER' ? "bold" : "normal")
      .attr("fill", "#334155")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 4px rgba(255,255,255,0.9)");

    // Tooltip title
    node.append("title")
      .text(d => `${d.label} (${d.group})`);

    // Interaction Handling
    const handleHighlight = (targetNodeId: string | null) => {
        if (!targetNodeId) {
            // Reset
            circles.attr("opacity", 1);
            link.attr("stroke-opacity", 0.6);
            labels.attr("opacity", 1);
            return;
        }

        // Find neighbors
        const linkedNodeIds = new Set<string>();
        linkedNodeIds.add(targetNodeId);
        
        data.edges.forEach(e => {
            const s = (e.source as GraphNode).id;
            const t = (e.target as GraphNode).id;
            if (s === targetNodeId) linkedNodeIds.add(t);
            if (t === targetNodeId) linkedNodeIds.add(s);
        });

        circles.attr("opacity", d => linkedNodeIds.has(d.id) ? 1 : 0.1);
        labels.attr("opacity", d => linkedNodeIds.has(d.id) ? 1 : 0.1);
        link.attr("stroke-opacity", d => 
            linkedNodeIds.has((d.source as GraphNode).id) && linkedNodeIds.has((d.target as GraphNode).id) ? 0.8 : 0.05
        );
    };

    node.on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);
        handleHighlight(d.id);
        if (onNodeClick) onNodeClick(d);
    });

    svg.on("click", () => {
        setSelectedNodeId(null);
        handleHighlight(null);
    });

    // Tick Function
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    return () => {
      simulation.stop();
    };
  }, [data]); // Re-run if data changes

  // Drag logic
  function drag(simulation: d3.Simulation<GraphNode, undefined>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag<SVGGElement, GraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full cursor-move"></svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
         <h4 className="font-bold text-slate-700 mb-2">Graph Legend</h4>
         <div className="space-y-1.5">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-600"></span> Paper</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-600"></span> Author</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-600"></span> Institute</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-500"></span> Concept</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-600"></span> Method</div>
         </div>
         <div className="mt-3 text-[10px] text-slate-400">
            Click nodes to explore connections.
         </div>
      </div>
    </div>
  );
};