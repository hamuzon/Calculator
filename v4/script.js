const display = document.getElementById('display');
let rawExpression = '';

function renderDisplay() {
  display.value = rawExpression.replace(/\*/g, '×').replace(/\//g, '÷');
}

function appendValue(value) {
  const ops = "+-*/^%";
  const lastChar = rawExpression.slice(-1);

  // Error表示後にボタンが押されたら表示をリセット
  if (rawExpression === 'Error') {
    rawExpression = (ops.includes(value) && value !== '-') ? '0' + value : (value === '-' ? '-' : value);
    renderDisplay();
    return;
  }

  // 小数点の制御
  if (value === '.') {
    const match = rawExpression.match(/(\d*\.?\d*)$/);
    const currentNum = match ? match[0] : '';
    if (currentNum.includes('.')) return;
    if (currentNum.length === 0) {
      value = '0.';
    }
  }

  // 先頭の単独0の置き換え
  if (rawExpression === '0' && value !== '.') {
    if (!ops.includes(value) && !value.includes('(') && value !== 'π' && value !== 'e' && value !== '√') {
      rawExpression = value;
      renderDisplay();
      return;
    }
  }

  // 負の符号 '-' の入力処理
  if (value === '-') {
    // 式が空、または直前が '(' の場合は負号として追加
    if (rawExpression === '' || lastChar === '(') {
      rawExpression += '-';
      renderDisplay();
      return;
    }
    // 直前が演算子の場合
    if (ops.includes(lastChar)) {
      const secondLastChar = rawExpression.slice(-2, -1);
      // 直前に既に2重演算子（例: *-）がある場合はそれ以上マイナスを重ねない
      if (ops.includes(secondLastChar)) {
        return;
      }
      if (lastChar === '+') {
        rawExpression = rawExpression.slice(0, -1) + '-';
        renderDisplay();
        return;
      }
      if (lastChar === '-') {
        return;
      }
      // *, /, ^, % の直後は負号として '-' を追加 (例: 5*-, 5/-)
      rawExpression += '-';
      renderDisplay();
      return;
    }
  }

  // '-' 以外の演算子 (+, *, /, ^, %) の入力処理
  if (ops.includes(value)) {
    if (rawExpression === '') {
      rawExpression = '0' + value;
      renderDisplay();
      return;
    }
    if (rawExpression === '-') {
      return;
    }
    // 直前の2文字が "*-", "/-", "^-" などの場合
    const secondLastChar = rawExpression.slice(-2, -1);
    if (ops.includes(secondLastChar) && ops.includes(lastChar)) {
      rawExpression = rawExpression.slice(0, -2) + value;
      renderDisplay();
      return;
    }
    // 直前が単一の演算子の場合は置き換え
    if (ops.includes(lastChar)) {
      rawExpression = rawExpression.slice(0, -1) + value;
      renderDisplay();
      return;
    }
    if (lastChar === '(') {
      return;
    }
  }

  rawExpression += value;
  renderDisplay();
}

function clearDisplay() {
  rawExpression = '';
  renderDisplay();
}

function clearEntry() {
  rawExpression = '';
  renderDisplay();
}

function backspace() {
  rawExpression = rawExpression.slice(0, -1);
  renderDisplay();
}

function toggleSign() {
  if (rawExpression === '' || rawExpression === 'Error') {
    rawExpression = '-';
    renderDisplay();
    return;
  }
  if (rawExpression === '-') {
    rawExpression = '';
    renderDisplay();
    return;
  }

  // 末尾の数値を検索
  const numMatch = rawExpression.match(/(\d+\.?\d*)$/);
  if (!numMatch) {
    const lastChar = rawExpression.slice(-1);
    if (lastChar === '-') {
      rawExpression = rawExpression.slice(0, -1);
    } else if ("+*/^(".includes(lastChar)) {
      rawExpression += '-';
    }
    renderDisplay();
    return;
  }

  const numStr = numMatch[0];
  const numStartIdx = numMatch.index;
  const prefix = rawExpression.slice(0, numStartIdx);

  // 符号反転
  if (prefix.endsWith('*-') || prefix.endsWith('/-') || prefix.endsWith('^-') || prefix.endsWith('+-') || prefix.endsWith('(-')) {
    rawExpression = prefix.slice(0, -1) + numStr;
  } else if (prefix.endsWith('--')) {
    rawExpression = prefix.slice(0, -1) + numStr;
  } else if (prefix === '-') {
    rawExpression = numStr;
  } else if (prefix.endsWith('-') && (prefix.length === 1 || "+-*/^(".includes(prefix.slice(-2, -1)))) {
    rawExpression = prefix.slice(0, -1) + numStr;
  } else if (prefix.endsWith('-')) {
    rawExpression = prefix + '-' + numStr;
  } else {
    rawExpression = prefix + '-' + numStr;
  }
  renderDisplay();
}

function calculateResult() {
  try {
    if (rawExpression.trim() === '') return;
    let exp = rawExpression;

    // 定数・関数の置換
    exp = exp.replace(/π/g, 'Math.PI');
    exp = exp.replace(/e/g, 'Math.E');
    exp = exp.replace(/log\(/g, 'Math.log10(');
    exp = exp.replace(/ln\(/g, 'Math.log(');
    exp = exp.replace(/sin\(/g, 'Math.sin(');
    exp = exp.replace(/cos\(/g, 'Math.cos(');
    exp = exp.replace(/tan\(/g, 'Math.tan(');
    exp = exp.replace(/√(\d+(\.\d+)?)/g, 'Math.sqrt($1)');
    exp = exp.replace(/√/g, 'Math.sqrt');

    // パーセント
    exp = exp.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

    // 暗黙の掛け算
    exp = exp.replace(/(\d)(Math\.|\()/g, '$1*$2');
    exp = exp.replace(/\)(\d)/g, ')*$1');
    exp = exp.replace(/\)\(/g, ')*(');

    // べき乗
    exp = exp.replace(/\^/g, '**');

    // 負数とべき乗・演算子の調整
    exp = exp.replace(/(^|[+\-*/(])-(\d+(?:\.\d+)?)\*\*/g, '$1(-$2)**');
    exp = exp.replace(/([*/^])\s*-(\d+(?:\.\d+)?)/g, '$1(-$2)');
    exp = exp.replace(/--/g, '+');
    exp = exp.replace(/\+-/g, '-');
    exp = exp.replace(/-\+/g, '-');

    // 閉じ括弧の自動補完
    const openCount = (exp.match(/\(/g) || []).length;
    const closeCount = (exp.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      exp += ')'.repeat(openCount - closeCount);
    }

    // 式の評価
    let result = Function("'use strict'; return (" + exp + ")")();
    if (!isFinite(result) || isNaN(result)) {
      rawExpression = 'Error';
      renderDisplay();
      return;
    }

    result = parseFloat(result.toFixed(10));
    rawExpression = result.toString();
    renderDisplay();
  } catch {
    rawExpression = 'Error';
    renderDisplay();
  }
}

document.addEventListener('keydown', function(e) {
  const allowedKeys = '0123456789+-*/().^%';
  if (allowedKeys.includes(e.key)) {
    appendValue(e.key);
    e.preventDefault();
  } else if (e.key === 'Enter' || e.key === '=') {
    calculateResult();
    e.preventDefault();
  } else if (e.key === 'Backspace') {
    backspace();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    clearDisplay();
    e.preventDefault();
  }
});

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
applyTheme(prefersDark.matches ? 'dark' : 'light');
prefersDark.addEventListener('change', e => {
  applyTheme(e.matches ? 'dark' : 'light');
});

if (navigator.userAgentData) {
  navigator.userAgentData.getHighEntropyValues(['platform', 'platformVersion'])
    .then(data => {
      console.log('OS:', data.platform);
      console.log('OS Version:', data.platformVersion);
    });
} else {
  console.log('navigator.userAgent:', navigator.userAgent);
}