-- Migration para criar a RPC de exclusão de usuário e dados

CREATE OR REPLACE FUNCTION public.delete_user_and_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios elevados para poder deletar de auth.users
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_family_code TEXT;
BEGIN
  -- 1. Captura o UUID do usuário que realizou a chamada autenticada
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.';
  END IF;

  -- 2. Identifica o código de família de propriedade do usuário (se houver)
  SELECT code INTO v_family_code 
  FROM public.families 
  WHERE owner_id = v_user_id;

  -- 3. Exclui os dados de sincronização familiares se for o dono
  IF v_family_code IS NOT NULL THEN
    DELETE FROM public.family_data WHERE family_code = v_family_code;
    DELETE FROM public.families WHERE code = v_family_code;
  END IF;

  -- 4. Exclui a conta do usuário de auth.users (desconecta sessões ativas)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
