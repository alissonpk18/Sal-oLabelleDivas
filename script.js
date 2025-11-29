/**
 * Fluxograma resumido (Apps Script CRM Financeiro):
 * Entrada → requisições HTTP GET/POST do site (GitHub Pages)
 * Validação → checar parâmetro "action" (GET) ou "tipoRegistro" (POST)
 * Lógica → ler/escrever nas abas CLIENTES, SERVICOS, ATENDIMENTOS, DESPESAS e calcular resumoMensal
 * Saída → JSON com {sucesso, mensagem, ...dados}
 * Versão 1.5 — 29/11/2025 / Mudança: inclusão de resumoMensal + fallback para abrir planilha por nome
 */

// =========================
// CONFIGURAÇÃO BÁSICA
// =========================
const NOME_PLANILHA     = 'CRM_Financeiro_Salao';  // ajuste para o nome exato da planilha
const ABA_CLIENTES      = 'CLIENTES';
const ABA_SERVICOS      = 'SERVICOS';
const ABA_ATENDIMENTOS  = 'ATENDIMENTOS';
const ABA_DESPESAS      = 'DESPESAS';

// =========================
// FUNÇÕES DE APOIO
// =========================

function getSpreadsheet_() {
  // Tenta pegar a planilha ativa (script vinculado). Se não der, abre por nome.
  try {
    const ssAtiva = SpreadsheetApp.getActiveSpreadsheet();
    if (ssAtiva) return ssAtiva;
  } catch (e) {
    // ignora e tenta por nome
  }
  return SpreadsheetApp.openByName(NOME_PLANILHA);
}

function getSheet_(nomeAba) {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName(nomeAba);
  if (!sh) throw new Error('Aba não encontrada: ' + nomeAba);
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================
// HANDLERS HTTP
// =========================

function doGet(e) {
  let resp;
  try {
    const action = e && e.parameter && e.parameter.action;

    switch (action) {
      case 'listClientes':
        resp = { sucesso: true, clientes: listarClientes_() };
        break;

      case 'listServicos':
        resp = { sucesso: true, servicos: listarServicos_() };
        break;

      case 'listAtendimentos':
        resp = { sucesso: true, atendimentos: listarAtendimentos_() };
        break;

      case 'listDespesas':
        resp = { sucesso: true, despesas: listarDespesas_() };
        break;

      case 'resumoMensal':
        resp = resumoMensal_(e);
        break;

      default:
        resp = {
          sucesso: false,
          mensagem: 'Parâmetro "action" inválido ou não informado.'
        };
    }
  } catch (err) {
    resp = { sucesso: false, mensagem: 'Erro interno (GET): ' + err };
  }

  return json_(resp);
}

function doPost(e) {
  let body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return json_({
      sucesso: false,
      mensagem: 'JSON inválido no corpo da requisição.'
    });
  }

  let resp;
  try {
    const tipo = body.tipoRegistro;
    switch (tipo) {
      case 'cliente':
        resp = salvarCliente_(body);
        break;

      case 'servico':
        resp = salvarServico_(body);
        break;

      case 'atendimento':
        resp = salvarAtendimento_(body);
        break;

      case 'despesa':
        resp = salvarDespesa_(body);
        break;

      default:
        resp = {
          sucesso: false,
          mensagem: 'tipoRegistro inválido ou não informado.'
        };
    }
  } catch (err2) {
    resp = { sucesso: false, mensagem: 'Erro interno (POST): ' + err2 };
  }

  return json_(resp);
}

// =========================
// CLIENTES
// =========================

function salvarCliente_(dados) {
  const sh = getSheet_(ABA_CLIENTES);

  const id = 'C_' + new Date().getTime();
  const nome = (dados.nome || '').toString().trim();
  const telefone = (dados.telefone || '').toString().trim();
  const obs = (dados.observacoes || '').toString().trim();

  if (!nome) {
    return { sucesso: false, mensagem: 'Nome do cliente é obrigatório.' };
  }

  sh.appendRow([
    id,
    nome,
    telefone,
    obs,
    new Date()     // DATA_CADASTRO
  ]);

  return { sucesso: true, idCliente: id };
}

function listarClientes_() {
  const sh = getSheet_(ABA_CLIENTES);
  const values = sh.getDataRange().getValues(); // inclui cabeçalho
  const out = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = row[0];
    if (!id) continue;

    out.push({
      ID_CLIENTE: id,
      NOME: row[1],
      TELEFONE: row[2],
      OBSERVACOES: row[3],
      DATA_CADASTRO: row[4]
    });
  }
  return out;
}

// =========================
// SERVIÇOS
// =========================

function salvarServico_(dados) {
  const sh = getSheet_(ABA_SERVICOS);

  const id = 'S_' + new Date().getTime();
  const nome = (dados.nomeServico || dados.nome || '').toString().trim();
  const categoria = (dados.categoria || '').toString().trim();
  const precoBase = Number(dados.precoBase) || 0;
  const ativo = dados.ativo === false ? false : true; // padrão true

  if (!nome) {
    return { sucesso: false, mensagem: 'Nome do serviço é obrigatório.' };
  }

  sh.appendRow([
    id,
    nome,
    categoria,
    precoBase,
    ativo,
    new Date() // DATA_CADASTRO
  ]);

  return { sucesso: true, idServico: id };
}

function listarServicos_() {
  const sh = getSheet_(ABA_SERVICOS);
  const values = sh.getDataRange().getValues();
  const out = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = row[0];
    if (!id) continue;

    out.push({
      ID_SERVICO: id,
      NOME_SERVICO: row[1],
      CATEGORIA: row[2],
      PRECO_BASE: row[3],
      ATIVO: row[4],
      DATA_CADASTRO: row[5]
    });
  }
  return out;
}

// =========================
// ATENDIMENTOS
// =========================

function salvarAtendimento_(dados) {
  const sh = getSheet_(ABA_ATENDIMENTOS);

  const dataStr = dados.data; // esperado "YYYY-MM-DD"
  const data = dataStr ? new Date(dataStr) : new Date();

  const idCliente = dados.idCliente;
  const idServico = dados.idServico;
  const valorTotal = Number(dados.valorTotal) || 0;
  const formaPagamento = (dados.formaPagamento || '').toString().trim();
  const obs = (dados.observacoes || '').toString().trim();

  if (!dataStr || !idCliente || !idServico || !formaPagamento || valorTotal <= 0) {
    return {
      sucesso: false,
      mensagem: 'Campos obrigatórios: data, cliente, serviço, formaPagamento e valorTotal > 0.'
    };
  }

  sh.appendRow([
    data,
    idCliente,
    idServico,
    valorTotal,
    formaPagamento,
    obs,
    new Date() // DATA_REGISTRO
  ]);

  return { sucesso: true };
}

function listarAtendimentos_() {
  const sh = getSheet_(ABA_ATENDIMENTOS);
  const values = sh.getDataRange().getValues();
  const out = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const data = row[0];
    const idCliente = row[1];
    if (!data || !idCliente) continue;

    out.push({
      DATA: data,
      ID_CLIENTE: idCliente,
      ID_SERVICO: row[2],
      VALOR_TOTAL: row[3],
      FORMA_PAGAMENTO: row[4],
      OBSERVACOES: row[5]
    });
  }
  return out;
}

// =========================
// DESPESAS
// =========================

function salvarDespesa_(dados) {
  const sh = getSheet_(ABA_DESPESAS);

  const dataStr = dados.data;
  const data = dataStr ? new Date(dataStr) : new Date();

  const categoria = (dados.categoria || '').toString().trim();
  const descricao = (dados.descricao || '').toString().trim();
  const valor = Number(dados.valor) || 0;
  const formaPagamento = (dados.formaPagamento || '').toString().trim();
  const obs = (dados.observacoes || '').toString().trim();

  if (!dataStr || !categoria || valor <= 0) {
    return {
      sucesso: false,
      mensagem: 'Data, categoria e valor > 0 são obrigatórios para despesa.'
    };
  }

  sh.appendRow([
    data,
    categoria,
    descricao,
    valor,
    formaPagamento,
    obs,
    new Date() // DATA_REGISTRO
  ]);

  return { sucesso: true };
}

function listarDespesas_() {
  const sh = getSheet_(ABA_DESPESAS);
  const values = sh.getDataRange().getValues();
  const out = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const data = row[0];
    if (!data) continue;

    out.push({
      DATA: data,
      CATEGORIA: row[1],
      DESCRICAO: row[2],
      VALOR: row[3],
      FORMA_PAGAMENTO: row[4],
      OBSERVACOES: row[5]
    });
  }
  return out;
}

// =========================
// RESUMO MENSAL (ENTRADAS x SAÍDAS)
// =========================

function resumoMensal_(e) {
  const mesParam = e && e.parameter && e.parameter.mes;
  if (!mesParam) {
    return {
      sucesso: false,
      mensagem: 'Parâmetro "mes" (YYYY-MM) é obrigatório.'
    };
  }

  const partes = mesParam.split('-');
  if (partes.length !== 2) {
    return {
      sucesso: false,
      mensagem: 'Parâmetro "mes" inválido. Use formato YYYY-MM.'
    };
  }

  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  if (isNaN(ano) || isNaN(mes)) {
    return {
      sucesso: false,
      mensagem: 'Parâmetro "mes" inválido. Use formato YYYY-MM.'
    };
  }

  const inicio = new Date(ano, mes - 1, 1);
  const fim    = new Date(ano, mes, 0);

  let totalEntradas = 0;
  let totalSaidas   = 0;

  // ===== ENTRADAS (ATENDIMENTOS) =====
  const shAt = getSheet_(ABA_ATENDIMENTOS);
  const valsAt = shAt.getDataRange().getValues(); // inclui cabeçalho
  for (let i = 1; i < valsAt.length; i++) {
    const row  = valsAt[i];
    const data = row[0];              // Col A = DATA
    const val  = Number(row[3]) || 0; // Col D = VALOR_TOTAL

    if (data instanceof Date && data >= inicio && data <= fim) {
      totalEntradas += val;
    }
  }

  // ===== SAÍDAS (DESPESAS) =====
  const shDp = getSheet_(ABA_DESPESAS);
  const valsDp = shDp.getDataRange().getValues();
  for (let i = 1; i < valsDp.length; i++) {
    const row  = valsDp[i];
    const data = row[0];              // Col A = DATA
    const val  = Number(row[3]) || 0; // Col D = VALOR

    if (data instanceof Date && data >= inicio && data <= fim) {
      totalSaidas += val;
    }
  }

  return {
    sucesso: true,
    mes: mesParam,
    totalEntradas: totalEntradas,
    totalSaidas:   totalSaidas,
    resultado:     totalEntradas - totalSaidas
  };
}
