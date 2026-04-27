const sourceInput = document.getElementById("sourceInput");
const scanBtn = document.getElementById("scanBtn");
const clearBtn = document.getElementById("clearBtn");
const exampleBtn = document.getElementById("exampleBtn");
const tokenList = document.getElementById("tokenList");
const stepList = document.getElementById("stepList");
const tokenCount = document.getElementById("tokenCount");

const keywords = {
  int: "INT",
  float: "FLOAT",
  void: "VOID",
  if: "IF",
  else: "ELSE",
  while: "WHILE",
  return: "RETURN",
  input: "INPUT",
  print: "PRINT"
};

const exampleCode = `int a = 0;
float b = 12.5;
while (a < 10) {
  a += 1;
  print(a);
}`;

exampleBtn.addEventListener("click", () => {
  sourceInput.value = exampleCode;
  scanSource();
});

scanBtn.addEventListener("click", scanSource);

clearBtn.addEventListener("click", () => {
  sourceInput.value = "";
  tokenList.className = "token-list empty";
  tokenList.textContent = "No tokens generated yet.";
  stepList.className = "step-list empty";
  stepList.textContent = "The DFA transition process will be displayed here after scanning.";
  tokenCount.textContent = "0 tokens";
});

function isLetter(ch) {
  return /^[A-Za-z_]$/.test(ch);
}

function isDigit(ch) {
  return /^[0-9]$/.test(ch);
}

function isLetterOrDigit(ch) {
  return /^[A-Za-z0-9_]$/.test(ch);
}

function addStep(steps, line, content) {
  steps.push({
    line,
    content
  });
}

function scanSource() {
  const source = sourceInput.value;
  const tokens = [];
  const steps = [];

  let i = 0;
  let line = 1;

  while (i < source.length) {
    let ch = source[i];

    if (ch === "\n") {
      line++;
      i++;
      continue;
    }

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (source[i] === "/" && source[i + 1] === "/") {
      addStep(steps, line, "Single-line comment skipped.");
      while (i < source.length && source[i] !== "\n") {
        i++;
      }
      continue;
    }

    if (source[i] === "/" && source[i + 1] === "*") {
      addStep(steps, line, "Multi-line comment entered.");
      i += 2;

      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") {
          line++;
        }
        i++;
      }

      if (i < source.length) {
        i += 2;
        addStep(steps, line, "Multi-line comment closed.");
      } else {
        tokens.push(makeToken("ERROR", "Unclosed comment", line, true));
      }

      continue;
    }

    if (isLetter(ch)) {
      const start = i;
      addStep(steps, line, `DFA enters identifier state at '${ch}'.`);

      while (i < source.length && isLetterOrDigit(source[i])) {
        i++;
      }

      const lexeme = source.slice(start, i);
      const type = keywords[lexeme] || "ID";

      tokens.push(makeToken(type, lexeme, line));
      addStep(steps, line, `Accepted '${lexeme}' as ${type}.`);
      continue;
    }

    if (isDigit(ch) || ch === ".") {
      const start = i;
      let hasDot = false;
      let hasExp = false;
      let valid = true;

      addStep(steps, line, `DFA enters number state at '${ch}'.`);

      if (ch === ".") {
        hasDot = true;
        i++;

        if (!isDigit(source[i])) {
          tokens.push(makeToken("DOT", ".", line));
          addStep(steps, line, "Accepted '.' as DOT.");
          continue;
        }
      }

      while (i < source.length && isDigit(source[i])) {
        i++;
      }

      if (source[i] === ".") {
        hasDot = true;
        i++;

        while (i < source.length && isDigit(source[i])) {
          i++;
        }
      }

      if (source[i] === "e" || source[i] === "E") {
        hasExp = true;
        i++;

        if (source[i] === "+" || source[i] === "-") {
          i++;
        }

        if (!isDigit(source[i])) {
          valid = false;
        }

        while (i < source.length && isDigit(source[i])) {
          i++;
        }
      }

      const lexeme = source.slice(start, i);

      if (!valid) {
        tokens.push(makeToken("ERROR", lexeme, line, true));
        addStep(steps, line, `Rejected invalid number '${lexeme}'.`);
      } else if (hasDot || hasExp) {
        tokens.push(makeToken("FLO", lexeme, line));
        addStep(steps, line, `Accepted '${lexeme}' as FLO.`);
      } else {
        tokens.push(makeToken("NUM", lexeme, line));
        addStep(steps, line, `Accepted '${lexeme}' as NUM.`);
      }

      continue;
    }

    if (ch === '"') {
      const startLine = line;
      const start = i;
      i++;

      addStep(steps, line, "DFA enters string state.");

      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\n") {
          line++;
        }
        i++;
      }

      if (source[i] === '"') {
        i++;
        const lexeme = source.slice(start, i);
        tokens.push(makeToken("STRING", lexeme, startLine));
        addStep(steps, startLine, "Accepted string literal.");
      } else {
        const lexeme = source.slice(start, i);
        tokens.push(makeToken("ERROR", lexeme, startLine, true));
        addStep(steps, startLine, "Rejected unclosed string literal.");
      }

      continue;
    }

    const two = source.slice(i, i + 2);

    if (two === "++") {
      tokens.push(makeToken("AAA", two, line));
      addStep(steps, line, "Accepted '++' as AAA.");
      i += 2;
      continue;
    }

    if (two === "+=") {
      tokens.push(makeToken("AAS", two, line));
      addStep(steps, line, "Accepted '+=' as AAS.");
      i += 2;
      continue;
    }

    if (["<=", ">=", "==", "!="].includes(two)) {
      tokens.push(makeToken("ROP", two, line));
      addStep(steps, line, `Accepted '${two}' as ROP.`);
      i += 2;
      continue;
    }

    if (two === "&&" || two === "||") {
      tokens.push(makeToken("BOP", two, line));
      addStep(steps, line, `Accepted '${two}' as BOP.`);
      i += 2;
      continue;
    }

    const singleTokenMap = {
      "+": "ADD",
      "-": "SUB",
      "*": "MUL",
      "/": "DIV",
      "=": "ASG",
      "<": "ROP",
      ">": "ROP",
      "!": "BOP",
      "(": "LPAR",
      ")": "RPAR",
      "{": "LBR",
      "}": "RBR",
      "[": "LBK",
      "]": "RBK",
      ",": "CMA",
      ";": "SCO"
    };

    if (singleTokenMap[ch]) {
      tokens.push(makeToken(singleTokenMap[ch], ch, line));
      addStep(steps, line, `Accepted '${ch}' as ${singleTokenMap[ch]}.`);
      i++;
      continue;
    }

    tokens.push(makeToken("ERROR", ch, line, true));
    addStep(steps, line, `Rejected unknown symbol '${ch}'.`);
    i++;
  }

  renderTokens(tokens);
  renderSteps(steps);
}

function makeToken(type, lexeme, line, error = false) {
  return {
    type,
    lexeme,
    line,
    error
  };
}

function renderTokens(tokens) {
  tokenList.innerHTML = "";
  tokenList.className = "token-list";
  tokenCount.textContent = `${tokens.length} token${tokens.length === 1 ? "" : "s"}`;

  if (tokens.length === 0) {
    tokenList.className = "token-list empty";
    tokenList.textContent = "No tokens generated.";
    return;
  }

  tokens.forEach((token) => {
    const item = document.createElement("div");
    item.className = token.error ? "token-item error" : "token-item";

    item.innerHTML = `
      <div class="token-type">${escapeHTML(token.type)}</div>
      <div class="token-lexeme">${escapeHTML(token.lexeme)}</div>
      <div class="token-line">line ${token.line}</div>
    `;

    tokenList.appendChild(item);
  });
}

function renderSteps(steps) {
  stepList.innerHTML = "";
  stepList.className = "step-list";

  if (steps.length === 0) {
    stepList.className = "step-list empty";
    stepList.textContent = "No DFA steps generated.";
    return;
  }

  steps.forEach((step, index) => {
    const item = document.createElement("div");
    item.className = "step-item";

    item.innerHTML = `
      <div class="token-type">#${index + 1}</div>
      <div class="token-lexeme">line ${step.line}: ${escapeHTML(step.content)}</div>
    `;

    stepList.appendChild(item);
  });
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}