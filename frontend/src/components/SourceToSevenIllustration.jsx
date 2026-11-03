import React from 'react'
import { PlatformIcon } from './ChannelIcons'
import { Sparkles, FileText } from 'lucide-react'

export default function SourceToSevenIllustration() {
  const channels = [
    { key: 'summary', name: 'Summary', color: '#6C5CE7', x: 70, y: 35 },
    { key: 'linkedin_post', name: 'LinkedIn', color: '#0A66C2', x: 190, y: 25 },
    { key: 'twitter_thread', name: 'Twitter / X', color: '#111827', x: 310, y: 20 },
    { key: 'instagram_caption', name: 'Instagram', color: '#E1306C', x: 430, y: 25 },
    { key: 'youtube_content', name: 'YouTube', color: '#FF0000', x: 550, y: 35 },
    { key: 'email_newsletter', name: 'Newsletter', color: '#10B981', x: 130, y: 195 },
    { key: 'blog_post', name: 'Blog Post', color: '#F59E0B', x: 490, y: 195 },
  ]

  const centerX = 310
  const centerY = 135

  return (
    <div className="w-full max-w-2xl mx-auto py-2 px-2 select-none">
      <svg
        viewBox="0 0 620 235"
        className="w-full h-auto overflow-visible filter drop-shadow-sm"
      >
        <defs>
          {/* Subtle glow filter */}
          <filter id="hubGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Line gradients */}
          {channels.map((ch) => (
            <linearGradient
              key={`grad-${ch.key}`}
              id={`grad-${ch.key}`}
              x1={centerX}
              y1={centerY}
              x2={ch.x}
              y2={ch.y}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor={ch.color} stopOpacity="0.9" />
            </linearGradient>
          ))}
        </defs>

        {/* Animated Connecting Lines */}
        {channels.map((ch) => {
          // Curved bezier path from center to satellite node
          const dx = ch.x - centerX
          const dy = ch.y - centerY
          const cx1 = centerX + dx * 0.4
          const cy1 = centerY + dy * 0.1
          const cx2 = centerX + dx * 0.7
          const cy2 = centerY + dy * 0.8
          const pathD = `M ${centerX} ${centerY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ch.x} ${ch.y}`

          return (
            <g key={`link-${ch.key}`}>
              {/* Background faint track */}
              <path
                d={pathD}
                fill="none"
                stroke={ch.color}
                strokeWidth="1.5"
                strokeOpacity="0.18"
              />
              {/* Animated pulsed beam */}
              <path
                d={pathD}
                fill="none"
                stroke={`url(#grad-${ch.key})`}
                strokeWidth="2.2"
                strokeDasharray="6 12"
                strokeLinecap="round"
                className="animate-[dash_2.5s_linear_infinite]"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="36"
                  to="0"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </path>
            </g>
          )
        })}

        {/* Satellite Platform Nodes */}
        {channels.map((ch) => (
          <g key={`node-${ch.key}`} className="cursor-pointer transition-transform duration-200 hover:scale-110">
            {/* Outer halo */}
            <circle
              cx={ch.x}
              cy={ch.y}
              r="22"
              fill="#FFFFFF"
              stroke={ch.color}
              strokeWidth="2"
              strokeOpacity="0.25"
              className="drop-shadow-sm"
            />
            {/* Inner background */}
            <circle
              cx={ch.x}
              cy={ch.y}
              r="17"
              fill="#FFFFFF"
            />
            {/* Embedded Icon */}
            <foreignObject
              x={ch.x - 12}
              y={ch.y - 12}
              width="24"
              height="24"
              className="pointer-events-none"
            >
              <div className="w-full h-full flex items-center justify-center">
                <PlatformIcon platform={ch.key} size={20} />
              </div>
            </foreignObject>

            {/* Label below/above node */}
            <text
              x={ch.x}
              y={ch.y > centerY ? ch.y + 24 : ch.y - 20}
              textAnchor="middle"
              className="text-[10px] font-bold fill-gray-700 tracking-tight"
            >
              {ch.name}
            </text>
          </g>
        ))}

        {/* Central Source Hub Node */}
        <g className="cursor-pointer">
          {/* Ambient outer pulse */}
          <circle
            cx={centerX}
            cy={centerY}
            r="38"
            fill="#6C5CE7"
            fillOpacity="0.08"
            className="animate-ping"
            style={{ animationDuration: '3s' }}
          />
          <circle
            cx={centerX}
            cy={centerY}
            r="32"
            fill="#6C5CE7"
            fillOpacity="0.14"
          />
          {/* Core container */}
          <circle
            cx={centerX}
            cy={centerY}
            r="26"
            fill="url(#hubGrad)"
            stroke="#FFFFFF"
            strokeWidth="3"
            filter="url(#hubGlow)"
          />
          <defs>
            <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>

          {/* Central Source Icon */}
          <foreignObject
            x={centerX - 13}
            y={centerY - 13}
            width="26"
            height="26"
            className="pointer-events-none"
          >
            <div className="w-full h-full flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
          </foreignObject>

          {/* Central label */}
          <text
            x={centerX}
            y={centerY + 40}
            textAnchor="middle"
            className="text-[11px] font-extrabold fill-[#6C5CE7] tracking-wider uppercase"
          >
            ONE SOURCE
          </text>
        </g>
      </svg>
    </div>
  )
}

