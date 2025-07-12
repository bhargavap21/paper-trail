'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Register the layout
cytoscape.use(coseBilkent);

export interface GraphNode {
  id: string;
  text: string;
  paperId: string;
  paperTitle?: string;
  createdAt: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface SemanticGraphProps {
  graphData: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onNodeDelete?: (nodeId: string) => void;
  height?: string;
}

export default function SemanticGraph({ 
  graphData, 
  onNodeClick, 
  onNodeDelete,
  height = "600px" 
}: SemanticGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) {
      console.log('Container ref not available, skipping Cytoscape initialization')
      return;
    }

    // Validate graph data before proceeding
    if (!graphData || (!Array.isArray(graphData.nodes) && !Array.isArray(graphData.edges))) {
      console.log('Invalid graph data, skipping Cytoscape initialization:', graphData)
      return;
    }

    // Clean up existing instance
    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying previous Cytoscape instance:', error);
      }
    }

    // Validate and convert data to Cytoscape format
    const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
    const edges = Array.isArray(graphData.edges) ? graphData.edges : [];
    
    console.log('Processing graph data:', { nodeCount: nodes.length, edgeCount: edges.length });
    
    const elements = [
      // Nodes
      ...nodes.map(node => ({
        data: {
          id: String(node.id),
          label: (node.text && node.text.length > 50) ? node.text.substring(0, 47) + '...' : (node.text || 'No text'),
          fullText: node.text || 'No text',
          paperId: node.paperId || '',
          paperTitle: node.paperTitle || 'Unknown Paper',
          createdAt: node.createdAt || new Date().toISOString(),
          type: 'memory'
        }
      })),
      // Edges
      ...edges.map(edge => ({
        data: {
          id: String(edge.id),
          source: String(edge.source),
          target: String(edge.target),
          weight: Number(edge.weight) || 0.5,
          type: 'similarity'
        }
      }))
    ];

    console.log('Cytoscape elements:', elements);

    // Initialize Cytoscape with error handling
    let cy: Core;
    try {
      cy = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1e40af', // Royal blue
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            'width': (ele: any) => Math.max(30, Math.min(80, ele.data('fullText').length * 0.8)),
            'height': (ele: any) => Math.max(30, Math.min(80, ele.data('fullText').length * 0.8)),
            'border-width': 2,
            'border-color': '#1e3a8a',
            'text-outline-width': 1,
            'text-outline-color': '#1e40af'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#ea580c', // Orange for selected
            'border-color': '#c2410c',
            'border-width': 3
          }
        },
        {
          selector: 'node:active',
          style: {
            'background-color': '#3b82f6',
            'border-width': 3,
            'border-color': '#2563eb'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => Math.max(1, ele.data('weight') * 5),
            'line-color': '#60a5fa',
            'target-arrow-color': '#60a5fa',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': (ele: any) => Math.max(0.3, ele.data('weight')),
            'arrow-scale': 1.2
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#ea580c',
            'target-arrow-color': '#ea580c',
            'width': (ele: any) => Math.max(2, ele.data('weight') * 6)
          }
        }
      ],
      layout: (nodes.length <= 1 ? {
        name: 'grid',
        fit: true,
        padding: 50
      } : nodes.length <= 4 ? {
        // For small graphs, use a more controlled layout
        name: 'cose-bilkent',
        nodeDimensionsIncludeLabels: true,
        refresh: 30,
        fit: true,
        padding: 80,
        randomize: true,  // Add some randomization for better distribution
        nodeRepulsion: 8000,  // Much higher repulsion to spread nodes out
        idealEdgeLength: 200,  // Longer ideal edge length
        edgeElasticity: 100,   // Lower elasticity for more rigid connections
        nestingFactor: 0.1,
        gravity: 0.1,  // Much lower gravity to prevent clustering
        numIter: 500,
        tile: false,  // Don't use tiling for small graphs
        animate: 'end',
        animationDuration: 1000,
        // Additional parameters for better distribution
        tilingPaddingVertical: 50,
        tilingPaddingHorizontal: 50,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        gravityRange: 3.8
      } : {
        // For larger graphs, use standard cose-bilkent
        name: 'cose-bilkent',
        nodeDimensionsIncludeLabels: true,
        refresh: 20,
        fit: true,
        padding: 60,
        randomize: true,
        nodeRepulsion: 10000,
        idealEdgeLength: 180,
        edgeElasticity: 200,
        nestingFactor: 0.1,
        gravity: 0.15,
        numIter: Math.min(1000, Math.max(300, nodes.length * 80)),
        tile: true,
        animate: 'end',
        animationDuration: 800
      }) as any
      });

      if (!cy) {
        console.error('Failed to initialize Cytoscape');
        return;
      }

    } catch (error) {
      console.error('Error initializing Cytoscape with COSE-Bilkent:', error);
      
      // Try fallback with simpler layout
      try {
        console.log('Attempting fallback with circle layout...');
        cy = cytoscape({
          container: containerRef.current,
          elements: elements,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#1e40af',
                'label': 'data(label)',
                'text-valign': 'center',
                'text-halign': 'center',
                'color': '#ffffff',
                'font-size': '12px',
                'font-weight': 'bold',
                'text-wrap': 'wrap',
                'text-max-width': '120px',
                'width': 40,
                'height': 40,
                'border-width': 2,
                'border-color': '#1e3a8a'
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 3,
                'line-color': '#60a5fa',
                'target-arrow-color': '#60a5fa',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier'
              }
            }
          ],
          layout: {
            name: nodes.length > 3 ? 'circle' : nodes.length > 1 ? 'concentric' : 'grid',
            fit: true,
            padding: 60,
            // Concentric layout options for better small graph distribution
            ...(nodes.length > 1 && nodes.length <= 3 ? {
              concentric: (node: any) => node.degree(), // Arrange by connectivity
              levelWidth: () => 1,
              minNodeSpacing: 100,
              boundingBox: undefined,
              avoidOverlap: true,
              nodeDimensionsIncludeLabels: true,
              spacingFactor: 1.75,
              radius: 150,
              startAngle: 0,
              sweep: 360,
              clockwise: true,
              transform: (node: any, position: any) => position
            } : {})
          }
        });
        
        console.log('Fallback layout successful');
      } catch (fallbackError) {
        console.error('Error with fallback layout:', fallbackError);
        
        // Final fallback - manual positioning
        try {
          console.log('Attempting manual positioning fallback...');
          const nodeElements = elements.filter(elem => elem.data.type === 'memory');
          const nodeCount = nodeElements.length;
          
          const manualElements = elements.map((elem, index) => {
            if (elem.data.type === 'memory') {
              // Create a more natural distribution pattern
              let x, y;
              
              if (nodeCount === 1) {
                x = 300; y = 200;
              } else if (nodeCount === 2) {
                x = index === 0 ? 200 : 400;
                y = 200;
              } else if (nodeCount === 3) {
                // Triangle formation
                const angles = [0, 120, 240];
                const radius = 120;
                const angle = (angles[index] * Math.PI) / 180;
                x = 300 + radius * Math.cos(angle);
                y = 200 + radius * Math.sin(angle);
              } else if (nodeCount === 4) {
                // Square formation
                const positions = [[200, 150], [400, 150], [400, 250], [200, 250]];
                [x, y] = positions[index] || [300, 200];
              } else {
                // Circular distribution for more nodes
                const angle = (index * 2 * Math.PI) / nodeCount;
                const radius = Math.max(120, nodeCount * 15);
                x = 300 + radius * Math.cos(angle);
                y = 200 + radius * Math.sin(angle);
              }
              
              return {
                ...elem,
                position: { x, y }
              };
            }
            return elem;
          });
          
          cy = cytoscape({
            container: containerRef.current,
            elements: manualElements,
            style: [
              {
                selector: 'node',
                style: {
                  'background-color': '#1e40af',
                  'label': 'data(label)',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'color': '#ffffff',
                  'font-size': '10px',
                  'width': 60,
                  'height': 60
                }
              },
              {
                selector: 'edge',
                style: {
                  'width': 2,
                  'line-color': '#60a5fa',
                  'target-arrow-shape': 'triangle'
                }
              }
            ],
            layout: { name: 'preset' },
            autoungrabify: false,
            userZoomingEnabled: true,
            userPanningEnabled: true
          });
          
          console.log('Manual positioning successful');
        } catch (manualError) {
          console.error('All layout attempts failed:', manualError);
          return;
        }
      }
    }

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      
      setSelectedNode({
        id: nodeData.id,
        text: nodeData.fullText,
        paperId: nodeData.paperId,
        paperTitle: nodeData.paperTitle,
        createdAt: nodeData.createdAt
      });

      if (onNodeClick) {
        onNodeClick({
          id: nodeData.id,
          text: nodeData.fullText,
          paperId: nodeData.paperId,
          paperTitle: nodeData.paperTitle,
          createdAt: nodeData.createdAt
        });
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    // Add tooltip on hover
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      
      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'cytoscape-tooltip';
      tooltip.innerHTML = `
        <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-size: 12px; max-width: 300px; z-index: 1000; position: absolute;">
          <strong>${nodeData.paperTitle}</strong><br/>
          ${nodeData.fullText}<br/>
          <small>${new Date(nodeData.createdAt).toLocaleDateString()}</small>
        </div>
      `;
      
      document.body.appendChild(tooltip);
      
      // Position tooltip
      const renderedNode = node.renderedPosition();
      tooltip.style.left = `${renderedNode.x + 10}px`;
      tooltip.style.top = `${renderedNode.y - 10}px`;
    });

    cy.on('mouseout', 'node', () => {
      // Remove tooltips
      const tooltips = document.querySelectorAll('.cytoscape-tooltip');
      tooltips.forEach(tooltip => tooltip.remove());
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
      // Clean up any remaining tooltips
      const tooltips = document.querySelectorAll('.cytoscape-tooltip');
      tooltips.forEach(tooltip => tooltip.remove());
    };
  }, [graphData, onNodeClick]);

  // Handle search
  useEffect(() => {
    if (!cyRef.current) return;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cyRef.current.nodes().forEach((node: NodeSingular) => {
        const nodeData = node.data();
        const matches = nodeData.fullText.toLowerCase().includes(query) ||
                       nodeData.paperTitle.toLowerCase().includes(query);
        
        if (matches) {
          node.style('background-color', '#22c55e'); // Green for matches
          node.style('border-color', '#16a34a');
        } else {
          node.style('background-color', '#94a3b8'); // Gray for non-matches
          node.style('border-color', '#64748b');
        }
      });
    } else {
      // Reset all nodes to default color
      cyRef.current.nodes().forEach((node: NodeSingular) => {
        node.style('background-color', '#1e40af');
        node.style('border-color', '#1e3a8a');
      });
    }
  }, [searchQuery]);

  // Control functions
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
      cyRef.current.center();
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
      cyRef.current.center();
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  const handleRefreshLayout = () => {
    if (cyRef.current) {
      const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
      
      // Apply the improved layout with animation
      const layoutOptions = nodes.length <= 4 ? {
        name: 'cose-bilkent',
        nodeDimensionsIncludeLabels: true,
        refresh: 30,
        fit: true,
        padding: 80,
        randomize: true,
        nodeRepulsion: 8000,
        idealEdgeLength: 200,
        edgeElasticity: 100,
        nestingFactor: 0.1,
        gravity: 0.1,
        numIter: 500,
        tile: false,
        animate: 'end',
        animationDuration: 1000,
        tilingPaddingVertical: 50,
        tilingPaddingHorizontal: 50,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        gravityRange: 3.8
      } : {
        name: 'cose-bilkent',
        nodeDimensionsIncludeLabels: true,
        refresh: 20,
        fit: true,
        padding: 60,
        randomize: true,
        nodeRepulsion: 10000,
        idealEdgeLength: 180,
        edgeElasticity: 200,
        nestingFactor: 0.1,
        gravity: 0.15,
        numIter: Math.min(1000, Math.max(300, nodes.length * 80)),
        tile: true,
        animate: 'end',
        animationDuration: 800
      };

      const layout = cyRef.current.layout(layoutOptions as any);
      layout.run();
    }
  };

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search nodes..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset} title="Reset View">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshLayout} title="Refresh Layout" className="px-3">
            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
              <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
              <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Layout
          </Button>
        </div>
      </div>

      {/* Graph Container */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: height,
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          backgroundColor: '#f8fafc'
        }} 
      />

      {/* Selected Node Info */}
      {selectedNode && (
        <Card className="mt-4 border-royal-200 bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-royal-700 dark:text-royal-200 mb-1">
                  {selectedNode.paperTitle}
                </h3>
                <p className="text-sm text-gray-800 dark:text-gray-100 mb-2">
                  {selectedNode.text}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Clipped on {new Date(selectedNode.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Navigate to paper
                    window.open(`/reader/${selectedNode.paperId}`, '_blank');
                  }}
                >
                  View Paper
                </Button>
                {onNodeDelete && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      onNodeDelete(selectedNode.id);
                      setSelectedNode(null);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stats */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        {graphData.nodes.length} nodes • {graphData.edges.length} connections
      </div>
    </div>
  );
} 