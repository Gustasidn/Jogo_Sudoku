const CHAVE_PROJETO = "P26-2B-8F20-6829-E280-0237";
const SOLUTION = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const BASE_PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

const PUZZLES = {
  facil: BASE_PUZZLE,
  medio: "530070000600095000008000060800060003000803001700020006060000280000419000000080079",
  dificil: "030000000000195000098000060000060003400800001000020000060000280000419005000000079",
};

const discordSession = {
  user_id: "discord_" + CHAVE_PROJETO.slice(-4).toLowerCase(),
  username: "Gustavo",
  avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
};

const boardElement = document.getElementById("sudokuBoard");
const timerElement = document.getElementById("gameTimer");
const gameStatusElement = document.getElementById("gameStatus");
const difficultyElement = document.getElementById("difficultySelect");
const notesButton = document.getElementById("notesBtn");
const cellElements = [];

let cells = [];
let selectedIndex = 0;
let currentSolution = SOLUTION;
let notesMode = false;
let gameStartedAt = 0;
let timerInterval = null;

const gameService = {
  async start(difficulty) {
    return {
      puzzle: PUZZLES[difficulty] || PUZZLES.facil,
      solution: SOLUTION,
      source: "local",
    };
  },
};

function renderDiscordHeader() {
  const element = document.getElementById("discordUserText");
  if (element) {
    element.textContent = "Discord: " + discordSession.username + " (" + discordSession.user_id + ")";
  }
}

function createBoard() {
  for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
    const row = document.createElement("div");
    row.className = "sudoku-row";
    row.setAttribute("role", "row");
    row.setAttribute("aria-label", "Linha " + (rowIndex + 1));

    for (let columnIndex = 0; columnIndex < 9; columnIndex += 1) {
      const index = rowIndex * 9 + columnIndex;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "sudoku-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.index = String(index);
      cell.dataset.row = String(rowIndex);
      cell.dataset.column = String(columnIndex);
      cell.tabIndex = index === 0 ? 0 : -1;

      if (columnIndex === 2 || columnIndex === 5) {
        cell.classList.add("box-right");
      }
      if (rowIndex === 2 || rowIndex === 5) {
        cell.classList.add("box-bottom");
      }

      row.appendChild(cell);
      cellElements.push(cell);
    }

    boardElement.appendChild(row);
  }
}

function renderCell(index) {
  const cellElement = cellElements[index];
  const cellState = cells[index];
  if (!cellElement || !cellState) return;

  cellElement.classList.toggle("is-fixed", cellState.fixed);
  cellElement.replaceChildren();

  if (cellState.value) {
    const valueElement = document.createElement("span");
    valueElement.className = "sudoku-value";
    valueElement.textContent = String(cellState.value);
    cellElement.appendChild(valueElement);
  } else if (cellState.notes.size > 0) {
    const notesElement = document.createElement("span");
    notesElement.className = "cell-notes";
    notesElement.setAttribute("aria-hidden", "true");

    for (let value = 1; value <= 9; value += 1) {
      const noteElement = document.createElement("span");
      noteElement.textContent = cellState.notes.has(value) ? String(value) : "";
      notesElement.appendChild(noteElement);
    }

    cellElement.appendChild(notesElement);
  }

  const row = Math.floor(index / 9) + 1;
  const column = (index % 9) + 1;
  const content = cellState.value ? String(cellState.value) : "vazia";
  const notes = cellState.notes.size ? ", com notas " + Array.from(cellState.notes).sort().join(", ") : "";
  const fixed = cellState.fixed ? ", número inicial" : "";
  cellElement.setAttribute("aria-label", "Linha " + row + ", coluna " + column + ", " + content + notes + fixed);
}

function updateHighlights() {
  const selectedRow = Math.floor(selectedIndex / 9);
  const selectedColumn = selectedIndex % 9;
  const selectedCell = cells[selectedIndex];

  cellElements.forEach((element, index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const cellState = cells[index];
    const sameBlock = Math.floor(row / 3) === Math.floor(selectedRow / 3)
      && Math.floor(column / 3) === Math.floor(selectedColumn / 3);
    const sameUnit = row === selectedRow || column === selectedColumn || sameBlock;

    element.classList.toggle("is-selected", index === selectedIndex);
    element.classList.toggle("is-peer", index !== selectedIndex && sameUnit);
    element.classList.toggle(
      "is-matching",
      index !== selectedIndex && selectedCell.value > 0 && cellState.value === selectedCell.value,
    );
    element.setAttribute("aria-selected", String(index === selectedIndex));
    element.tabIndex = index === selectedIndex ? 0 : -1;
  });
}

function selectCell(index, moveFocus) {
  if (index < 0 || index >= cellElements.length) return;
  selectedIndex = index;
  updateHighlights();
  if (moveFocus) {
    cellElements[selectedIndex].focus();
  }
}

function finishGame() {
  window.clearInterval(timerInterval);
  timerInterval = null;
  gameStatusElement.textContent = "Parabéns! Sudoku concluído corretamente.";
}

function checkCompletion() {
  if (cells.some((cell) => cell.value === 0)) return false;
  return cells.every((cell, index) => cell.value === Number(currentSolution[index]));
}

function enterValue(value) {
  const cell = cells[selectedIndex];
  if (!cell || cell.fixed) return;

  if (notesMode) {
    if (cell.value) return;
    if (cell.notes.has(value)) {
      cell.notes.delete(value);
    } else {
      cell.notes.add(value);
    }
  } else {
    cell.value = value;
    cell.notes.clear();
  }

  renderCell(selectedIndex);
  updateHighlights();

  if (!notesMode && checkCompletion()) {
    finishGame();
  } else {
    gameStatusElement.textContent = notesMode
      ? "Nota " + value + (cell.notes.has(value) ? " adicionada." : " removida.") + " · Linha " + (Math.floor(selectedIndex / 9) + 1) + ", coluna " + ((selectedIndex % 9) + 1) + "."
      : value + " inserido na linha " + (Math.floor(selectedIndex / 9) + 1) + ", coluna " + ((selectedIndex % 9) + 1) + ".";
  }
}

function eraseCell() {
  const cell = cells[selectedIndex];
  if (!cell || cell.fixed) return;

  cell.value = 0;
  cell.notes.clear();
  renderCell(selectedIndex);
  updateHighlights();
  gameStatusElement.textContent = "Conteúdo removido da célula selecionada.";
}

function setNotesMode(enabled) {
  notesMode = enabled;
  notesButton.setAttribute("aria-pressed", String(notesMode));
  notesButton.querySelector("span").textContent = notesMode ? "Notas: ativadas" : "Notas";
  gameStatusElement.textContent = notesMode
    ? "Modo de notas ativado. Escolha um número para anotar."
    : "Modo de notas desativado.";
}

function moveSelection(rowDelta, columnDelta) {
  const row = Math.floor(selectedIndex / 9);
  const column = selectedIndex % 9;
  const nextRow = Math.max(0, Math.min(8, row + rowDelta));
  const nextColumn = Math.max(0, Math.min(8, column + columnDelta));
  selectCell(nextRow * 9 + nextColumn, true);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return minutes + ":" + seconds;
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - gameStartedAt) / 1000);
  timerElement.textContent = formatTime(elapsed);
  timerElement.dateTime = "PT" + elapsed + "S";
}

async function startGame() {
  const game = await gameService.start(difficultyElement.value);
  currentSolution = game.solution;
  cells = game.puzzle.split("").map((character) => {
    const value = Number(character);
    return { value, fixed: value > 0, notes: new Set() };
  });

  cells.forEach((cell, index) => renderCell(index));
  selectedIndex = cells.findIndex((cell) => !cell.fixed);
  if (selectedIndex < 0) selectedIndex = 0;
  updateHighlights();

  setNotesMode(false);
  window.clearInterval(timerInterval);
  gameStartedAt = Date.now();
  updateTimer();
  timerInterval = window.setInterval(updateTimer, 1000);
  gameStatusElement.textContent = "Partida local iniciada. Integração de partidas com a API do backend poderá ser conectada pelo serviço de jogo.";
}

function handleBoardKeydown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const isBoardCell = event.target instanceof Element && event.target.closest(".sudoku-cell");
  if (!isBoardCell) return;

  const movement = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }[event.key];

  if (movement) {
    event.preventDefault();
    moveSelection(movement[0], movement[1]);
  }
}

function handleDocumentKeydown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;

  if (/^[1-9]$/.test(event.key)) {
    enterValue(Number(event.key));
  } else if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    event.preventDefault();
    eraseCell();
  } else if (event.key.toLowerCase() === "n") {
    setNotesMode(!notesMode);
  }
}

async function carregarStatus() {
  const listElement = document.getElementById("recordsList");
  try {
    const response = await fetch("/api/status");
    if (!response.ok) {
      throw new Error("A API respondeu com o status " + response.status + ".");
    }

    const data = await response.json();
    listElement.replaceChildren();
    if (data.sessionUser) {
      discordSession.user_id = data.sessionUser.userId;
      discordSession.username = data.sessionUser.username;
      discordSession.avatar = data.sessionUser.avatar || discordSession.avatar;
      renderDiscordHeader();
    }

    const items = Array.isArray(data.ultimosRegistros) ? data.ultimosRegistros : [];
    if (items.length === 0) {
      const item = document.createElement("li");
      item.textContent = "API Online (" + (data.d1Connected ? "D1 conectado" : "modo diagnóstico") + "). Nenhum registro gravado ainda.";
      listElement.appendChild(item);
      return;
    }

    items.forEach((record) => {
      const item = document.createElement("li");
      item.textContent = "[" + (record.created_at || "agora") + "] " + record.username + " (" + record.user_id + "): " + record.conteudo;
      listElement.appendChild(item);
    });
  } catch (error) {
    const item = document.createElement("li");
    item.textContent = "API de diagnóstico indisponível: " + error.message;
    listElement.replaceChildren(item);
  }
}

async function enviarRegistro() {
  const input = document.getElementById("recordInput");
  const statusElement = document.getElementById("statusMessage");
  const content = input.value.trim();
  if (!content) {
    statusElement.textContent = "Digite um conteúdo antes de registrar.";
    input.focus();
    return;
  }

  statusElement.textContent = "Enviando para Cloudflare Function...";
  try {
    const response = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: discordSession.user_id,
        username: discordSession.username,
        conteudo: content,
      }),
    });

    if (!response.ok) {
      throw new Error("A API respondeu com o status " + response.status + ".");
    }

    input.value = "";
    statusElement.textContent = "Registro processado na Cloudflare Function.";
    await carregarStatus();
  } catch (error) {
    statusElement.textContent = "Não foi possível registrar: " + error.message;
  }
}

createBoard();
boardElement.addEventListener("click", (event) => {
  const cellElement = event.target.closest(".sudoku-cell");
  if (cellElement) {
    selectCell(Number(cellElement.dataset.index), false);
  }
});
boardElement.addEventListener("keydown", handleBoardKeydown);
document.addEventListener("keydown", handleDocumentKeydown);

document.getElementById("numberPad").addEventListener("click", (event) => {
  const button = event.target.closest("[data-number]");
  if (button) enterValue(Number(button.dataset.number));
});
document.getElementById("eraseBtn").addEventListener("click", eraseCell);
document.getElementById("checkBtn").addEventListener("click", () => {
  if (cells.some((cell) => cell.value === 0)) {
    gameStatusElement.textContent = "Ainda há células vazias. Continue preenchendo o tabuleiro.";
  } else if (checkCompletion()) {
    finishGame();
  } else {
    gameStatusElement.textContent = "Ainda há números incorretos. Revise as células preenchidas.";
  }
});
notesButton.addEventListener("click", () => setNotesMode(!notesMode));
document.getElementById("newGameBtn").addEventListener("click", startGame);
document.getElementById("sendBtn").addEventListener("click", enviarRegistro);

renderDiscordHeader();
startGame();
carregarStatus();
