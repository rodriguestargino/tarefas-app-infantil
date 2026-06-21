-- Migration para permitir a reivindicação de códigos sem proprietário

-- Política: Permite que usuários autenticados atualizem a tabela famílias 
-- somente se a linha correspondente ainda não possuir um proprietário (owner_id IS NULL)
CREATE POLICY "Users can claim unowned family codes"
ON public.families
FOR UPDATE
TO authenticated
USING (owner_id IS NULL)
WITH CHECK (owner_id = auth.uid());
