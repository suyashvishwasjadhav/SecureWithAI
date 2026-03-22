import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const ThreatVisualization = () => {
  const [nodes, setNodes] = useState<{ id: number; x: number; y: number; isThreat: boolean; delay: number }[]>([]);
  const [edges, setEdges] = useState<{ id: number; from: number; to: number; delay: number }[]>([]);

  useEffect(() => {
    // Generate 15 nodes
    const nodeCount = 15;
    const tempNodes = Array.from({ length: nodeCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      isThreat: Math.random() > 0.8,
      delay: Math.random() * 5,
    }));
    setNodes(tempNodes);

    // Generate edges (connect nearby nodes)
    const tempEdges: { id: number; from: number; to: number; delay: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
        const connections = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < connections; j++) {
            const to = Math.floor(Math.random() * nodeCount);
            if (to !== i) {
                tempEdges.push({
                    id: tempEdges.length,
                    from: i,
                    to: to,
                    delay: Math.random() * 4,
                });
            }
        }
    }
    setEdges(tempEdges);
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-15 overflow-hidden">
      <svg className="w-full h-full">
        {/* Draw Edges */}
        {edges.map((edge) => {
          const fromNode = nodes[edge.from];
          const toNode = nodes[edge.to];
          if (!fromNode || !toNode) return null;
          return (
            <motion.line
              key={`edge-${edge.id}`}
              x1={`${fromNode.x}%`}
              y1={`${fromNode.y}%`}
              x2={`${toNode.x}%`}
              y2={`${toNode.y}%`}
              stroke={fromNode.isThreat || toNode.isThreat ? "var(--danger)" : "var(--accent)"}
              strokeWidth="0.5"
              strokeDasharray="4 4"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -100 }}
              transition={{
                duration: 10 + Math.random() * 5,
                repeat: Infinity,
                ease: "linear",
                delay: edge.delay,
              }}
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => (
          <g key={`node-${node.id}`}>
            <motion.circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="2"
              fill={node.isThreat ? "var(--danger)" : "#4a4a6a"}
              initial={{ opacity: 0.1 }}
              animate={{ opacity: [0.1, 0.5, 0.1] }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: node.delay,
              }}
            />
            {node.isThreat && (
              <motion.circle
                cx={`${node.x}%`}
                cy={`${node.y}%`}
                r="6"
                fill="var(--danger)"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 0.3, 0], scale: [1, 2.5, 1] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: node.delay,
                }}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default ThreatVisualization;
