document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO DO GITHUB ---
    const GITHUB_USER = 'geysivancampos'; // Substitua pelo seu nome de usuário do GitHub
    const GITHUB_REPO = 'coletor-de-precos'; // Substitua pelo nome do seu repositório
    const DATA_FILE_PATH = 'dados.json'; // Nome do arquivo que guardará os dados

    // --- SELEÇÃO DOS ELEMENTOS DO DOM ---
    const form = document.getElementById('price-form');
    const formButton = form.querySelector('button[type="submit"]');
    const uploadBtn = document.getElementById('upload-btn');
    const tokenInput = document.getElementById('github-token');
    const tableBody = document.querySelector('#data-table tbody');

    let collectedData =;
    let editingIndex = null;

    const productQuantities = {
        "Café": "300 g", "Óleo": "750 g", "Açucar": "3 kg", "Manteiga": "750 g",
        "Farinha": "3 kg", "Arroz": "3,6 kg", "Feijão": "4,5 kg", "Leite": "6 L",
        "Banana": "90 unid", "Tomate": "12 kg", "Pão": "6 kg", "Carne Bovina": "6 kg"
    };

    // --- FUNÇÕES DE DADOS E RENDERIZAÇÃO (sem mudanças) ---
    function loadDataFromStorage() {
        const savedData = localStorage.getItem('priceData');
        if (savedData) {
            collectedData = JSON.parse(savedData);
            renderTable();
        }
    }

    function saveDataToStorage() {
        localStorage.setItem('priceData', JSON.stringify(collectedData));
    }

    function renderTable() {
        tableBody.innerHTML = '';
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

    // --- LÓGICA DO FORMULÁRIO (sem mudanças) ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const entry = {
            produto: formData.get('produto'),
            zona: formData.get('zona'),
            questionario: formData.get('questionario'),
            preco: parseFloat(formData.get('preco'))
        };

        if (!entry.produto ||!entry.zona ||!entry.questionario |

| isNaN(entry.preco) |
| entry.preco <= 0) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        entry.quantidade = productQuantities[entry.produto] |

| 'N/A';

        if (editingIndex!== null) {
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

    // --- LÓGICA DE EDIÇÃO E EXCLUSÃO (sem mudanças) ---
    tableBody.addEventListener('click', (event) => {
        const target = event.target;
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

    // --- NOVA LÓGICA DE ENVIO PARA O GITHUB ---
    uploadBtn.addEventListener('click', async () => {
        const token = tokenInput.value;
        if (collectedData.length === 0) {
            alert('Não há dados para enviar. Adicione alguns preços primeiro.');
            return;
        }
        if (!token) {
            alert('Por favor, insira seu GitHub Personal Access Token.');
            return;
        }

        const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        try {
            // 1. Tenta obter o arquivo existente para pegar o "SHA" (versão atual)
            let sha;
            try {
                const response = await fetch(apiUrl, { headers });
                if (response.ok) {
                    const fileData = await response.json();
                    sha = fileData.sha;
                }
            } catch (error) {
                console.log("Arquivo de dados ainda não existe. Criando um novo.");
            }

            // 2. Prepara os dados para envio
            const content = btoa(JSON.stringify(collectedData, null, 2)); // Codifica os dados em Base64
            const commitMessage = `Atualiza dados da coleta - ${new Date().toISOString()}`;
            const body = {
                message: commitMessage,
                content: content,
                sha: sha // Inclui o SHA se o arquivo já existir, para atualizá-lo
            };

            // 3. Envia os dados para o GitHub (cria ou atualiza o arquivo)
            const uploadResponse = await fetch(apiUrl, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (uploadResponse.ok) {
                alert('Dados enviados com sucesso para o GitHub!');
            } else {
                const errorData = await uploadResponse.json();
                alert(`Erro ao enviar dados: ${errorData.message}`);
            }

        } catch (error) {
            console.error('Erro na comunicação com a API do GitHub:', error);
            alert('Ocorreu um erro inesperado. Verifique o console para mais detalhes.');
        }
    });

    // Carrega os dados salvos ao iniciar
    loadDataFromStorage();
});
