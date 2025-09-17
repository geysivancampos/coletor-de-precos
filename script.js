// Aguarda o carregamento completo do DOM antes de executar o script
document.addEventListener('DOMContentLoaded', () => {
    // --- INÍCIO DA CONFIGURAÇÃO DO GITHUB ---
    const GITHUB_USER = 'geysivancampos'; // Seu nome de usuário no GitHub
    const GITHUB_REPO = 'coletor-de-precos'; // O nome do seu repositório
    const DATA_FILE_PATH = 'dados.json'; // O arquivo que guardará os dados
    // --- FIM DA CONFIGURAÇÃO DO GITHUB ---

    // --- SELEÇÃO DOS ELEMENTOS DO DOM ---
    const form = document.getElementById('price-form');
    const formButton = form.querySelector('button[type="submit"]');
    const tableBody = document.querySelector('#data-table tbody');
    const uploadBtn = document.getElementById('upload-btn');
    const githubTokenInput = document.getElementById('github-token');

    // Array para armazenar os dados coletados
    let collectedData = [];
    // Variável para rastrear a edição
    let editingIndex = null;

    // Mapeamento de produtos para suas quantidades
    const productQuantities = {
        "Café": "300 g",
        "Óleo": "750 g",
        "Açucar": "3 kg",
        "Manteiga": "750 g",
        "Farinha": "3 kg",
        "Arroz": "3,6 kg",
        "Feijão": "4,5 kg",
        "Leite": "6 L",
        "Banana": "90 unid",
        "Tomate": "12 kg",
        "Pão": "6 kg",
        "Carne Bovina": "6 kg"
    };

    // Função para carregar dados do localStorage
    function loadDataFromStorage() {
        const savedData = localStorage.getItem('priceData');
        if (savedData) {
            collectedData = JSON.parse(savedData);
            renderTable();
        }
    }

    // Função para salvar os dados no localStorage
    function saveDataToStorage() {
        localStorage.setItem('priceData', JSON.stringify(collectedData));
    }

    // Função para desenhar a tabela na tela
    function renderTable() {
        tableBody.innerHTML = ''; // Limpa a tabela antes de redesenhar

        collectedData.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.produto}</td>
                <td>${entry.quantidade}</td>
                <td>${entry.zona}</td>
                <td>${entry.questionario}</td>
                <td>${entry.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-index="${index}">Editar</button>
                    <button class="btn-delete" data-index="${index}">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Manipulador do evento de submissão do formulário (Adicionar ou Atualizar)
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const entry = {
            produto: formData.get('produto'),
            zona: formData.get('zona'),
            questionario: formData.get('questionario'),
            preco: parseFloat(formData.get('preco'))
        };

        if (!entry.produto || !entry.zona || !entry.questionario || isNaN(entry.preco) || entry.preco <= 0) {
            alert('Por favor, preencha todos os campos corretamente. O preço deve ser um número positivo.');
            return;
        }

        entry.quantidade = productQuantities[entry.produto] || 'N/A';

        if (editingIndex !== null) {
            collectedData[editingIndex] = entry;
            editingIndex = null;
            formButton.textContent = 'Adicionar Preço';
        } else {
            collectedData.push(entry);
        }

        saveDataToStorage();
        renderTable();
        form.reset();
        document.getElementById('produto').focus();
    });

    // Manipulador para os cliques nos botões de Editar e Excluir
    tableBody.addEventListener('click', (event) => {
        const target = event.target;
        if (!target.dataset.index) return; // Sai se não clicou em um botão com data-index

        const index = parseInt(target.dataset.index, 10);

        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este item?')) {
                collectedData.splice(index, 1);
                saveDataToStorage();
                renderTable();
            }
        }

        if (target.classList.contains('btn-edit')) {
            const itemToEdit = collectedData[index];
            form.elements.produto.value = itemToEdit.produto;
            form.elements.zona.value = itemToEdit.zona;
            form.elements.questionario.value = itemToEdit.questionario;
            form.elements.preco.value = itemToEdit.preco;

            editingIndex = index;
            formButton.textContent = 'Atualizar Preço';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Função para fazer o upload dos dados para o GitHub
    async function uploadToGitHub() {
        const token = githubTokenInput.value.trim();
        if (!token) {
            alert('Por favor, insira seu GitHub Personal Access Token.');
            return;
        }

        if (collectedData.length === 0) {
            alert('Não há dados para enviar. Adicione alguns preços primeiro.');
            return;
        }

        const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(collectedData, null, 2))));
        
        uploadBtn.textContent = 'Enviando...';
        uploadBtn.disabled = true;

        try {
            // Tenta obter o SHA do arquivo para garantir que estamos atualizando a versão mais recente
            let sha = undefined;
            try {
                const getFileResponse = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}` } });
                if (getFileResponse.ok) {
                    const fileData = await getFileResponse.json();
                    sha = fileData.sha;
                }
            } catch (e) {
                console.warn('Não foi possível obter o SHA. Tentando criar um novo arquivo.');
            }

            const body = {
                message: `Atualiza dados da cesta básica - ${new Date().toISOString()}`,
                content: content,
                sha: sha
            };

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                alert('Dados enviados com sucesso para o painel!');
            } else {
                const errorData = await response.json();
                throw new Error(`Erro ${response.status}: ${errorData.message}`);
            }

        } catch (error) {
            console.error('Falha no upload para o GitHub:', error);
            alert(`Ocorreu um erro ao enviar os dados: ${error.message}`);
        } finally {
            uploadBtn.textContent = 'Enviar para o Painel';
            uploadBtn.disabled = false;
        }
    }

    // Adiciona o evento de clique ao botão de upload
    uploadBtn.addEventListener('click', uploadToGitHub);

    // Carrega os dados salvos do localStorage ao iniciar
    loadDataFromStorage();
});