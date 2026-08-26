const display = document.getElementById('display');

let rawExpression = '';
let lastCalculated = false;

// 表示レンダリング
function renderDisplay() {
  display.value = rawExpression
    .replace(/\*/g, '×')
    .replace(/\//g, '÷');
}

function appendValue(value) {
  const ops = "+-*/^%";
  const lastChar = rawExpression.slice(-1);

  // Error表示または計算直後の入力処理
  if (rawExpression === 'Error' || rawExpression === 'Infinity' || rawExpression === '-Infinity') {
    rawExpression = ops.includes(value) ? '0' : '';
  }

  if (lastCalculated) {
    if (ops.includes(value)) {
      lastCalculated = false;
    } else {
      rawExpression = '';
      lastCalculated = false;
    }
  }

  // 小数点の制御
  if (value === '.') {
    const tokens = rawExpression.split(/[\+\-\*\/\^%()!]/);
    const currentNum = tokens[tokens.length - 1];
    if (currentNum.includes('.')) return;
    if (currentNum.length === 0) value = '0.';
  }

  // 先頭の0の置き換え
  if (rawExpression === '0' && value !== '.') {
    if (!ops.includes(value)) {
      rawExpression = value;
      renderDisplay();
      return;
    }
  }

  // 演算子の連続入力時の上書き
  if (ops.includes(lastChar) && ops.includes(value)) {
    if (value === '-' && (lastChar === '*' || lastChar === '/' || lastChar === '^')) {
      rawExpression += '-';
      renderDisplay();
      return;
    }
    rawExpression = rawExpression.slice(0, -1) + value;
    renderDisplay();
    return;
  }

  rawExpression += value;
  renderDisplay();
}

function clearDisplay() {
  rawExpression = '';
  lastCalculated = false;
  renderDisplay();
}

function clearEntry() {
  rawExpression = '';
  lastCalculated = false;
  renderDisplay();
}

function backspace() {
  rawExpression = rawExpression.slice(0, -1);
  renderDisplay();
}

function toggleSign() {
  let exp = rawExpression;
  if (!exp || exp === 'Error') return;
  const match = exp.match(/(-?\d+\.?\d*)$/);
  if (!match) return;
  const numStr = match[0];
  const num = parseFloat(numStr);
  const inverted = (-num).toString();
  rawExpression = exp.slice(0, match.index) + inverted;
  renderDisplay();
}

function calculateResult() {
  try {
    if (!rawExpression || rawExpression.trim() === '') return;

    let exp = rawExpression;

    // 定数・関数の置換
    exp = exp.replace(/π/g, 'pi');
    exp = exp.replace(/e/g, 'e');
    exp = exp.replace(/log\(/g, 'log10(');
    exp = exp.replace(/ln\(/g, 'log_e(');
    exp = exp.replace(/√\(/g, 'sqrt(');
    exp = exp.replace(/√/g, 'sqrt');

    // 暗黙の掛け算の自動解釈 (例: 2(3) -> 2*(3), 2π -> 2*pi)
    exp = exp.replace(/(\d)(pi|e|sqrt|log10|log_e|sin|cos|tan|\()/g, '$1*$2');
    exp = exp.replace(/\)(\d|pi|e|\()/g, ')*$1');

    // 括弧の自動補完
    const openCount = (exp.match(/\(/g) || []).length;
    const closeCount = (exp.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      exp += ')'.repeat(openCount - closeCount);
    }

    const scope = {
      pi: Math.PI,
      e: Math.E,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      log_e: Math.log,
      log10: Math.log10,
      sqrt: Math.sqrt
    };

    let result;

    // math.js による高精度計算
    if (typeof math !== 'undefined' && math.evaluate) {
      const res = math.evaluate(exp, scope);
      result = typeof res === 'number' ? res : Number(res.valueOf ? res.valueOf() : res);
    } else {
      let jsExp = exp
        .replace(/pi/g, 'Math.PI')
        .replace(/\^/g, '**')
        .replace(/(\d+(\.\d+)?)%/g, '($1/100)')
        .replace(/log10\(/g, 'Math.log10(')
        .replace(/log_e\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(');

      const fn = new Function('scope', `'use strict'; return (${jsExp})`);
      result = fn(scope);
    }

    if (!isFinite(result) || isNaN(result)) {
      rawExpression = 'Error';
      renderDisplay();
      return;
    }

    // 浮動小数点誤差の解消 (14桁で丸め)
    result = parseFloat(result.toPrecision(14));
    rawExpression = result.toString();
    lastCalculated = true;
    renderDisplay();
  } catch {
    rawExpression = 'Error';
    renderDisplay();
  }
}

// キーボード入力
document.addEventListener('keydown', function(e) {
  const allowedKeys = '0123456789+-*/().^%!';
  if (allowedKeys.includes(e.key)) {
    appendValue(e.key);
    e.preventDefault();
  } else if (e.key === 'Enter') {
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

// テーマ適用
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