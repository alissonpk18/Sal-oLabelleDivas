/**
 * # Fluxograma resumido (front-end CRM financeiro):
 * # Entrada: usuário acessa página → JS carrega clientes, serviços, atendimentos e resumo do mês → usuário preenche formulários
 * # Validação: checar campos obrigatórios (nome, datas, valores, seleções) antes de enviar para a API
 * # Lógica: usar fetch (GET/POST) na URL do Apps Script → criar registros (cliente, serviço, atendimento) ou ler listas/resumos
 * # Saída: atualização das tabelas na tela e dos indicadores de resumo mensal, sempre refletindo o que está na planilha
  * # Versão 1.4 — 29/11/2025 / Mudança: resumo mensal calculado no front-end com base nos atendimentos (somente entradas)

 */

// 1. CONFIGURAÇÃO PRINCIPAL
const URL_API = 'https://script.google.com/macros/s/AKfycbyycqZj4CsjV3RHtBtPdiiaLOYUS8EiwZUKc47RZPkdLnTN74_Zgkhq9udTo1n6j_pvdA/exec';

// Caches em memória
let cacheClientes = [];
let cacheServicos = [];
let cacheAtendimentos = [];

// =========================
// 1.1. HELPERS DE CAMPOS
// =========================

function getCampo(obj, prioridades = [], filtros = []) {
    if (!obj || typeof obj !== 'object') return '';

    // 1) tenta pelas chaves de prioridade (nomes específicos)
    for (const k of prioridades) {
        if (k in obj && obj[k]) return obj[k];
    }

    // 2) tenta por filtros de substring no nome da chave
    if (filtros.length > 0) {
        for (const k of Object.keys(obj)) {
            const lk = k.toLowerCase();
            if (filtros.some(f => lk.includes(f))) {
                if (obj[k]) return obj[k];
            }
        }
    }

    return '';
}

// Cliente
function extrairNomeCliente(c) {
    return getCampo(
        c,
        [
            'NOME', 'Nome', 'nome',
            'CLIENTE', 'Cliente',
            'NOME COMPLETO', 'Nome Completo', 'NOME COMPLETO *',
            'nome_completo'
        ],
        ['nome', 'client']
    );
}

function extrairTelefoneCliente(c) {
    return getCampo(
        c,
        ['TELEFONE', 'Telefone', 'telefone', 'CELULAR', 'Celular', 'celular'],
        ['tel', 'fone', 'cel']
    );
}

function extrairObsCliente(c) {
    return getCampo(
        c,
        ['OBS', 'Obs', 'OBSERVACOES', 'Observações', 'OBSERVAÇÕES', 'observacoes'],
        ['obs', 'observ']
    );
}

function extrairDataCliente(c) {
    return getCampo(
        c,
        ['DATA_CADASTRO', 'DATA_CAD', 'dataCadastro', 'DataCadastro'],
        ['data', 'cadast']
    );
}

function extrairIdCliente(c) {
    const v = getCampo(
        c,
        ['ID_CLIENTE', 'idCliente', 'ID', 'id', 'CODIGO', 'Código', 'codigo'],
        ['id', 'cod']
    );
    return v || null;
}

// Serviço
function extrairNomeServico(s) {
    return getCampo(
        s,
        ['NOME_SERVICO', 'Nome_servico', 'NOME', 'Nome', 'nome', 'SERVICO', 'Serviço', 'servico'],
        ['servi', 'nome']
    );
}

function extrairCategoriaServico(s) {
    return getCampo(
        s,
        ['CATEGORIA', 'Categoria', 'categoria', 'TIPO', 'Tipo'],
        ['categ']
    );
}

function extrairPrecoServico(s) {
    const raw = getCampo(
        s,
        ['PRECO_BASE', 'Preco_base', 'precoBase', 'PREÇO', 'Preço'],
        ['preco', 'preço']
    );
    return parseFloat(raw || 0);
}

function extrairAtivoServico(s) {
    const val = getCampo(
        s,
        ['ATIVO', 'Ativo', 'ativo', 'STATUS', 'Status'],
        ['ativo', 'status']
    );
    if (
        val === true ||
        val === 'true' || val === 'TRUE' ||
        val === 'Sim'  || val === 'SIM'  ||
        val === 'Ativo'|| val === 'ATIVO'
    ) return 'Sim';
    return 'Não';
}

// Atendimento (aproveita helpers de cliente/serviço quando possível)
function extrairIdAtendimentoCliente(at) {
    return getCampo(
        at,
        ['ID_CLIENTE', 'idCliente', 'IDCLIENTE'],
        ['id_client']
    );
}

function extrairNomeAtendimentoCliente(at) {
    return getCampo(
        at,
        ['CLIENTE', 'Cliente', 'NOME_CLIENTE', 'NomeCliente', 'nomeCliente'],
        ['client', 'nome']
    );
}

function extrairIdAtendimentoServico(at) {
    return getCampo(
        at,
        ['ID_SERVICO', 'idServico', 'IDSERVICO'],
        ['id_serv']
    );
}

function extrairNomeAtendimentoServico(at) {
    return getCampo(
        at,
        ['SERVICO', 'Serviço', 'Servico', 'NOME_SERVICO', 'nomeServico'],
        ['servi', 'nome']
    );
}

// =========================
// 2. FETCH BASE
// =========================

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
    }
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Resposta não é JSON válido:', text);
        throw new Error('Resposta da API não está em JSON válido.');
    }
}

// =========================
// 3. INICIALIZAÇÃO
// =========================

document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('formCliente');
    const formServico = document.getElementById('formServico');
    const formAtendimento = document.getElementById('formAtendimento');
    const mesResumo = document.getElementById('mesResumo');
    const atServico = document.getElementById('atServico');

    if (formCliente) formCliente.addEventListener('submit', onSubmitCliente);
    if (formServico) formServico.addEventListener('submit', onSubmitServico);
    if (formAtendimento) formAtendimento.addEventListener('submit', onSubmitAtendimento);
    if (mesResumo) mesResumo.addEventListener('change', carregarResumoMensal);
    if (atServico) atServico.addEventListener('change', sugerirPrecoDoServico);

    inicializarMesResumo();
    carregarDadosIniciais();
});

function inicializarMesResumo() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const campo = document.getElementById('mesResumo');
    if (campo) campo.value = `${ano}-${mes}`;
}

async function carregarDadosIniciais() {
    try {
        await Promise.all([
            carregarClientes(),
            carregarServicos(),
            carregarAtendimentos()
        ]);
        await carregarResumoMensal();
    } catch (e) {
        console.error('Erro ao carregar dados iniciais:', e);
        alert('Erro ao carregar dados iniciais. Verifique o console.');
    }
}

// =========================
// 4. FUNÇÕES GET (API)
// =========================

async function carregarClientes() {
    const url = `${URL_API}?action=listClientes`;
    try {
        const data = await fetchJSON(url);
        if (!data.sucesso) {
            console.warn('Erro ao listar clientes:', data.mensagem || data.erro);
            return;
        }
        cacheClientes = data.clientes || [];
        preencherTabelaClientes();
        preencherSelectClientes();
    } catch (e) {
        console.error('Erro ao carregar clientes:', e);
        alert('Erro ao carregar lista de clientes.');
    }
}

async function carregarServicos() {
    const url = `${URL_API}?action=listServicos`;
    try {
        const data = await fetchJSON(url);
        if (!data.sucesso) {
            console.warn('Erro ao listar serviços:', data.mensagem || data.erro);
            return;
        }
        cacheServicos = data.servicos || [];
        preencherTabelaServicos();
        preencherSelectServicos();
    } catch (e) {
        console.error('Erro ao carregar serviços:', e);
        alert('Erro ao carregar lista de serviços.');
    }
}

async function carregarAtendimentos() {
    const url = `${URL_API}?action=listAtendimentos`;
    try {
        const data = await fetchJSON(url);
        if (!data.sucesso) {
            console.warn('Erro ao listar atendimentos:', data.mensagem || data.erro);
            return;
        }
        cacheAtendimentos = data.atendimentos || [];
        preencherTabelaAtendimentos();
    } catch (e) {
        console.error('Erro ao carregar atendimentos:', e);
        alert('Erro ao carregar histórico de atendimentos.');
    }
}

function carregarResumoMensal() {
    const campoMes = document.getElementById('mesResumo');
    if (!campoMes || !campoMes.value) return;

    // mesSelecionado = "YYYY-MM"
    const [anoStr, mesStr] = campoMes.value.split('-');
    const anoSel = parseInt(anoStr, 10);
    const mesSel = parseInt(mesStr, 10); // 1–12

    let totalEntradas = 0;

    // Usa somente os atendimentos já carregados em cacheAtendimentos
    cacheAtendimentos.forEach(at => {
        const rawData =
            at.DATA ||
            at.data;

        if (!rawData) return;

        const d = new Date(rawData);
        if (isNaN(d.getTime())) return;

        const ano = d.getFullYear();
        const mes = d.getMonth() + 1; // 0-based → 1–12

        if (ano === anoSel && mes === mesSel) {
            const v = parseFloat(
                at.VALOR_TOTAL ||
                at.valorTotal ||
                at.VALOR ||
                at.valor ||
                0
            );
            if (!isNaN(v)) {
                totalEntradas += v;
            }
        }
    });

    // Ainda não há módulo de despesas → saídas = 0
    const totalSaidas = 0;
    const resultado = totalEntradas - totalSaidas;

    const elEntradas = document.getElementById('resumoEntradas');
    const elSaidas = document.getElementById('resumoSaidas');
    const elResultado = document.getElementById('resumoResultado');

    if (elEntradas) elEntradas.innerText = formatarMoeda(totalEntradas);
    if (elSaidas) elSaidas.innerText = formatarMoeda(totalSaidas);
    if (elResultado) elResultado.innerText = formatarMoeda(resultado);
}



// =========================
// 5. TABELAS E SELECTS
// =========================

function preencherTabelaClientes() {
    const tbody = document.getElementById('tabelaClientes');
    if (!tbody) return;

    tbody.innerHTML = '';

    cacheClientes.forEach(c => {
        const nome = extrairNomeCliente(c);
        const telefone = extrairTelefoneCliente(c);
        const obs = extrairObsCliente(c);
        const dataCadRaw = extrairDataCliente(c);
        const dataCad = formatarDataSimples(dataCadRaw);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHTML(nome)}</td>
            <td>${escapeHTML(telefone)}</td>
            <td>${escapeHTML(obs || dataCad)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function preencherTabelaServicos() {
    const tbody = document.getElementById('tabelaServicos');
    if (!tbody) return;

    tbody.innerHTML = '';

    cacheServicos.forEach(s => {
        const nome = extrairNomeServico(s);
        const categoria = extrairCategoriaServico(s);
        const preco = extrairPrecoServico(s);
        const ativoTexto = extrairAtivoServico(s);

        const tr = document.createElement('tr');
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

        // ID / nome que vêm da API
        const idClienteBruto  = at.ID_CLIENTE || at.idCliente || at.CLIENTE || at.cliente || '';
        const idServicoBruto  = at.ID_SERVICO || at.idServico || at.SERVICO || at.servico || '';

        const valor = parseFloat(at.VALOR_TOTAL || at.valorTotal || 0);
        const pgto  = at.FORMA_PAGAMENTO || at.formaPagamento || '';
        const obs   = at.OBSERVACOES || at.OBS || at.observacoes || '';

        // ==============================
        // Resolver NOME do cliente
        // ==============================
        let nomeCliente = 'Desconhecido';

        if (idClienteBruto) {
            // 1) tenta achar na lista de clientes pelo ID
            const cli = cacheClientes.find(c =>
                (c.ID_CLIENTE || c.idCliente) == idClienteBruto
            );

            if (cli) {
                nomeCliente = cli.NOME || cli.nome || 'Desconhecido';
            } else {
                // 2) se não achou e o valor NÃO parece um ID (não começa com C_), usa o próprio valor como nome
                if (!String(idClienteBruto).startsWith('C_')) {
                    nomeCliente = idClienteBruto;
                }
            }
        }

        // ==============================
        // Resolver NOME do serviço
        // ==============================
        let nomeServico = 'Desconhecido';

        if (idServicoBruto) {
            const serv = cacheServicos.find(s =>
                (s.ID_SERVICO || s.idServico) == idServicoBruto
            );

            if (serv) {
                nomeServico =
                    serv.NOME_SERVICO ||
                    serv.NOME ||
                    serv.nomeServico ||
                    serv.nome ||
                    'Desconhecido';
            } else {
                // Se backend já mandar o nome no campo SERVICO, usa ele
                nomeServico = at.SERVICO || at.servico || nomeServico;
            }
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

function preencherSelectClientes() {
    const select = document.getElementById('atCliente');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um cliente...</option>';

    cacheClientes.forEach(c => {
        const nome = extrairNomeCliente(c);
        if (!nome) return;

        const id = extrairIdCliente(c) || nome; // fallback: nome vira identificador

        const option = document.createElement('option');
        option.value = id;
        option.textContent = nome;
        select.appendChild(option);
    });
}

function preencherSelectServicos() {
    const select = document.getElementById('atServico');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um serviço...</option>';

    cacheServicos.forEach(s => {
        const nome = extrairNomeServico(s);
        if (!nome) return;

        const id =
            getCampo(s, ['ID_SERVICO', 'idServico', 'ID', 'id'], ['id_serv']) ||
            nome;

        const option = document.createElement('option');
        option.value = id;
        option.textContent = nome;
        select.appendChild(option);
    });
}

function sugerirPrecoDoServico() {
    const select = document.getElementById('atServico');
    const campoValor = document.getElementById('atValor');
    if (!select || !campoValor) return;

    const idSelecionado = select.value;
    if (!idSelecionado) return;

    const servico = cacheServicos.find(s => {
        const id = getCampo(s, ['ID_SERVICO', 'idServico', 'ID', 'id'], ['id_serv']);
        const nome = extrairNomeServico(s);
        return id == idSelecionado || nome == idSelecionado;
    });

    if (servico) {
        const preco = extrairPrecoServico(servico);
        if (!isNaN(preco) && preco > 0) {
            campoValor.value = preco.toFixed(2);
        }
    }
}

// =========================
// 6. POST (CADASTROS)
// =========================

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

    const campoData = document.getElementById('atData');
    const selectCliente = document.getElementById('atCliente');
    const selectServico = document.getElementById('atServico');
    const campoValor = document.getElementById('atValor');
    const campoPgto = document.getElementById('atFormaPgto');
    const campoObs = document.getElementById('atObs');

    const data = campoData.value;
    const idCliente = selectCliente.value;
    const idServico = selectServico.value;
    const valorStr = campoValor.value;
    const formaPagamento = campoPgto.value;
    const obs = campoObs.value.trim();

    if (!data || !idCliente || !idServico || !valorStr || !formaPagamento) {
        alert('Preencha todos os campos obrigatórios do atendimento.');
        return;
    }

    const valorTotal = parseFloat(valorStr);
    if (isNaN(valorTotal) || valorTotal <= 0) {
        alert('O valor deve ser maior que zero.');
        return;
    }

    const nomeCliente = selectCliente.options[selectCliente.selectedIndex]?.text || '';
    const nomeServico = selectServico.options[selectServico.selectedIndex]?.text || '';

    const payload = {
        tipoRegistro: 'atendimento',
        data,                 // YYYY-MM-DD
        idCliente,
        nomeCliente,
        idServico,
        nomeServico,
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

// Envio genérico
async function enviarDados(payload, msgSucesso, callbackSucesso) {
    const options = {
        method: 'POST',
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
                (data?.mensagem || data?.erro || 'Resposta desconhecida da API')
            );
        }
    } catch (e) {
        console.error('Erro no envio de dados:', e);
        alert('Erro na comunicação com o servidor. Veja o console para detalhes.');
    }
}

// =========================
// 7. UTILITÁRIOS
// =========================

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


