
import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Citation } from '@/types/message';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SourceContentViewerProps {
  citation: Citation | null;
  sourceContent?: string;
  sourceSummary?: string;
  sourceUrl?: string;
  className?: string;
  isOpenedFromSourceList?: boolean;
  onBackToSources?: () => void;
}

const SourceContentViewer = ({ 
  citation, 
  sourceContent, 
  sourceSummary,
  sourceUrl,
  className = '',
  isOpenedFromSourceList = false,
  onBackToSources
}: SourceContentViewerProps) => {
  const highlightedContentRef = useRef<HTMLDivElement>(null);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  
  // Control accordion state based on how the viewer was opened
  const [accordionValue, setAccordionValue] = useState<string>(
    isOpenedFromSourceList ? "guide" : ""
  );

  // Check if we have valid citation line data (indicating a real citation click)
  const hasValidCitationLines = citation && 
    typeof citation.chunk_lines_from === 'number' && 
    typeof citation.chunk_lines_to === 'number' &&
    citation.chunk_lines_from > 0;

  console.log('SourceContentViewer: Render with citation', {
    citationId: citation?.citation_id,
    sourceId: citation?.source_id,
    hasValidCitationLines,
    isOpenedFromSourceList,
    chunkLinesFrom: citation?.chunk_lines_from,
    chunkLinesTo: citation?.chunk_lines_to
  });

  // Auto-scroll to highlighted content when citation changes and has valid line data
  useEffect(() => {
    console.log('SourceContentViewer: Auto-scroll effect triggered', {
      hasValidCitationLines,
      citationId: citation?.citation_id,
      hasHighlightedRef: !!highlightedContentRef.current,
      hasScrollAreaRef: !!scrollAreaViewportRef.current
    });

    if (hasValidCitationLines && highlightedContentRef.current && scrollAreaViewportRef.current) {
      console.log('SourceContentViewer: Starting auto-scroll process');
      
      // Increased delay to ensure DOM has fully updated
      const timer = setTimeout(() => {
        if (highlightedContentRef.current && scrollAreaViewportRef.current) {
          console.log('SourceContentViewer: Executing auto-scroll');
          
          // Find the actual viewport element within the ScrollArea
          const scrollAreaElement = scrollAreaViewportRef.current;
          const viewport = scrollAreaElement.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          
          if (viewport && highlightedContentRef.current) {
            const highlightedElement = highlightedContentRef.current;
            
            console.log('SourceContentViewer: Scroll calculation', {
              highlightedOffsetTop: highlightedElement.offsetTop,
              highlightedHeight: highlightedElement.clientHeight,
              viewportHeight: viewport.clientHeight,
              currentScrollTop: viewport.scrollTop
            });
            
            // Calculate the scroll position to center the highlighted content
            const scrollTop = highlightedElement.offsetTop - (viewport.clientHeight / 2) + (highlightedElement.clientHeight / 2);
            const targetScrollTop = Math.max(0, scrollTop);
            
            console.log('SourceContentViewer: Scrolling to position', { targetScrollTop });
            
            viewport.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          } else {
            console.log('SourceContentViewer: Viewport or highlighted element not found', {
              viewport: !!viewport,
              highlightedElement: !!highlightedContentRef.current
            });
          }
        }
      }, 300); // Increased delay for better reliability

      return () => clearTimeout(timer);
    }
  }, [citation?.citation_id, citation?.chunk_lines_from, citation?.chunk_lines_to, citation?.source_id, hasValidCitationLines]);

  // Close guide when a real citation is clicked (has valid line data)
  useEffect(() => {
    if (hasValidCitationLines) {
      console.log('SourceContentViewer: Closing guide for real citation');
      setAccordionValue("");
    }
  }, [hasValidCitationLines]);

  if (!citation || !sourceContent) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">Select a citation to view source content</p>
      </div>
    );
  }

  const getSourceIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'pdf': '/file-types/PDF.svg',
      'text': '/file-types/TXT.png',
      'website': '/file-types/WEB.svg',
      'youtube': '/file-types/MP3.png',
      'audio': '/file-types/MP3.png',
      'doc': '/file-types/DOC.png',
      'multiple-websites': '/file-types/WEB.svg',
      'copied-text': '/file-types/TXT.png'
    };

    const iconUrl = iconMap[type] || iconMap['text']; // fallback to TXT icon
    
    return (
      <img 
        src={iconUrl} 
        alt={`${type} icon`} 
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to a simple text indicator if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = '📄';
        }}
      />
    );
  };

  // Split content into lines for highlighting
  const lines = sourceContent.split('\n');
  
  // Determine the highlight range based on whether we have valid citation line data
  let startLine: number;
  let endLine: number;
  
  if (hasValidCitationLines) {
    // For real citations with valid line data, highlight the specific lines
    startLine = citation.chunk_lines_from!;
    endLine = citation.chunk_lines_to!;
    console.log('SourceContentViewer: Will highlight lines', { startLine, endLine });
  } else {
    // For source list clicks or citations without line data, don't highlight
    startLine = -1;
    endLine = -1;
    console.log('SourceContentViewer: No highlighting (no valid line data)');
  }

  const renderHighlightedContent = () => {
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      const isHighlighted = startLine > 0 && lineNumber >= startLine && lineNumber <= endLine;
      const isFirstHighlightedLine = isHighlighted && lineNumber === startLine;
      
      return (
        <div
          key={index}
          ref={isFirstHighlightedLine ? highlightedContentRef : null}
          className={`py-2 px-3 rounded leading-relaxed ${
            isHighlighted 
              ? 'border-l-4' 
              : 'hover:bg-gray-50'
          }`}
          style={isHighlighted ? { 
            backgroundColor: '#eadef9', 
            borderLeftColor: '#9333ea' 
          } : {}}
        >
          <span className={isHighlighted ? 'font-medium' : ''}>{line}</span>
        </div>
      );
    });
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 cursor-pointer hover:text-gray-700" onClick={onBackToSources}>
            Resumo
          </h2>
          <Button variant="ghost" onClick={onBackToSources} className="p-2 [&_svg]:!w-6 [&_svg]:!h-6">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
              <path d="M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z" />
            </svg>
          </Button>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <div className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {getSourceIcon(citation.source_type)}
          </div>
          <span className="font-medium text-gray-900 truncate">{citation.source_title}</span>
        </div>
      </div>

      {/* Source Guide Accordion */}
      {sourceSummary && (
        <div className="border-b border-gray-200 flex-shrink-0">
          <Accordion type="single" value={accordionValue} onValueChange={setAccordionValue} collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger 
                className="px-4 py-3 text-sm font-medium hover:no-underline hover:bg-blue-50" 
                style={{ color: '#234776' }}
                chevronColor="#234776"
              >
                <span>Resumo do Documento</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="text-sm text-gray-700 space-y-4">
                  <div>
                    <p className="leading-relaxed">{sourceSummary}</p>
                  </div>
                  
                  {/* Show URL for website sources */}
                  {citation.source_type === 'website' && sourceUrl && (
                    <div>
                      <h4 className="font-medium mb-2">URL</h4>
                      <a 
                        href={sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline break-all text-sm"
                      >
                        {sourceUrl}
                      </a>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* Content */}
      {!isOpenedFromSourceList && (
        // When opened from citation click, show full content with highlighting
        <ScrollArea className="flex-1 h-full" ref={scrollAreaViewportRef}>
          <div className="p-4">
            <div className="prose prose-gray max-w-none space-y-1">
              {renderHighlightedContent()}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default SourceContentViewer;
