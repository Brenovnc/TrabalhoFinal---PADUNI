-- #######################################################
-- # SCRIPT DE CRIACAO DO BANCO DE DADOS PADUNI (PostgreSQL)
-- #######################################################
--
-- NOTAS SOBRE FOREIGN KEYS E EXCLUSÃO DE USUÁRIOS:
-- - Todas as foreign keys que referenciam usuarios_table usam ON DELETE SET NULL
--   Isso permite hard delete de usuários (LGPD compliant) mantendo dados históricos
--   (logs, matches, mensagens, agendamentos) sem referência ao usuário deletado
-- - A foreign key curso_id em usuarios_table usa ON DELETE RESTRICT
--   (não permite deletar curso se houver usuários usando-o)
--
-- #######################################################

-- 1. CRIACAO DOS TIPOS ENUM
----------------------------------------------

-- Tipo de perfil do estudante
CREATE TYPE tipo_usuario AS ENUM (
    'veterano',
    'calouro',
    'administrador'
);

-- Status do estudante no processo de match
CREATE TYPE status_match_usuario AS ENUM (
    'pendente',
    'pareado',
    'nao_pareado'
);

-- Status de um vinculo Match
CREATE TYPE tipo_status_match AS ENUM (
    'ativo',
    'cancelado',
    'anulacao_pendente'
);

-- Estado da execucao da IA
CREATE TYPE status_agendamento_ia AS ENUM (
    'agendado',
    'executando',
    'concluido',
    'falhou'
);

-- Genero do usuario
CREATE TYPE genero_usuario AS ENUM (
    'masculino',
    'feminino',
    'outro'
);

-- 2. TABELA DE CURSOS
--------------------------------------------------------------------------------

CREATE TABLE cursos_table (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL
);

-- 3. TABELA PRINCIPAL DE USUARIOS
----------------------------------

CREATE TABLE usuarios_table (
    -- Chave Primaria
    id BIGSERIAL PRIMARY KEY,

    -- Dados Cadastrais
    nome VARCHAR(30) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    ano_nascimento INTEGER NOT NULL,
    ano_entrada_unifei INTEGER NOT NULL,
    interesses VARCHAR(600) NOT NULL,
    hash_senha VARCHAR(255) NOT NULL,

    -- Uso dos ENUMs
    genero genero_usuario NOT NULL,
    tipo_usuario tipo_usuario NOT NULL,
    status_match status_match_usuario NOT NULL,

    -- Chave Estrangeira
    curso_id INTEGER REFERENCES cursos_table(id) ON UPDATE CASCADE ON DELETE RESTRICT,

    -- MFA
    codigo_mfa VARCHAR(255),
    expiracao_mfa TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE VINCULOS (MATCHES)
---------------------------------

CREATE TABLE matches_table (
    -- Chave Primaria
    id BIGSERIAL PRIMARY KEY,

    -- Chaves Estrangeiras para Usuarios
    -- ON DELETE SET NULL permite deletar usuários mantendo os matches (sem referência)
    id_usuario_veterano BIGINT REFERENCES usuarios_table(id) ON UPDATE CASCADE ON DELETE SET NULL,
    id_usuario_calouro BIGINT REFERENCES usuarios_table(id) ON UPDATE CASCADE ON DELETE SET NULL,

    -- Restricao de unicidade para o par (o mesmo par nao pode ter mais de um registro)
    UNIQUE (id_usuario_veterano, id_usuario_calouro),

    status tipo_status_match NOT NULL,

    -- Anulacao
    solicitacao_anulacao BOOLEAN DEFAULT FALSE,
    justificativa_anulacao TEXT,

    -- Timestamps
    data_match TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE COMUNICACAO (CHAT)
----------------------------------

CREATE TABLE mensagens_table (
    -- Chave Primaria
    id BIGSERIAL PRIMARY KEY,

    -- Chaves Estrangeiras
    id_match BIGINT REFERENCES matches_table(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    -- ON DELETE SET NULL permite deletar usuários mantendo as mensagens (sem referência)
    id_usuario_remetente BIGINT REFERENCES usuarios_table(id) ON UPDATE CASCADE ON DELETE SET NULL,
    id_usuario_destinatario BIGINT REFERENCES usuarios_table(id) ON UPDATE CASCADE ON DELETE SET NULL,

    -- Conteudo
    conteudo VARCHAR(2000) NOT NULL,
    lida_pelo_destinatario BOOLEAN DEFAULT FALSE,

    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. TABELA DE AGENDAMENTOS DA IA
----------------------------------

CREATE TABLE agendamentos_ia_table (
    -- Chave Primaria
    id BIGSERIAL PRIMARY KEY,

    -- Chave Estrangeira para o Administrador responsavel
    -- ON DELETE SET NULL permite deletar admin mantendo os agendamentos (sem referência)
    id_usuario_admin_agendador BIGINT REFERENCES usuarios_table(id) ON UPDATE CASCADE ON DELETE SET NULL,

    status status_agendamento_ia NOT NULL,

    -- Configuracao e Execucao
    data_hora_execucao TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_minutos INTEGER,
    relatorio_enviado BOOLEAN DEFAULT FALSE,

    -- Timestamps
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE LOGS
-------------------------------------------------

CREATE TABLE logs_acao_critica_table (
    -- Chave Primaria
    id BIGSERIAL PRIMARY KEY,

    -- Chave Estrangeira para o Administrador responsavel
    -- ON DELETE SET NULL permite deletar usuários mantendo os logs (sem referência)
    id_usuario_responsavel BIGINT REFERENCES usuarios_table(id) ON UPDATE CASCADE ON DELETE SET NULL,

    -- Detalhes da Acao
    acao VARCHAR(255) NOT NULL,
    alvo VARCHAR(255) NOT NULL,
    justificativa TEXT NOT NULL,

    -- Timestamp
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

