
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useSources } from '@/hooks/useSources';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import NotebookHeader from '@/components/notebook/NotebookHeader';
import SourcesSidebar from '@/components/notebook/SourcesSidebar';
import MobileNotebookTabs from '@/components/notebook/MobileNotebookTabs';
import { Citation } from '@/types/message';

const Notebook = () => {
  const { id: notebookId } = useParams();
  const { notebooks } = useNotebooks();
  const { sources } = useSources(notebookId);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const isDesktop = useIsDesktop();

  const notebook = notebooks?.find(n => n.id === notebookId);
  const hasSource = sources && sources.length > 0;
  const isSourceDocumentOpen = !!selectedCitation;

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
  };

  const handleCitationClose = () => {
    setSelectedCitation(null);
  };

  // Dynamic width calculations for desktop - 2 column layout
  const sourcesWidth = isSourceDocumentOpen ? 'w-[35%]' : 'w-[30%]';
  const chatWidth = isSourceDocumentOpen ? 'w-[65%]' : 'w-[70%]';

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <NotebookHeader 
        title={notebook?.title || 'Dossiê Sem Título'} 
        notebookId={notebookId}
        hasSource={hasSource}
      />
      
      {isDesktop ? (
        // Desktop layout - only sources sidebar
        <div className="flex-1 flex overflow-hidden">
          <div className="w-full">
            <SourcesSidebar 
              hasSource={hasSource || false} 
              notebookId={notebookId}
              notebookTitle={notebook?.title}
              selectedCitation={selectedCitation}
              onCitationClose={handleCitationClose}
              setSelectedCitation={setSelectedCitation}
            />
          </div>
        </div>
      ) : (
        // Mobile/Tablet layout - only sources
        <div className="flex-1 overflow-hidden">
          <SourcesSidebar 
            hasSource={hasSource || false} 
            notebookId={notebookId}
            notebookTitle={notebook?.title}
            selectedCitation={selectedCitation}
            onCitationClose={handleCitationClose}
            setSelectedCitation={setSelectedCitation}
          />
        </div>
      )}
    </div>
  );
};

export default Notebook;
