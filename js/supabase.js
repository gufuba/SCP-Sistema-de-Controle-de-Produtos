// ============================================================
// supabase.js — Configuração central da conexão com o banco
// ============================================================
// Este arquivo é importado por TODOS os outros arquivos JS.
// Se precisar trocar a URL ou a chave, muda só aqui.
//
// O Supabase funciona como uma API REST — em vez de escrever
// SQL diretamente, usamos funções JavaScript que montam as
// consultas por baixo dos panos.
// ============================================================

// URL do seu projeto no Supabase
const SUPABASE_URL = 'https://xufflqqbzeyysonibrgd.supabase.co';

// Chave pública (anon key) — segura para ficar no front-end.
// Ela só permite o que as políticas RLS do banco autorizam.
const SUPABASE_ANON_KEY = 'sb_publishable_BOgbk1mTMxQfiownQMpRQQ_fRn5j5cZ';

// Criamos o "client" do Supabase usando a biblioteca oficial.
// Essa variável "dbCliente" será usada em todos os outros arquivos
// para fazer consultas: supabase.from('tabela').select('*') etc.
const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);