import { useState, useEffect } from 'react';
import * as d3 from 'd3';

export function GraphContainer({ data, selectedChannel, setSelectedChannel, svgRef, rootRef }) {
  return (
    <svg ref={svgRef} className='w-screen h-screen dark:bg-gray-700'>
      <g ref={rootRef}>
        {(data) ? (<Graph data={data} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel} />) : null}
      </g>
    </svg>
  );
}

function Graph({ data, selectedChannel, setSelectedChannel }) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  const selectedLink = links
    .filter((link) => link.source.name === selectedChannel || link.target.name === selectedChannel)
    .filter((link) => link.distance >= 0.2);

  const scaleRadius = d3.scaleLinear()
    .domain(d3.extent(data.nodes, (d) => d.follower))
    .range([20, 80])
  const scaleDistance = d3.scalePow()
    .exponent(0.3)
    .domain(d3.extent(data.links, (d) => d.distance))
    .range([2000, 100])

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links)
        .id((d) => d.id)
        .distance((d) => scaleDistance(d.distance))
        .strength(() => 0.8))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('col', d3.forceCollide((d) => scaleRadius(d.follower)))
      .on('tick', () => {
        setNodes([...data.nodes]);
        setLinks([...data.links]);
      });
    
    return () => {
      simulation.stop();
    }
  }, [data]);

  return (
    <>
      <defs>
        {nodes.map(({ id, image }) => (
          <pattern key={id} id={id} width='1' height='1' patternContentUnits='objectBoundingBox'>
            <image href={image} width='1' height='1' preserveAspectRatio='xMidYMid slice'></image>
          </pattern>
        ))}
      </defs>
      <g>
        {selectedLink.map(({ source, target }) => (
          <line key={source.id + target.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className='stroke-gray-400 stroke-5'></line>
        ))}
      </g>
      <g>
        {nodes.map(({ id, x, y, follower, name }) => (
          <circle key={id} onClick={() => setSelectedChannel(name)} cx={x} cy={y} r={scaleRadius(follower)} fill={`url(#${id})`} className='hover:brightness-50'></circle>
        ))}
      </g>
      <g>
        {nodes.map(({ id, x, y, follower, name }) => (
          <text key={id} x={x} y={y + scaleRadius(follower) + 20} textAnchor='middle' className='dark:fill-gray-300'>{name}</text>
        ))}
      </g>
    </>
  );
}
