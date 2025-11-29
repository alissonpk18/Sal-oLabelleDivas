/**
 * # Fluxograma resumido (front-end CRM financeiro):
 * # Entrada: usuário acessa página → JS carrega clientes, serviços, atendimentos e resumo do mês → usuário preenche formulários
 * # Validação: checar campos obrigatórios (nome, datas, valores, seleções) antes de enviar para a API
 * # Lógica: usar fetch (GET/POST) na URL do Apps Script → criar registros (cliente, serviço, atendimento) ou ler listas/resumos
 * # Saída: atualização das tabelas na tela e dos indicadores de resumo mensal, sempre refletindo o que está na planilha
 * # Versão 1.2 — 29/11/2025 / Mudança: correções em select de clientes/serviços, tabelas e integração com Apps Script
 */

// 1. CONFIGURAÇÃO PRINCIPAL
const URL_API = 'https://script.google.com/macros/s/AKfycbyycqZj4CsjV3RHtBtPdiiaLOYUS8EiwZUKc47RZPkdLnTN74_Zgkhq9udTo1n6j_pvdA/exec';

// Caches em memória
let cacheClientes = [];
let cacheServicos = [];
let cacheAtendimentos = [];

// Função utilitária para requisições (lança erro em caso de falha)
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

// Inicialização
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
    if (campo) {
        campo.value = `${ano}-${mes}`;
    }
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

// 2. FUNÇÕES GET (CARREGAR DADOS)

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

async function carregarResumoMensal() {
    const campoMes = document.getElementById('mesResumo');
    if (!campoMes || !campoMes.value) return;

    const mes = campoMes.value; // YYYY-MM
    const url = `${URL_API}?action=resumoMensal&mes=${encodeURIComponent(mes)}`;

    try {
        const data = await fetchJSON(url);
        if (!data.sucesso) {
            console.warn('Erro ao carregar resumo mensal:', data.mensagem || data.erro);
            return;
        }

        const entradas = data.totalEntradas || 0;
        const saidas = data.totalSaidas || 0;
        const resultado = data.resultado || 0;

        const elEntradas = document.getElementById('resumoEntradas');
        const elSaidas = document.getElementById('resumoSaidas');
        const elResultado = document.getElementById('resumoResultado');

        if (elEntradas) elEntradas.innerText = formatarMoeda(entradas);
        if (elSaidas) elSaidas.innerText = formatarMoeda(saidas);
        if (elResultado) elResultado.innerText = formatarMoeda(resultado);
    } catch (e) {
        console.error('Erro ao carregar resumo mensal:', e);
        alert('Erro ao carregar resumo financeiro do mês.');
    }
}

// 3. PREENCHIMENTO DE TABELAS E SELECTS

function preencherTabelaClientes() {
    const tbody = document.getElementById('tabelaClientes');
    if (!tbody) return;

    tbody.innerHTML = '';

    cacheClientes.forEach(c => {
        const nome =
            c.NOME ||
            c.nome ||
            c.Nome ||
            c.CLIENTE ||
            c.Cliente ||
            '';
        const telefone =
            c.TELEFONE ||
            c.telefone ||
            c.Telefone ||
            '';
        const obs =
            c.OBSERVACOES ||
            c.OBS ||
            c.observacoes ||
            c.Obs ||
            '';
        const dataCadRaw =
            c.DATA_CADASTRO ||
            c.DATA_CAD ||
            c.dataCadastro ||
            c.DataCadastro ||
            '';
        const dataCad = formatarDataSimples(dataCadRaw);

        const tr = document.createElement('tr');
        const obsFinal = obs || dataCad;

        tr.innerHTML = `
            <td>${escapeHTML(nome)}</td>
            <td>${escapeHTML(telefone)}</td>
            <td>${escapeHTML(obsFinal)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function preencherTabelaServicos() {
    const tbody = document.getElementById('tabelaServicos');
    if (!tbody) return;

    tbody.innerHTML = '';

    cacheServicos.forEach(servico => {
        const nome =
            servico.NOME_SERVICO ||
            servico.NOME ||
            servico.nomeServico ||
            servico.nome ||
            '';
        const categoria =
            servico.CATEGORIA ||
            servico.categoria ||
            '';
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

        const data = formatarDataSimples(at.DATA || at.data);

        const idCliente = at.ID_CLIENTE || at.idCliente || '';
        const idServico = at.ID_SERVICO || at.idServico || '';
        const nomeCliRaw = at.CLIENTE || at.cliente || at.nomeCliente || '';
        const nomeServRaw = at.SERVICO || at.servico || at.nomeServico || '';

        const valor = parseFloat(at.VALOR_TOTAL || at.valorTotal || 0);
        const pgto = at.FORMA_PAGAMENTO || at.formaPagamento || '';
        const obs = at.OBSERVACOES || at.OBS || at.observacoes || '';

        // Resolver nome do cliente
        let nomeCliente = 'Desconhecido';
        if (idCliente) {
            const cli = cacheClientes.find(
                c => (c.ID_CLIENTE || c.idCliente || c.ID || c.id) == idCliente
            );
            if (cli) {
                nomeCliente =
                    cli.NOME ||
                    cli.nome ||
                    cli.Nome ||
                    cli.CLIENTE ||
                    cli.Cliente ||
                    nomeCliRaw ||
                    'Desconhecido';
            } else if (nomeCliRaw) {
                nomeCliente = nomeCliRaw;
            }
        } else if (nomeCliRaw) {
            nomeCliente = nomeCliRaw;
        }

        // Resolver nome do serviço
        let nomeServico = 'Desconhecido';
        if (idServico) {
            const serv = cacheServicos.find(
                s => (s.ID_SERVICO || s.idServico || s.ID || s.id) == idServico
            );
            if (serv) {
                nomeServico =
                    serv.NOME_SERVICO ||
                    serv.NOME ||
                    serv.nomeServico ||
                    serv.nome ||
                    nomeServRaw ||
                    'Desconhecido';
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

function preencherSelectClientes() {
    const select = document.getElementById('atCliente');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um cliente...</option>';

    cacheClientes.forEach((c) => {
        const nome =
            c.NOME ||
            c.nome ||
            c.Nome ||
            c.CLIENTE ||
            c.Cliente ||
            '';
        if (!nome) return;

        const id =
            c.ID_CLIENTE ||
            c.idCliente ||
            c.ID ||
            c.id ||
            nome; // fallback: usa o nome como "ID"

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

    cacheServicos.forEach((s) => {
        const nome =
            s.NOME_SERVICO ||
            s.NOME ||
            s.nomeServico ||
            s.nome ||
            '';
        if (!nome) return;

        const id =
            s.ID_SERVICO ||
            s.idServico ||
            s.ID ||
            s.id ||
            nome; // fallback: nome como identificador

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

    const idServicoSelecionado = select.value;
    if (!idServicoSelecionado) return;

    const servico = cacheServicos.find(
        s => (s.ID_SERVICO || s.idServico || s.ID || s.id || s.NOME_SERVICO || s.NOME || s.nomeServico || s.nome) == idServicoSelecionado
    );

    if (servico) {
        const preco = parseFloat(servico.PRECO_BASE || servico.precoBase || 0);
        if (!isNaN(preco) && preco > 0) {
            campoValor.value = preco.toFixed(2);
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
        idCliente,            // pode ser ID ou nome (fallback)
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

async function enviarDados(payload, msgSucesso, callbackSucesso) {
    const options = {
        method: 'POST',
        // text/plain evita preflight complexo e funciona bem com Apps Script
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
