/**
 * Fluxograma resumido (script.js CRM):
 * Entrada → usuário faz login (dagmar/cadastro) → ações na tela (cadastros, atendimentos, despesas, filtros)
 * Validação → login simples (usuário/senha) + validação básica de formulários
 * Lógica → chamadas à API (GET/POST) para CLIENTES, SERVICOS, ATENDIMENTOS, DESPESAS e RESUMO MENSAL
 * Saída → atualização dos selects, tabelas e cards de resumo financeiro
 * Versão 1.6 — 29/11/2025 / Mudança: correção API_URL, tratamento de datas ISO, logs de debug e ajustes de login
 */

// =============================
// CONFIGURAÇÃO BÁSICA DA API
// =============================

// URL do WebApp publicado do Apps Script (App da Web)
const API_URL = 'https://script.google.com/macros/s/AKfycbyycqZj4CsjV3RHtBtPdiiaLOYUS8EiwZUKc47RZPkdLnTN74_Zgkhq9udTo1n6j_pvdA/exec';

// =============================
// CONTROLE DE LOGIN SIMPLES
// =============================

// usuários permitidos
const LOGIN_USERS = {
  dagmar:   { role: 'admin' },
  cadastro: { role: 'cadastro' }
};

// senha fixa
const LOGIN_SENHA = '1234';

// papel do usuário logado
let currentRole = null;

// =============================
// LOGIN E CONTROLE DE INTERFACE
// =============================

function aplicarRoleNaInterface() {
  // admin: vê tudo
  // cadastro: vê apenas o formulário de atendimento
  const isCadastro = currentRole === 'cadastro';

  const elementosRestritos = [
    document.querySelector('section.mb-3'), // botões Novo Cliente / Novo Serviço / Despesa
    document.getElementById('secNovoCliente'),
    document.getElementById('secNovoServico'),
    document.getElementById('secNovaDespesa'),
    document.getElementById('secListaClientes'),
    document.getElementById('secListaServicos'),
    document.getElementById('secListaDespesas'),
    document.getElementById('secHistorico')
  ];

  elementosRestritos.forEach(el => {
    if (!el) return;
    if (isCadastro) {
      el.classList.add('d-none');
    } else {
      el.classList.remove('d-none');
    }
  });
}

async function posLoginCarregarApp() {
  try {
    console.log('[LOGIN] Pós-login: carregando dados e eventos...');
    await carregarDadosIniciais();
    inicializarEventosFormularios();
    inicializarResumoFinanceiro();
    console.log('[LOGIN] Pós-login concluído.');
  } catch (err) {
    console.error('[ERRO] ao carregar dados iniciais após login:', err);
    alert('Erro ao carregar dados iniciais. Verifique o console.');
  }
}

function configurarLogin() {
  const loginForm    = document.getElementById('loginForm');
  const loginUser    = document.getElementById('loginUsuario');
  const loginSenha   = document.getElementById('loginSenha');
  const loginErro    = document.getElementById('loginErro');
  const loginWrapper = document.getElementById('loginWrapper');
  const appMain      = document.getElementById('appMain');

  if (!loginForm || !loginUser || !loginSenha || !loginWrapper || !appMain) {
    console.error('[ERRO] Elementos de login não encontrados no HTML.');
    return;
  }

  console.log('[INFO] Login configurado.');

  loginForm.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const usuarioDigitado = (loginUser.value || '').trim().toLowerCase();
    const senhaDigitada   = (loginSenha.value || '').trim();

    console.log('[LOGIN] Tentativa:', usuarioDigitado);

    const userCfg = LOGIN_USERS[usuarioDigitado];

    if (!userCfg || senhaDigitada !== LOGIN_SENHA) {
      console.warn('[LOGIN] Credenciais inválidas.');
      loginErro.classList.remove('d-none');
      return;
    }

    // credenciais ok
    loginErro.classList.add('d-none');
    currentRole = userCfg.role;
    console.log('[LOGIN] Sucesso. Role:', currentRole);

    // esconde login, mostra app
    loginWrapper.classList.add('d-none');
    appMain.classList.remove('d-none');

    aplicarRoleNaInterface();
    posLoginCarregarApp(); // chama async, mas não precisa do await aqui
  });
}

// =============================
// INICIALIZAÇÃO GERAL
// =============================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[INFO] DOM carregado, configurando login...');
  configurarLogin();
});


// =============================
// FUNÇÕES AUXILIARES
// =============================

function formatarMoeda(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Aceita Date ou string ISO (ex.: "2025-11-29T15:16:17.000Z")
 */
function formatarData(valor) {
  if (!valor) return '';

  let d;
  if (valor instanceof Date) {
    d = valor;
  } else {
    d = new Date(valor);
  }

  if (isNaN(d.getTime())) {
    return valor; // devolve como veio, se não conseguir converter
  }

  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v);
    }
  });

  console.log('[apiGet] URL:', url.toString());

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} - ${resp.statusText}`);
  }

  const data = await resp.json();
  console.log('[apiGet] resposta:', data);

  if (!data.sucesso) {
    throw new Error(data.mensagem || 'Erro retornado pela API.');
  }
  return data;
}

async function apiPost(tipoRegistro, payload) {
  console.log('[apiPost] tipoRegistro:', tipoRegistro, 'payload:', payload);

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipoRegistro,
      ...payload
    })
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} - ${resp.statusText}`);
  }

  const data = await resp.json();
  console.log('[apiPost] resposta:', data);

  if (!data.sucesso) {
    throw new Error(data.mensagem || 'Erro retornado pela API.');
  }
  return data;
}

// =============================
// CACHE EM MEMÓRIA
// =============================

let cacheClientes     = [];
let cacheServicos     = [];
let cacheAtendimentos = [];
let cacheDespesas     = [];

// =============================
// LOGIN E CONTROLE DE INTERFACE
// =============================

function aplicarRoleNaInterface() {
  // admin: vê tudo
  // cadastro: vê apenas o formulário de atendimento
  const isCadastro = currentRole === 'cadastro';

  const elementosRestritos = [
    document.querySelector('section.mb-3'), // botões Novo Cliente / Novo Serviço / Despesa
    document.getElementById('secNovoCliente'),
    document.getElementById('secNovoServico'),
    document.getElementById('secNovaDespesa'),
    document.getElementById('secListaClientes'),
    document.getElementById('secListaServicos'),
    document.getElementById('secListaDespesas'),
    document.getElementById('secHistorico')
  ];

  elementosRestritos.forEach(el => {
    if (!el) return;
    if (isCadastro) {
      el.classList.add('d-none');
    } else {
      el.classList.remove('d-none');
    }
  });
}

function configurarLogin() {
  const loginForm    = document.getElementById('loginForm');
  const loginUser    = document.getElementById('loginUsuario');
  const loginSenha   = document.getElementById('loginSenha');
  const loginErro    = document.getElementById('loginErro');
  const loginWrapper = document.getElementById('loginWrapper');
  const appMain      = document.getElementById('appMain');

  if (!loginForm || !loginUser || !loginSenha || !loginWrapper || !appMain) {
    console.error('[ERRO] Elementos de login não encontrados no HTML.');
    return;
  }

  console.log('[INFO] Login configurado.');

  loginForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const usuario = (loginUser.value || '').trim().toLowerCase();
    const senha   = (loginSenha.value || '').trim();

    console.log('[LOGIN] Tentativa de login:', usuario);

    const userCfg = LOGIN_USERS[usuario];

    if (!userCfg || senha !== LOGIN_SENHA) {
      console.warn('[LOGIN] Falha de credenciais.');
      loginErro.classList.remove('d-none');
      return;
    }

    loginErro.classList.add('d-none');
    currentRole = userCfg.role;

    // Esconde tela de login, mostra app
    loginWrapper.classList.add('d-none');
    appMain.classList.remove('d-none');

    aplicarRoleNaInterface();

    // Carrega dados iniciais e configura eventos
    try {
      await carregarDadosIniciais();
      inicializarEventosFormularios();
      inicializarResumoFinanceiro();
    } catch (err) {
      console.error('[ERRO] ao carregar dados iniciais após login:', err);
      alert('Erro ao carregar dados iniciais. Verifique o console.');
    }
  });
}

// =============================
// CARREGAMENTO INICIAL
// =============================

async function carregarDadosIniciais() {
  console.log('[INFO] Carregando dados iniciais...');

  try {
    // Dispara todas as chamadas em paralelo, mas não quebra se uma falhar
    const resultados = await Promise.allSettled([
      apiGet('listClientes'),
      apiGet('listServicos'),
      apiGet('listAtendimentos'),
      apiGet('listDespesas')
    ]);

    const [rClientes, rServicos, rAtend, rDespesas] = resultados;

    // Helper para extrair array ou logar erro/aviso
    function extrairDados(result, chavePayload, nomeRecurso) {
      if (result.status === 'fulfilled') {
        const payload = result.value || {};
        const dados = payload[chavePayload];

        if (Array.isArray(dados)) {
          return dados;
        } else {
          console.warn(
            `[WARN] ${nomeRecurso}: payload sem array '${chavePayload}'.`,
            payload
          );
          return [];
        }
      } else {
        console.error(
          `[ERRO] Falha ao carregar ${nomeRecurso}:`,
          result.reason
        );
        return [];
      }
    }

    // Atualiza caches com o que deu certo (ou [] se falhou)
    cacheClientes     = extrairDados(rClientes,  'clientes',     'clientes');
    cacheServicos     = extrairDados(rServicos,  'servicos',     'serviços');
    cacheAtendimentos = extrairDados(rAtend,     'atendimentos', 'atendimentos');
    cacheDespesas     = extrairDados(rDespesas,  'despesas',     'despesas');

    // Atualiza selects e tabelas
    preencherSelectClientes();
    preencherSelectServicos();

    renderTabelaClientes();
    renderTabelaServicos();
    renderTabelaAtendimentos();
    renderTabelaDespesas();

    console.log('[INFO] Dados iniciais carregados (veja avisos acima, se houver).');
  } catch (err) {
    // Só entra aqui se houver um erro inesperado (ex.: bug em renderTabelaX)
    console.error('[ERRO] carregarDadosIniciais (erro inesperado):', err);
    throw err; // mantém o alerta do fluxo de login
  }
}

// =============================
// PREENCHIMENTO DE SELECTS
// =============================

function preencherSelectClientes() {
  const sel = document.getElementById('atCliente');
  if (!sel) return;

  sel.innerHTML = '<option value="">Selecione um cliente...</option>';

  cacheClientes.forEach(cli => {
    const opt = document.createElement('option');
    opt.value = cli.ID_CLIENTE || cli.ID || '';
    opt.textContent = cli.NOME || '';
    sel.appendChild(opt);
  });
}

function preencherSelectServicos() {
  const sel = document.getElementById('atServico');
  if (!sel) return;

  sel.innerHTML = '<option value="">Selecione um serviço...</option>';

  cacheServicos.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.ID_SERVICO || s.ID || '';
    const nome  = s.NOME_SERVICO || s.NOME || '';
    const preco = s.PRECO_BASE != null ? ` - ${formatarMoeda(s.PRECO_BASE)}` : '';
    opt.textContent = nome + preco;
    sel.appendChild(opt);
  });
}

// =============================
// RENDERIZAÇÃO DE TABELAS
// =============================

function renderTabelaClientes() {
  const tbody = document.getElementById('tabelaClientes');
  if (!tbody) return;
  tbody.innerHTML = '';

  cacheClientes.forEach(cli => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cli.NOME || ''}</td>
      <td>${cli.TELEFONE || ''}</td>
      <td>${cli.OBSERVACOES || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTabelaServicos() {
  const tbody = document.getElementById('tabelaServicos');
  if (!tbody) return;
  tbody.innerHTML = '';

  cacheServicos.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.NOME_SERVICO || s.NOME || ''}</td>
      <td>${s.CATEGORIA || ''}</td>
      <td>${formatarMoeda(s.PRECO_BASE)}</td>
      <td>${s.ATIVO}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTabelaAtendimentos() {
  const tbody = document.getElementById('tabelaAtendimentos');
  if (!tbody) return;
  tbody.innerHTML = '';

  cacheAtendimentos.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarData(a.DATA)}</td>
      <td>${a.ID_CLIENTE || ''}</td>
      <td>${a.ID_SERVICO || ''}</td>
      <td>${formatarMoeda(a.VALOR_TOTAL)}</td>
      <td>${a.FORMA_PAGAMENTO || ''}</td>
      <td>${a.OBSERVACOES || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTabelaDespesas() {
  const tbody = document.getElementById('tabelaDespesas');
  if (!tbody) return;
  tbody.innerHTML = '';

  cacheDespesas.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarData(d.DATA)}</td>
      <td>${d.CATEGORIA || ''}</td>
      <td>${d.DESCRICAO || ''}</td>
      <td>${formatarMoeda(d.VALOR)}</td>
      <td>${d.FORMA_PAGAMENTO || ''}</td>
      <td>${d.OBSERVACOES || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================
// EVENTOS DOS FORMULÁRIOS
// =============================

function inicializarEventosFormularios() {
  const formCli   = document.getElementById('formCliente');
  const formServ  = document.getElementById('formServico');
  const formAtend = document.getElementById('formAtendimento');
  const formDesp  = document.getElementById('formDespesa');

  // Cliente
  if (formCli) {
    formCli.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        const nome      = document.getElementById('clienteNome').value.trim();
        const telefone  = document.getElementById('clienteTelefone').value.trim();
        const observ    = document.getElementById('clienteObs').value.trim();

        await apiPost('cliente', {
          nome,
          telefone,
          observacoes: observ
        });

        formCli.reset();
        await carregarDadosIniciais();
        alert('Cliente salvo com sucesso.');
      } catch (err) {
        console.error('[ERRO salvar cliente]', err);
        alert('Erro ao salvar cliente. Verifique o console.');
      }
    });
  }

  // Serviço
  if (formServ) {
    formServ.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        const nome      = document.getElementById('servicoNome').value.trim();
        const categoria = document.getElementById('servicoCategoria').value.trim();
        const precoBase = Number(document.getElementById('servicoPreco').value || 0);

        await apiPost('servico', {
          nomeServico: nome,
          categoria,
          precoBase,
          ativo: true
        });

        formServ.reset();
        await carregarDadosIniciais();
        alert('Serviço salvo com sucesso.');
      } catch (err) {
        console.error('[ERRO salvar serviço]', err);
        alert('Erro ao salvar serviço. Verifique o console.');
      }
    });
  }

  // Atendimento
  if (formAtend) {
    formAtend.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        const data        = document.getElementById('atData').value;
        const idCliente   = document.getElementById('atCliente').value;
        const idServico   = document.getElementById('atServico').value;
        const valorTotal  = Number(document.getElementById('atValor').value || 0);
        const formaPgto   = document.getElementById('atFormaPgto').value;
        const observacoes = document.getElementById('atObs').value.trim();

        await apiPost('atendimento', {
          data,
          idCliente,
          idServico,
          valorTotal,
          formaPagamento: formaPgto,
          observacoes
        });

        formAtend.reset();
        await carregarDadosIniciais();
        await atualizarResumoFinanceiro();
        alert('Atendimento registrado com sucesso.');
      } catch (err) {
        console.error('[ERRO salvar atendimento]', err);
        alert('Erro ao salvar atendimento. Verifique o console.');
      }
    });
  }

  // Despesa
  if (formDesp) {
    formDesp.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        const data        = document.getElementById('despData').value;
        const categoria   = document.getElementById('despCategoria').value.trim();
        const descricao   = document.getElementById('despDescricao').value.trim();
        const valor       = Number(document.getElementById('despValor').value || 0);
        const formaPgto   = document.getElementById('despFormaPgto').value;
        const observacoes = document.getElementById('despObs').value.trim();

        await apiPost('despesa', {
          data,
          categoria,
          descricao,
          valor,
          formaPagamento: formaPgto,
          observacoes
        });

        formDesp.reset();
        await carregarDadosIniciais();
        await atualizarResumoFinanceiro();
        alert('Despesa registrada com sucesso.');
      } catch (err) {
        console.error('[ERRO salvar despesa]', err);
        alert('Erro ao salvar despesa. Verifique o console.');
      }
    });
  }
}

// =============================
// RESUMO FINANCEIRO MENSAL
// =============================

function inicializarResumoFinanceiro() {
  const campoMes = document.getElementById('mesResumo');
  if (!campoMes) return;

  // Define mês atual como padrão
  const hoje = new Date();
  const ano  = hoje.getFullYear();
  const mes  = String(hoje.getMonth() + 1).padStart(2, '0');
  campoMes.value = `${ano}-${mes}`;

  campoMes.addEventListener('change', () => {
    atualizarResumoFinanceiro().catch(err => {
      console.error('[ERRO resumo financeiro - change]', err);
    });
  });

  atualizarResumoFinanceiro().catch(err => {
    console.error('[ERRO resumo financeiro - init]', err);
  });
}

async function atualizarResumoFinanceiro() {
  const campoMes = document.getElementById('mesResumo');
  if (!campoMes || !campoMes.value) return;

  try {
    const dados = await apiGet('resumoMensal', { mes: campoMes.value });

    const elEntradas  = document.getElementById('resumoEntradas');
    const elSaidas    = document.getElementById('resumoSaidas');
    const elResultado = document.getElementById('resumoResultado');

    if (elEntradas)  elEntradas.textContent  = formatarMoeda(dados.totalEntradas || 0);
    if (elSaidas)    elSaidas.textContent    = formatarMoeda(dados.totalSaidas   || 0);
    if (elResultado) elResultado.textContent = formatarMoeda(dados.resultado     || 0);
  } catch (err) {
    console.error('[ERRO resumoMensal]', err);
    alert('Erro ao atualizar resumo financeiro. Verifique o console.');
  }
}

// =============================
// INICIALIZAÇÃO GERAL
// =============================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[INFO] DOM carregado, iniciando configuração de login...');
  configurarLogin();
});


