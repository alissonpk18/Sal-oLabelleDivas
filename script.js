/**
 * # Fluxograma resumido (front-end CRM financeiro):
 * # Entrada: usuário acessa página → JS carrega clientes, serviços, atendimentos e resumo do mês → usuário preenche formulários
 * # Validação: checar campos obrigatórios (nome, datas, valores, seleções) antes de enviar para a API
 * # Lógica: usar fetch(GET/POST) na URL do Apps Script → criar registros (cliente, serviço, atendimento) ou ler listas/resumos
 * # Saída: atualização das tabelas na tela e dos indicadores de resumo mensal, sempre refletindo o que está na planilha
 * # Versão 1.1 — 29/11/2025 / Mudança: ajuste do campo ATIVO e melhoria na mensagem de erro do POST
 */

// 1. CONFIGURAÇÃO PRINCIPAL
const URL_API = 'https://script.google.com/macros/s/AKfycbyycqZj4CsjV3RHtBtPdiiaLOYUS8EiwZUKc47RZPkdLnTN74_Zgkhq9udTo1n6j_pvdA/exec';

// Caches em memória
let cacheClientes = [];
let cacheServicos = [];
let cacheAtendimentos = [];

// Função utilitária para requisições
async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Ocorreu um erro de comunicação com o servidor. Verifique o console.');
        return { sucesso: false, erro: error.message };
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formCliente').addEventListener('submit', onSubmitCliente);
    document.getElementById('formServico').addEventListener('submit', onSubmitServico);
    document.getElementById('formAtendimento').addEventListener('submit', onSubmitAtendimento);

    document.getElementById('mesResumo').addEventListener('change', carregarResumoMensal);
    document.getElementById('atServico').addEventListener('change', sugerirPrecoDoServico);

    inicializarMesResumo();
    carregarDadosIniciais();
});

function inicializarMesResumo() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    document.getElementById('mesResumo').value = `${ano}-${mes}`;
}

async function carregarDadosIniciais() {
    await Promise.all([
        carregarClientes(),
        carregarServicos(),
        carregarAtendimentos()
    ]);
    await carregarResumoMensal();
}

// 2. FUNÇÕES GET (CARREGAR DADOS)

async function carregarClientes() {
    const url = `${URL_API}?action=listClientes`;
    const data = await fetchJSON(url);
    if (data.sucesso) {
        cacheClientes = data.clientes || [];
        preencherTabelaClientes();
        preencherSelectClientes();
    }
}

async function carregarServicos() {
    const url = `${URL_API}?action=listServicos`;
    const data = await fetchJSON(url);
    if (data.sucesso) {
        cacheServicos = data.servicos || [];
        preencherTabelaServicos();
        preencherSelectServicos();
    }
}

async function carregarAtendimentos() {
    const url = `${URL_API}?action=listAtendimentos`;
    const data = await fetchJSON(url);
    if (data.sucesso) {
        cacheAtendimentos = data.atendimentos || [];
        preencherTabelaAtendimentos();
    }
}

async function carregarResumoMensal() {
    const mes = document.getElementById('mesResumo').value; // YYYY-MM
    if (!mes) return;

    const url = `${URL_API}?action=resumoMensal&mes=${encodeURIComponent(mes)}`;
    const data = await fetchJSON(url);

    if (!data.sucesso) {
        console.warn('Erro ao carregar resumo mensal:', data.mensagem || data.erro);
        return;
    }

    const entradas = data.totalEntradas || 0;
    const saidas = data.totalSaidas || 0;
    const resultado = data.resultado || 0;

    document.getElementById('resumoEntradas').innerText = formatarMoeda(entradas);
    document.getElementById('resumoSaidas').innerText = formatarMoeda(saidas);
    document.getElementById('resumoResultado').innerText = formatarMoeda(resultado);
}

// 3. PREENCHIMENTO DE TABELAS E SELECTS

function preencherTabelaClientes() {
    const tbody = document.getElementById('tabelaClientes');
    tbody.innerHTML = '';

    cacheClientes.forEach(cliente => {
        const tr = document.createElement('tr');

        const nome = cliente.NOME || cliente.nome || '';
        const telefone = cliente.TELEFONE || cliente.telefone || '';
        const obs = cliente.OBSERVACOES || cliente.OBS || cliente.observacoes || '';
        const dataCad = formatarDataSimples(
            cliente.DATA_CADASTRO || cliente.DATA_CAD || cliente.dataCadastro
        );

        tr.innerHTML = `
            <td>${escapeHTML(nome)}</td>
            <td>${escapeHTML(telefone)}</td>
            <td>${escapeHTML(obs)}</td>
            <td>${dataCad}</td>
        `;
        tbody.appendChild(tr);
    });
}

function preencherTabelaServicos() {
    const tbody = document.getElementById('tabelaServicos');
    tbody.innerHTML = '';

    cacheServicos.forEach(servico => {
        const tr = document.createElement('tr');

        const nome = servico.NOME_SERVICO || servico.NOME || servico.nomeServico || '';
        const categoria = servico.CATEGORIA || servico.categoria || '';
        const preco = parseFloat(servico.PRECO_BASE || servico.precoBase || 0);
        const ativo = servico.ATIVO || servico.ativo;

        let ativoTexto = 'Não';
        if (
            ativo === true ||
            ativo === 'true' ||
            ativo === 'TRUE' ||
            ativo === 'Sim' ||
            ativo === 'SIM'
        ) {
            ativoTexto = 'Sim';
        }

        tr.innerHTML = `
            <td>${escapeHTML(nome)}</td>
            <td>${escapeHTML(categoria)}</td>
            <td>${formatarMoeda(preco)}</td>
            <td>${ativoTexto}</td>
        `;
        tbody.appendChild(tr);
    });
}

function preencherTabelaAtendimentos() {
    const tbody = document.getElementById('tabelaAtendimentos');
    if (!tbody) return;

    tbody.innerHTML = '';

    cacheAtendimentos.forEach(at => {
        const tr = document.createElement('tr');

        // Data
        const data = formatarDataSimples(at.DATA || at.data);

        // Campos que podem vir do backend
        const idCliente   = at.ID_CLIENTE   || at.idCliente   || '';
        const idServico   = at.ID_SERVICO   || at.idServico   || '';
        const nomeCliRaw  = at.CLIENTE      || at.cliente     || '';
        const nomeServRaw = at.SERVICO      || at.servico     || '';

        const valor = parseFloat(at.VALOR_TOTAL || at.valorTotal || 0);
        const pgto  = at.FORMA_PAGAMENTO || at.formaPagamento || '';
        const obs   = at.OBSERVACOES     || at.OBS || at.observacoes || '';

        // ============================
        // Resolver nome do cliente
        // ============================
        let nomeCliente = 'Desconhecido';

        if (idCliente) {
            const cli = cacheClientes.find(c => (c.ID_CLIENTE || c.idCliente) == idCliente);
            if (cli) {
                nomeCliente = cli.NOME || cli.nome || nomeCliRaw || 'Desconhecido';
            } else if (nomeCliRaw) {
                // Se não encontrou por ID, usa o nome que veio direto no atendimento
                nomeCliente = nomeCliRaw;
            }
        } else if (nomeCliRaw) {
            // Não veio ID, mas veio nome direto
            nomeCliente = nomeCliRaw;
        }

        // ============================
        // Resolver nome do serviço
        // ============================
        let nomeServico = 'Desconhecido';

        if (idServico) {
            const serv = cacheServicos.find(s => (s.ID_SERVICO || s.idServico) == idServico);
            if (serv) {
                nomeServico = serv.NOME_SERVICO || serv.NOME || serv.nomeServico || nomeServRaw || 'Desconhecido';
            } else if (nomeServRaw) {
                nomeServico = nomeServRaw;
            }
        } else if (nomeServRaw) {
            nomeServico = nomeServRaw;
        }

        tr.innerHTML = `
            <td>${data}</td>
            <td>${escapeHTML(nomeCliente)}</td>
            <td>${escapeHTML(nomeServico)}</td>
            <td>${formatarMoeda(valor)}</td>
            <td>${escapeHTML(pgto)}</td>
            <td>${escapeHTML(obs)}</td>
        `;
        tbody.appendChild(tr);
    });
}


function preencherSelectServicos() {
    const select = document.getElementById('atServico');
    select.innerHTML = '<option value="">Selecione um serviço...</option>';

    cacheServicos.forEach(s => {
        const id = s.ID_SERVICO || s.idServico;
        const nome = s.NOME_SERVICO || s.NOME || s.nomeServico;
        if (!id || !nome) return;

        const option = document.createElement('option');
        option.value = id;
        option.textContent = nome;
        select.appendChild(option);
    });
}

function sugerirPrecoDoServico() {
    const idServicoSelecionado = document.getElementById('atServico').value;
    if (!idServicoSelecionado) return;

    const servico = cacheServicos.find(
        s => (s.ID_SERVICO || s.idServico) == idServicoSelecionado
    );
    if (servico) {
        const preco = parseFloat(servico.PRECO_BASE || servico.precoBase || 0);
        if (preco > 0) {
            document.getElementById('atValor').value = preco.toFixed(2);
        }
    }
}

// 4. FUNÇÕES POST (ENVIAR DADOS)

async function onSubmitCliente(event) {
    event.preventDefault();

    const nome = document.getElementById('clienteNome').value.trim();
    const telefone = document.getElementById('clienteTelefone').value.trim();
    const obs = document.getElementById('clienteObs').value.trim();

    if (!nome) {
        alert('O nome do cliente é obrigatório.');
        return;
    }

    const payload = {
        tipoRegistro: 'cliente',
        nome,
        telefone,
        observacoes: obs
    };

    await enviarDados(payload, 'Cliente salvo com sucesso!', () => {
        document.getElementById('formCliente').reset();
        carregarClientes();
    });
}

async function onSubmitServico(event) {
    event.preventDefault();

    const nome = document.getElementById('servicoNome').value.trim();
    const categoria = document.getElementById('servicoCategoria').value.trim();
    const precoStr = document.getElementById('servicoPreco').value;
    const ativo = document.getElementById('servicoAtivo').checked;

    if (!nome) {
        alert('Nome do serviço é obrigatório.');
        return;
    }

    const precoBase = parseFloat(precoStr);
    if (isNaN(precoBase) || precoBase < 0) {
        alert('Preço inválido.');
        return;
    }

    const payload = {
        tipoRegistro: 'servico',
        nomeServico: nome,
        categoria,
        precoBase,
        ativo
    };

    await enviarDados(payload, 'Serviço salvo com sucesso!', () => {
        document.getElementById('formServico').reset();
        document.getElementById('servicoAtivo').checked = true;
        carregarServicos();
    });
}

async function onSubmitAtendimento(event) {
    event.preventDefault();

    const data = document.getElementById('atData').value;
    const idCliente = document.getElementById('atCliente').value;
    const idServico = document.getElementById('atServico').value;
    const valorStr = document.getElementById('atValor').value;
    const formaPagamento = document.getElementById('atFormaPgto').value;
    const obs = document.getElementById('atObs').value.trim();

    if (!data || !idCliente || !idServico || !valorStr || !formaPagamento) {
        alert('Preencha todos os campos obrigatórios.');
        return;
    }

    const valorTotal = parseFloat(valorStr);
    if (isNaN(valorTotal) || valorTotal <= 0) {
        alert('O valor deve ser maior que zero.');
        return;
    }

    const payload = {
        tipoRegistro: 'atendimento',
        data,                 // YYYY-MM-DD
        idCliente,
        idServico,
        valorTotal,
        formaPagamento,
        observacoes: obs
    };

    await enviarDados(payload, 'Atendimento registrado com sucesso!', () => {
        document.getElementById('formAtendimento').reset();
        carregarAtendimentos();
        carregarResumoMensal();
    });
}

async function enviarDados(payload, msgSucesso, callbackSucesso) {
    const options = {
        method: 'POST',
        // IMPORTANTE: usar text/plain para ser um "simple request" e não ter preflight OPTIONS
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
    };

    try {
        const data = await fetchJSON(URL_API, options);
        if (data && data.sucesso) {
            alert(msgSucesso);
            if (callbackSucesso) callbackSucesso();
        } else {
            alert(
                'Erro ao salvar: ' +
                (data.mensagem || data.erro || 'Resposta desconhecida da API')
            );
        }
    } catch (e) {
        console.error(e);
        alert('Erro na comunicação. Verifique se a API permite acesso.');
    }
}


// 5. UTILITÁRIOS

function formatarMoeda(valor) {
    const numero = Number(valor);
    if (isNaN(numero)) return 'R$ 0,00';
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataSimples(valor) {
    if (!valor) return '';
    const data = new Date(valor);
    if (isNaN(data.getTime())) return valor;
    return data.toLocaleDateString('pt-BR');
}

function escapeHTML(texto) {
    if (typeof texto !== 'string') return texto;
    return texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


