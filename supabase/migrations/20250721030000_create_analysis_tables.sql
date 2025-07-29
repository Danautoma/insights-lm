-- Create analysis_checklist table
CREATE TABLE IF NOT EXISTS public.analysis_checklist (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_title text NOT NULL,
    question text NOT NULL,
    category text,
    order_index integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id uuid NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
    checklist_id uuid NOT NULL REFERENCES public.analysis_checklist(id) ON DELETE CASCADE,
    summary text NOT NULL,
    confidence_score decimal(3,2),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_analysis_results_notebook_id ON public.analysis_results(notebook_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_checklist_id ON public.analysis_results(checklist_id);
CREATE INDEX IF NOT EXISTS idx_analysis_checklist_order ON public.analysis_checklist(order_index);

-- Enable RLS
ALTER TABLE public.analysis_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_checklist (public read access)
DROP POLICY IF EXISTS "Anyone can view analysis checklist" ON public.analysis_checklist;
CREATE POLICY "Anyone can view analysis checklist"
    ON public.analysis_checklist FOR SELECT
    USING (true);

-- RLS Policies for analysis_results
DROP POLICY IF EXISTS "Users can view analysis results from their notebooks" ON public.analysis_results;
CREATE POLICY "Users can view analysis results from their notebooks"
    ON public.analysis_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.notebooks
            WHERE notebooks.id = analysis_results.notebook_id
            AND notebooks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create analysis results in their notebooks" ON public.analysis_results;
CREATE POLICY "Users can create analysis results in their notebooks"
    ON public.analysis_results FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.notebooks
            WHERE notebooks.id = analysis_results.notebook_id
            AND notebooks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update analysis results in their notebooks" ON public.analysis_results;
CREATE POLICY "Users can update analysis results in their notebooks"
    ON public.analysis_results FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.notebooks
            WHERE notebooks.id = analysis_results.notebook_id
            AND notebooks.user_id = auth.uid()
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER update_analysis_checklist_updated_at
    BEFORE UPDATE ON public.analysis_checklist
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analysis_results_updated_at
    BEFORE UPDATE ON public.analysis_results
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample checklist items
INSERT INTO public.analysis_checklist (topic_title, question, category, order_index) VALUES
('Análise de Penhoras e Gravames', 'Existem penhoras, hipotecas ou outros gravames registrados sobre o imóvel?', 'juridico', 1),
('Situação da Matrícula', 'A matrícula do imóvel está atualizada e sem irregularidades?', 'documentacao', 2),
('Análise do Processo Judicial', 'O processo judicial está tramitando regularmente e sem vícios processuais?', 'juridico', 3),
('Avaliação do Imóvel', 'O valor de avaliação do imóvel está compatível com o mercado?', 'financeiro', 4),
('Documentação do Leilão', 'O edital do leilão contém todas as informações necessárias e está em conformidade?', 'documentacao', 5),
('Riscos e Oportunidades', 'Quais são os principais riscos e oportunidades identificados neste investimento?', 'analise', 6);
