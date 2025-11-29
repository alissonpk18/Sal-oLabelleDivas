// =======================================================
// Fluxograma resumido (script.js CRM Financeiro + Login)
// Entrada:
//   - Login simples (usuário/senha em memória)
//   - Requisições HTTP GET/POST para o Apps Script (API_URL)
// Validação:
//   - Login: usuário = dagmar|cadastro e senha = 1234
//   - Forms: campos obrigatórios antes de enviar
// Lógica:
//   - Carregar combos/listas (clientes, serviços, atendimentos, despesas)
//   - Registrar novos clientes, serviços, atendimentos e despesas
//   - Calcular resumo mensal (entradas, saídas, resultado)
// Saída:
//   - Interface atualizada (tabelas, selects, resumo financeiro)
//   - Alertas simples de sucesso/erro
// Versão 1.5 — 29/11/2025 / Mudança: inclusão de login (dagmar/cadastro)
//   e controle de visibilidade por perfil.
// =======================================================

// =======================================================
// CONFIGURAÇÃO DA API
// =======================================================

// SUBSTITUA AQUÍ PELO URL DO SEU WEBAPP DO APPS SCRIPT:
const API_URL = 'https://script.google.com/macros/s/SEU_WEBAPP_AQUI/exec';

// Cache em memória
let cacheClientes = [];
let cacheServicos = [];
let cacheAtendimentos = [];
let cacheDespesas = [];
let mapaClientes = {}; // ID -> Nome
let mapaServicos = {}; // ID -> Nome
let papelAtual = null; // 'admin' ou 'cadastro'

// =======================================================
// INICIALIZAÇÃO GERAL
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  inicializarLogin();
});

// =======================================================
// LOGIN SIMPLES (HTML precisa ter:
//   - div #loginWrapper
//   - form #loginForm
//   - input #loginUsuario
//   - input #loginSenha
//   - div #appMain (conteúdo principal, começa com d-none)
// =======================================================

function inicializarLogin() {
  const loginWrapper = document.getElementById('loginWrapper');
  const appMain = document.getElementById('appMain');
  const loginForm = document.getElementById('loginForm');
  const inputUsuario = document.getElementById('loginUsuario');
  const inputSenha = document.getElementById('loginSenha');

  if (!loginForm || !loginWrapper || !appMain) {
    console.warn('Elementos de login não encontrados. Iniciando app direto.');
    inicializarApp(); // fallback
    return;
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const usuario = (inputUsuario.value || '').trim().toLowerCase();
    const senha = (inputSenha.value || '').trim();

    if (!usuario || !senha) {
      alert('Informe usuário e senha.');
      return;
    }

    if (senha !== '1234') {
      alert('Senha incorreta.');
      inputSenha.focus();
      return;
    }

    if (usuario === 'dagmar') {
      papelAtual = 'admin';
    } else if (usuario === 'cadastro') {
      papelAtual = 'cadastro';
    } else {
      alert('Usuário inválido. Use "dagmar" ou "cadastro".');
      inputUsuario.focus();
      return;
    }

    // Esconde login e mostra app
    loginWrapper.classList.add('d-none');
    appMain.classList.remove('d-none');

    aplicarPermissoesPorPapel(papelAtual);
    inicializarApp();
  });
}

/**
 * Esconde/mostra seções e botões de acordo com o papel
 * - admin: vê tudo
 * - cadastro: vê apenas Registrar Atendimento + Resumo
 */
function aplicarPermissoesPorPapel(papel) {
  if (papel !== 'cadastro') {
    // admin vê tudo -> nada a esconder
    return;
  }

  // Seções que só o admin deve ver
  const alvosAdminTargets = [
    '#secNovoCliente',
    '#secNovoServico',
    '#secNovaDespesa',
    '#secListaClientes',
    '#secListaServicos',
    '#secListaDespesas',
    '#secHistorico'
  ];

  // Esconde botões que abrem esses collapses
  alvosAdminTargets.forEach((target) => {
    document
      .querySelectorAll(`[data-bs-target="${target}"]`)
      .forEach((btn) => btn.classList.add('d-none'));

    const sec = document.querySelector(target);
    if (sec) {
      sec.classList.add('d-none');
    }
  });
}

// =======================================================
// INICIALIZAÇÃO DO APP (DEPOIS DO LOGIN)
// =======================================================

function inicializarApp() {
  // Define mês atual no resumo
  const mesResumo = document.getElementById('mesResumo');
  if (mesResumo) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    mesResumo.value = `${ano}-${mes}`;
    mesResumo.addEventListener('change', atualizarResumoFinanceiro);
  }

  // Listeners dos formulários
  const formCliente = document.getElementById('formCliente');
  if (formCliente) {
    formCliente.addEventListener('submit', handleSubmitCliente);
  }

  const formServico = document.getElementById('formServico');
  if (formServico) {
    formServico.addEventListener('submit', handleSubmitServico);
  }

  const formAtendimento = document.getElementById('formAtendimento');
  if (formAtendimento) {
    formAtendimento.addEventListener('submit', handleSubmitAtendimento);
  }

  const formDespesa = document.getElementById('formDespesa');
  if (formDespesa) {
    formDespesa.addEventListener('submit', handleSubmitDespesa);
  }

  // Carregamento inicial de dados
  carregarTodosOsDados();
}

async function carregarTodosOsDados() {
  try {
    await Promise.all([
      carregarClientes(),
      carregarServicos(),
      carregarAtendimentos(),
      carregarDespesas(),
      atualizarResumoFinanceiro()
    ]);
  } catch (err) {
    console.error('Erro ao carregar dados iniciais:', err);
    alert('Erro ao carregar dados iniciais. Verifique o console.');
  }
}

// =======================================================
// FUNÇÕES AUXILIARES DE API
// =======================================================

async function apiGet(paramsObj) {
  const url = `${API_URL}?${new URLSearchParams(paramsObj).toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data && data.sucesso === false) {
    throw new Error(data.mensagem || 'Erro na API (GET).');
  }
  return data;
}

async function apiPost(bodyObj) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: JSON.stringify(bodyObj)
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data && data.sucesso === false) {
    throw new Error(data.mensagem || 'Erro na API (POST).');
  }
  return data;
}

function formatarDataBR(valor) {
  if (!valor) return '';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

function formatarMoedaBR(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// =======================================================
// CARREGAR CLIENTES / SERVIÇOS / ATENDIMENTOS / DESPESAS
// =======================================================

async function carregarClientes() {
  const data = await apiGet({ action: 'listClientes' });
  cacheClientes = data.clientes || [];
  mapaClientes = {};

  const selectCliente = document.getElementById('atCliente');
  const tbody = document.getElementById('tabelaClientes');

  if (selectCliente) {
    selectCliente.innerHTML = '<option value="">Selecione um cliente...</option>';
  }
  if (tbody) {
    tbody.innerHTML = '';
  }

  cacheClientes.forEach((cli) => {
    const id = cli.ID_CLIENTE;
    const nome = cli.NOME;
    mapaClientes[id] = nome;

    if (selectCliente) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = nome;
      selectCliente.appendChild(opt);
    }

    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${nome || ''}</td>
        <td>${cli.TELEFONE || ''}</td>
        <td>${cli.OBSERVACOES || ''}</td>
      `;
      tbody.appendChild(tr);
    }
  });
}

async function carregarServicos() {
  const data = await apiGet({ action: 'listServicos' });
  cacheServicos = data.servicos || [];
  mapaServicos = {};

  const selectServico = document.getElementById('atServico');
  const tbody = document.getElementById('tabelaServicos');

  if (selectServico) {
    selectServico.innerHTML = '<option value="">Selecione um serviço...</option>';
  }
  if (tbody) {
    tbody.innerHTML = '';
  }

  cacheServicos.forEach((srv) => {
    const id = srv.ID_SERVICO;
    const nome = srv.NOME_SERVICO;
    mapaServicos[id] = nome;

    if (selectServico) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = nome;
      selectServico.appendChild(opt);
    }

    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${nome || ''}</td>
        <td>${srv.CATEGORIA || ''}</td>
        <td>${formatarMoedaBR(srv.PRECO_BASE)}</td>
        <td>${srv.ATIVO ? 'Sim' : 'Não'}</td>
      `;
      tbody.appendChild(tr);
    }
  });
}

async function carregarAtendimentos() {
  const data = await apiGet({ action: 'listAtendimentos' });
  cacheAtendimentos = data.atendimentos || [];

  const tbody = document.getElementById('tabelaAtendimentos');
  if (!tbody) return;
  tbody.innerHTML = '';

  cacheAtendimentos.forEach((at) => {
    const nomeCli = mapaClientes[at.ID_CLIENTE] || at.ID_CLIENTE;
    const nomeSrv = mapaServicos[at.ID_SERVICO] || at.ID_SERVICO;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarDataBR(at.DATA)}</td>
      <td>${nomeCli}</td>
      <td>${nomeSrv}</td>
      <td>${formatarMoedaBR(at.VALOR_TOTAL)}</td>
      <td>${at.FORMA_PAGAMENTO || ''}</td>
      <td>${at.OBSERVACOES || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function carregarDespesas() {
  const data = await apiGet({ action: 'listDespesas' });
  cacheDespesas = data.despesas || [];

  const tbody = document.getElementById('tabelaDespesas');
  if (!tbody) return;
  tbody.innerHTML = '';

  cacheDespesas.forEach((dp) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarDataBR(dp.DATA)}</td>
      <td>${dp.CATEGORIA || ''}</td>
      <td>${dp.DESCRICAO || ''}</td>
      <td>${formatarMoedaBR(dp.VALOR)}</td>
      <td>${dp.FORMA_PAGAMENTO || ''}</td>
      <td>${dp.OBSERVACOES || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =======================================================
// RESUMO FINANCEIRO
// =======================================================

async function atualizarResumoFinanceiro() {
  const mesResumo = document.getElementById('mesResumo');
  if (!mesResumo || !mesResumo.value) return;

  try {
    const data = await apiGet({
      action: 'resumoMensal',
      mes: mesResumo.value
    });

    const elEntradas = document.getElementById('resumoEntradas');
    const elSaidas = document.getElementById('resumoSaidas');
    const elResultado = document.getElementById('resumoResultado');

    if (elEntradas) {
      elEntradas.textContent = formatarMoedaBR(data.totalEntradas || 0);
    }
    if (elSaidas) {
      elSaidas.textContent = formatarMoedaBR(data.totalSaidas || 0);
    }
    if (elResultado) {
      elResultado.textContent = formatarMoedaBR(data.resultado || 0);
    }
  } catch (err) {
    console.error('Erro ao atualizar resumo financeiro:', err);
    alert('Erro ao atualizar resumo financeiro. Verifique o console.');
  }
}

// =======================================================
// HANDLERS DE FORMULÁRIO
// =======================================================

async function handleSubmitCliente(e) {
  e.preventDefault();
  const nome = document.getElementById('clienteNome').value.trim();
  const telefone = document.getElementById('clienteTelefone').value.trim();
  const obs = document.getElementById('clienteObs').value.trim();

  if (!nome) {
    alert('Informe o nome do cliente.');
    return;
  }

  try {
    await apiPost({
      tipoRegistro: 'cliente',
      nome,
      telefone,
      observacoes: obs
    });
    alert('Cliente salvo com sucesso!');
    e.target.reset();
    await carregarClientes();
  } catch (err) {
    console.error('Erro ao salvar cliente:', err);
    alert('Erro ao salvar cliente. Verifique o console.');
  }
}

async function handleSubmitServico(e) {
  e.preventDefault();
  const nomeServico = document.getElementById('servicoNome').value.trim();
  const categoria = document.getElementById('servicoCategoria').value.trim();
  const precoBase = Number(
    document.getElementById('servicoPreco').value.replace(',', '.')
  ) || 0;

  if (!nomeServico) {
    alert('Informe o nome do serviço.');
    return;
  }

  try {
    await apiPost({
      tipoRegistro: 'servico',
      nomeServico,
      categoria,
      precoBase,
      ativo: true
    });
    alert('Serviço salvo com sucesso!');
    e.target.reset();
    await carregarServicos();
  } catch (err) {
    console.error('Erro ao salvar serviço:', err);
    alert('Erro ao salvar serviço. Verifique o console.');
  }
}

async function handleSubmitAtendimento(e) {
  e.preventDefault();

  const data = document.getElementById('atData').value;
  const idCliente = document.getElementById('atCliente').value;
  const idServico = document.getElementById('atServico').value;
  const valorStr = document.getElementById('atValor').value;
  const formaPagamento = document.getElementById('atFormaPgto').value;
  const obs = document.getElementById('atObs').value.trim();

  const valorTotal = Number(valorStr.replace(',', '.')) || 0;

  if (!data || !idCliente || !idServico || !valorTotal || !formaPagamento) {
    alert('Preencha todos os campos obrigatórios do atendimento.');
    return;
  }

  try {
    await apiPost({
      tipoRegistro: 'atendimento',
      data,
      idCliente,
      idServico,
      valorTotal,
      formaPagamento,
      observacoes: obs
    });

    alert('Atendimento registrado com sucesso!');
    e.target.reset();

    await Promise.all([
      carregarAtendimentos(),
      atualizarResumoFinanceiro()
    ]);
  } catch (err) {
    console.error('Erro ao salvar atendimento:', err);
    alert('Erro ao salvar atendimento. Verifique o console.');
  }
}

async function handleSubmitDespesa(e) {
  e.preventDefault();

  const data = document.getElementById('despData').value;
  const categoria = document.getElementById('despCategoria').value.trim();
  const descricao = document.getElementById('despDescricao').value.trim();
  const valorStr = document.getElementById('despValor').value;
  const formaPagamento = document.getElementById('despFormaPgto').value;
  const obs = document.getElementById('despObs').value.trim();

  const valor = Number(valorStr.replace(',', '.')) || 0;

  if (!data || !categoria || !valor) {
    alert('Preencha data, categoria e valor da despesa.');
    return;
  }

  try {
    await apiPost({
      tipoRegistro: 'despesa',
      data,
      categoria,
      descricao,
      valor,
      formaPagamento,
      observacoes: obs
    });

    alert('Despesa registrada com sucesso!');
    e.target.reset();

    await Promise.all([
      carregarDespesas(),
      atualizarResumoFinanceiro()
    ]);
  } catch (err) {
    console.error('Erro ao salvar despesa:', err);
    alert('Erro ao salvar despesa. Verifique o console.');
  }
}
// Fluxograma resumido (script.js):
// Entrada → usuário abre página e tenta logar
// Validação → loginUsuario/loginSenha (dagmar ou cadastro + 1234)
// Lógica → define papel (admin ou cadastro), esconde tela de login e mostra app
// Saída → app inicializado com permissões do papel
// Versão 1.5 — 29/11/2025 / Mudança: inclusão de login simples e controle de permissões

let papelAtual = null; // 'admin' ou 'cadastro'

document.addEventListener('DOMContentLoaded', () => {
  inicializarLogin();
});

function inicializarLogin() {
  const loginWrapper = document.getElementById('loginWrapper');
  const appMain      = document.getElementById('appMain');
  const loginForm    = document.getElementById('loginForm');
  const inputUsuario = document.getElementById('loginUsuario');
  const inputSenha   = document.getElementById('loginSenha');
  const divErro      = document.getElementById('loginErro');

  if (!loginWrapper || !appMain || !loginForm) {
    console.warn('Elementos de login não encontrados. Iniciando app direto.');
    inicializarApp(); // usa o que você já tinha para iniciar o app
    return;
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const usuario = (inputUsuario.value || '').trim().toLowerCase();
    const senha   = (inputSenha.value || '').trim();

    if (divErro) divErro.classList.add('d-none');

    if (!usuario || !senha) {
      if (divErro) {
        divErro.textContent = 'Informe usuário e senha.';
        divErro.classList.remove('d-none');
      } else {
        alert('Informe usuário e senha.');
      }
      return;
    }

    if (senha !== '1234') {
      if (divErro) {
        divErro.textContent = 'Senha incorreta.';
        divErro.classList.remove('d-none');
      } else {
        alert('Senha incorreta.');
      }
      inputSenha.focus();
      return;
    }

    if (usuario === 'dagmar') {
      papelAtual = 'admin';
    } else if (usuario === 'cadastro') {
      papelAtual = 'cadastro';
    } else {
      if (divErro) {
        divErro.textContent = 'Usuário inválido. Use "dagmar" ou "cadastro".';
        divErro.classList.remove('d-none');
      } else {
        alert('Usuário inválido. Use "dagmar" ou "cadastro".');
      }
      inputUsuario.focus();
      return;
    }

    // Login OK → mostra app
    loginWrapper.classList.add('d-none');
    appMain.classList.remove('d-none');

    aplicarPermissoesPorPapel(papelAtual);
    inicializarApp(); // aqui você chama a função que já carrega clientes, serviços etc.
  });
}

function aplicarPermissoesPorPapel(papel) {
  if (papel !== 'cadastro') {
    // admin vê tudo
    return;
  }

  const alvosAdminTargets = [
    '#secNovoCliente',
    '#secNovoServico',
    '#secNovaDespesa',
    '#secListaClientes',
    '#secListaServicos',
    '#secListaDespesas',
    '#secHistorico'
  ];

  alvosAdminTargets.forEach((target) => {
    // botões que abrem os collapses
    document
      .querySelectorAll(`[data-bs-target="${target}"]`)
      .forEach((btn) => btn.classList.add('d-none'));

    // própria seção
    const sec = document.querySelector(target);
    if (sec) sec.classList.add('d-none');
  });
}

