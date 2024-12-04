'use client'

import React, { useEffect, useState, useRef } from 'react';
import neo4j from 'neo4j-driver';
import * as d3 from 'd3';

const SELinuxPolicyVisualizer = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    byLabel: {},
    relationships: 0,
    byRelationType: {}
  });
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  const colors = {
    Subject: '#4287f5',
    Object: '#42f54b',
    Type: '#f5c842',
    Domain: '#42f5f2',
    READ_ACCESS: '#ff0000',
    WRITE_ACCESS: '#00ff00',
    EXECUTE_ACCESS: '#0000ff',
    HAS_TYPE: '#ffff00',
    background: '#1a1b26'
  };

  useEffect(() => {
    const initGraph = async () => {
      try {
        const ForceGraph3D = (await import('3d-force-graph')).default;
        const THREE = await import('three');
        const driver = neo4j.driver(
          process.env.NEXT_PUBLIC_NEO4J_URI || "neo4j+s://your-uri",
          neo4j.auth.basic(
            process.env.NEXT_PUBLIC_NEO4J_USER || "neo4j",
            process.env.NEXT_PUBLIC_NEO4J_PASSWORD || "your-password"
          )
        );

        const session = driver.session();

        const result = await session.run(`
          MATCH (n)
          WITH collect({
            id: id(n),
            label: head(labels(n)),
            properties: properties(n)
          }) as nodes
          
          MATCH (a)-[r]->(b)
          WITH nodes, collect({
            source: id(a),
            target: id(b),
            type: type(r),
            properties: properties(r)
          }) as relationships
          
          RETURN nodes, relationships
        `);

        const record = result.records[0];
        const nodesData = record.get('nodes');
        const relationshipsData = record.get('relationships');

        console.log('Nodes:', nodesData);
        console.log('Relationships:', relationshipsData);

        const labelCounts = {};
        nodesData.forEach(node => {
          labelCounts[node.label] = (labelCounts[node.label] || 0) + 1;
        });

        const relationshipCounts = {};
        relationshipsData.forEach(rel => {
          relationshipCounts[rel.type] = (relationshipCounts[rel.type] || 0) + 1;
        });

        setStats({
          total: nodesData.length,
          byLabel: labelCounts,
          relationships: relationshipsData.length,
          byRelationType: relationshipCounts
        });

        const graphNodes = nodesData.map(node => ({
          id: node.id.low,
          label: node.label,
          ...node.properties,
          color: colors[node.label] || '#ffffff',
          size: 5
        }));

        const graphLinks = relationshipsData.map(rel => ({
          source: rel.source.low,
          target: rel.target.low,
          type: rel.type,
          ...rel.properties,
          color: colors[rel.type] || '#ffffff'
        }));

        // Set initial 3D positions
        graphNodes.forEach(node => {
          const r = 100;
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          
          node.x = r * Math.sin(phi) * Math.cos(theta);
          node.y = r * Math.cos(phi);
          node.z = r * Math.sin(phi) * Math.sin(theta);
        });

        if (!containerRef.current) throw new Error('Container reference not available');

        const Graph = ForceGraph3D()(containerRef.current)
          .graphData({ 
            nodes: graphNodes, 
            links: graphLinks 
          })
          .backgroundColor(colors.background)
          .nodeLabel(node => `${node.label}: ${node.name || node.type || 'N/A'}`)
          .nodeColor(node => node.color)
          .nodeResolution(16)
          .nodeRelSize(6)
          .linkWidth(1)
          .linkColor(link => link.color)
          .linkOpacity(0.8)
          .linkDirectionalParticles(3)
          .linkDirectionalParticleSpeed(0.01)
          .linkLabel(link => link.type)
          // Modified force configuration without forceZ
          .d3Force('charge', d3.forceManyBody().strength(-120))
          .d3Force('link', d3.forceLink().id(d => d.id).distance(30).strength(1.5))
          .d3Force('center', d3.forceCenter())
          .d3Force('collision', d3.forceCollide(node => Math.cbrt(node.size) * 5))
          .d3Force('radial', d3.forceRadial(100))
          .controlType('orbit');

        // Enhanced node objects with glow effect
        Graph.nodeThreeObject(node => {
          const geometry = new THREE.SphereGeometry(node.size);
          const material = new THREE.MeshPhongMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.9,
            shininess: 100,
            specular: 0x444444
          });
          const mesh = new THREE.Mesh(geometry, material);
          
          const glowMaterial = new THREE.MeshPhongMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.15,
            shininess: 0
          });
          const glowGeometry = new THREE.SphereGeometry(node.size * 1.5);
          const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
          mesh.add(glowMesh);
          
          return mesh;
        });

        // Enhanced lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(300, 300, 300);
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-300, -300, -300);
        Graph.scene().add(ambientLight);
        Graph.scene().add(directionalLight);
        Graph.scene().add(directionalLight2);

        Graph
          .enableNodeDrag(true)
          .enableNavigationControls(true)
          .showNavInfo(true);

        // Initial camera position
        Graph.cameraPosition({ 
          x: 200, 
          y: 200, 
          z: 200 
        }, 
        { x: 0, y: 0, z: 0 }, 
        3000);

        // Auto-rotation
        let angle = 0;
        const autoRotate = setInterval(() => {
          angle += Math.PI / 300;
          const distance = 300;
          Graph.cameraPosition({
            x: distance * Math.sin(angle),
            y: 100,
            z: distance * Math.cos(angle)
          });
        }, 100);

        // Node click handling
        Graph.onNodeClick(node => {
          const distance = 40;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

          Graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            2000
          );
        });

        const handleResize = () => {
          if (containerRef.current) {
            Graph.width(containerRef.current.clientWidth)
                .height(containerRef.current.clientHeight);
          }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        graphRef.current = Graph;
        setLoading(false);

        return () => {
          clearInterval(autoRotate);
          window.removeEventListener('resize', handleResize);
          session.close();
          driver.close();
        };

      } catch (err) {
        console.error('Graph initialization error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoading(false);
      }
    };

    initGraph();
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 p-4">
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">SELinux Policy Visualization</h1>
            
            {loading && (
              <div className="flex items-center text-blue-400">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-400 rounded-full border-t-transparent"></div>
                Loading...
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg mt-2">
              {error}
            </div>
          )}

          {stats.total > 0 && (
            <div className="text-sm mt-2 text-gray-300">
              <div className="inline-flex items-center gap-2">
                <span className="font-semibold">Nodes ({stats.total}):</span>
                {Object.entries(stats.byLabel).map(([label, count], index, array) => (
                  <React.Fragment key={label}>
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full inline-block mr-1" 
                            style={{backgroundColor: colors[label]}}/>
                      {label}: {count}
                    </span>
                    {index < array.length - 1 && <span className="mx-1">|</span>}
                  </React.Fragment>
                ))}
                <span className="mx-4">||</span>
                <span className="font-semibold">Relationships ({stats.relationships}):</span>
                {Object.entries(stats.byRelationType).map(([type, count], index, array) => (
                  <React.Fragment key={type}>
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full inline-block mr-1" 
                            style={{backgroundColor: colors[type]}}/>
                      {type}: {count}
                    </span>
                    {index < array.length - 1 && <span className="mx-1">|</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-h-0 border border-gray-700 rounded-lg overflow-hidden">
          <div 
            ref={containerRef}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default SELinuxPolicyVisualizer;