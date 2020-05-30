$(function () {

  const $allButtons = $('button');
  const $display = $('#display');
  const $errors = $('.errors');
  const $computation = $('.computation');
  const $clearAll = $('#clear');
  const $backspace = $('#backspace');
  const $numbers = $('.number');
  const $operators = $('.operator');
  const $equalsSign = $('#equals');
  const $decimal = $('#decimal');
  let isInAction;
  let isOperatorPressed;
  let isChained;
  let isResultShown;
  let task = '';

  function styleOnClick() {
    $(this).addClass('clicked').blur();
  }

  function styleOnPress(e) {
    // Handle backslash key
    if (e.keyCode === 220) return;
    const button = $allButtons.filter(`[data-key~="${e.key}"]`);
    if (!button.length) return;
    button.addClass('clicked');
  }

  function removeTransition() {
    $(this).removeClass('clicked');
  }

  function showMessage(value, block) {
    block.text(value).animate({ opacity: 1 }, 50);
  }

  function hideMessage(block) {
    block.animate({ opacity: 0 }, 50);
    block.text('');
  }

  function isLastOperator(value) {
    return value.slice(-1).match(/[-+×÷]/) ? true : false;
  }

  function isLastDecimal(value) {
    return value.split(/[-+×÷]/).slice(-1).toString().includes('.');
  }

  // If task does not contain two numbers and an operator then we cannot proceed
  function isNotComplete(value) {
    return splitTask(value).filter(number => number).length < 3 ? true : false;
  }

  // Turn our task into array (['number', 'operator', 'number'])
  function splitTask(value) {
    return value.split(/([-+×÷])(?=\d*?\.?\d+?\.?$)/);
  }

  // If any number is decimal we will use other function for calculation
  function isAnyDecimal(value) {
    const taskArray = splitTask(value);
    // First number gets prettified after the first operator is pressed
    return taskArray[0].includes('.') || prettify(taskArray[2]).includes('.') ? true : false;
  }

  // Separate big numbers by thousands
  function numberWithCommas(value) {
    // Do not apply toLocaleString() on '-0', because it becomes '0'
    if (task === '-0') return;
    value = splitTask(value);
    if (value.length === 1 && !value[0].includes('.')) {
      $display.text(Number(value[0]).toLocaleString());
    } else if (value.length === 3 && !value[2].includes('.')) {
      $display.text(Number(value[2]).toLocaleString());
    }
  }

  // Removes any useless zeroes or decimal points at the end of decimals
  // (avoid '123.', get '123') or (avoid '123.012300', get '123.0123')
  function prettify(value) {
    if (value.includes('.')) {
      if (value.endsWith('0')) value = value.replace(/0+$/, '');
      if (value.endsWith('.')) value = value.replace(/\.$/, '');
      return value;
    } else {
      return value;
    }
  }

  // Performing required calculation
  function compute(first, sign, second) {
    first = parseFloat(first);
    second = parseFloat(second);
    switch (sign) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '×':
        return first * second;
      case '÷':
        return first / second;
    }
  }

  // We need to figure out the multiplier for decimal to make it integer
  function getPrecision(first, second) {
    let longest;
    if (first.includes('.') && second.includes('.')) {
      longest = Math.max(first.length, second.length);
    } else if (first.includes('.')) {
      longest = first.length;
    } else {
      longest = second.length;
    }
    return '1'.padEnd(longest - 1, '0');
  }

  function handleDecimals(value) {
    let [firstNum, operator, secondNum] = splitTask(value);
    const precision = getPrecision(firstNum, secondNum);
    secondNum = prettify(secondNum);
    showMessage(`${firstNum} ${operator} ${secondNum} =`, $computation);
    // Basically we turn our decimals into integers for accurate computation
    firstNum = firstNum * precision;
    secondNum = secondNum * precision;
    if (operator === '×') {
      return compute(firstNum, operator, secondNum) / (precision * precision);
    } else if (operator === '÷') {
      return compute(firstNum, operator, secondNum);
    } else {
      return compute(firstNum, operator, secondNum) / precision;
    }
  }

  function handleIntegers(value) {
    let [firstNum, operator, secondNum] = splitTask(value);
    secondNum = prettify(secondNum);
    showMessage(`${firstNum} ${operator} ${secondNum} =`, $computation);
    return compute(firstNum, operator, secondNum);
  }

  function showResult(value) {
    const valueString = value.toString();
    if (valueString.includes('e') && valueString.match(/\d+$/)[0] > 260) {
      // Handling extremely long numbers
      clearAll();
      showMessage('Error: Number is too long.', $errors);
      return;
    } else if (valueString === 'Infinity' || valueString === '-Infinity' || valueString === 'NaN') {
      clearAll();
      showMessage('Error: Division by zero.', $errors)
      return;
    } else if (valueString.includes('e') || valueString.length > 18) {
      // We use max fraction digits of 12 for the result to fit the screen
      // Turn result in length greater than 18 chars into exponential
      $display.text(value.toExponential(12));
      task = $display.text();
    } else if (!valueString.includes('.') || (valueString.includes('.') && value > 1)) {
      // Handling integers and decimals greater than 1
      $display.text(value.toLocaleString(undefined, { maximumFractionDigits: 5 }));
      task = $display.text().replace(/,/g, '');
    } else if (valueString.includes('.') && valueString.length > 15) {
      // Handle decimals less than '1' and longer than 15 characters
      $display.text(value.toFixed(15));
      task = $display.text();
    } else {
      $display.text(value);
      task = valueString;
    }
    isResultShown = true;
  }

  function getResult() {
    // In case task is not fully formed (avoid '123' or '123+')
    // We must have two numbers and operator to go on
    if (isResultShown || isNotComplete(task)) return;
    hideMessage($errors);
    if (isAnyDecimal(task)) {
      showResult(handleDecimals(task));
    } else {
      showResult(handleIntegers(task));
    }
  }

  function clearAll() {
    task = '';
    $display.text('0');
    isInAction = false;
    isOperatorPressed = false;
    isChained = false;
    isResultShown = false;
    hideMessage($errors);
    hideMessage($computation);
  }

  function backspace() {
    if (!isInAction) return;
    let value = $display.text();
    if (task.length < 40 || task.length < 13) hideMessage($errors);
    if (task === '0.' || task === '0') {
      clearAll();
    } else if (!isLastOperator(task) && !isResultShown) {
      // Backspace what is showing on the screen
      // If it is first number we can backspace it up to the beginning
      // If it is second number we can backspace it up to the nearest operator
      // We cannot backspace the result of computation
      if (value.slice(-2).match(/,\d/)) {
        value = value.slice(0, -2);
      } else if (value.length === 1) {
        value = '0';
      } else {
        value = value.slice(0, -1);
      }
      $display.text(value);
      showMessage(`${$computation.text().slice(0, -1)}`, $computation);
      // Backspace our task behind the scenes
      task.length > 1 ? task = task.slice(0, -1) : task = '';
      if (task === '') clearAll();
    }
  }

  function addDecimal() {
    if ($display.text().length >= 14 && !isLastOperator(task)) return;
    hideMessage($errors);
    if (!isInAction || task === '0' || isResultShown) {
      // Automatically prepends '0' if '.' is at the beginning (avoid '.123', get '0.123')
      task = '0.';
      $display.text('0.');
      showMessage(task, $computation);
      isInAction = true;
      isResultShown = false;
    } else if (!isLastDecimal(task) && !isLastOperator(task)) {
      // If last number is decimal already do not add '.' (avoid '1.2.3', get 1.23)
      task += '.';
      $display.text($display.text() + '.');
      showMessage(`${$computation.text()}.`, $computation);
    } else if (task === '-') {
      // Automatically adds '0.' to '-' (avoid '-.123', get -0.123)
      task += '0.';
      $display.text('-0.');
      showMessage(task, $computation);
    } else if (isLastOperator(task)) {
      // Automatically adds '0.' to an operator before (avoid '123+.123', get '123+0.123')
      task += '0.';
      $display.text('0.');
      showMessage(`${$computation.text()} 0.`, $computation);
      isOperatorPressed = false;
    }
  }

  function addNumbers(key) {
    if ($display.text().length >= 15 && !isLastOperator(task) && !isResultShown) {
      showMessage('Error: Maximum 12 characters.', $errors);
      return;
    } else {
      hideMessage($errors);
    }
    const number = $(this).text() || key;
    // Cannot do two zeroes at the beginning
    if (task === '0' && number === '0') return;
    if (!isInAction) {
      // The very first digit that puts calculator in action
      task = number;
      $display.text(number);
      showMessage(task, $computation);
      isInAction = true;
    } else if (task === '-0') {
      // Swap the first zero of a negative number (avoid '-0123', get '-123')
      task = `${task.slice(0, -1)}${number}`;
      $display.text(task);
      showMessage(task, $computation);
    } else if (task === '0' || isResultShown) {
      // Swap the first zero with other digit (avoid '0123', get '123')
      // If result was shown start a new number, do not attach digits to result
      task = number;
      $display.text(number);
      showMessage(task, $computation);
      isResultShown = false;
      isChained = false;
    } else if (task.endsWith('0') && task.slice(-2).match(/\+|-|×|÷/)) {
      // Swap the last zero after the operator (avoid '123+0123, get '123+123')
      task = `${task.slice(0, -1)}${number}`;
      $display.text(number);
      showMessage(`${$computation.text().slice(0, -1)}${number}`, $computation);
    } else if (!isOperatorPressed) {
      // Appending digits to last number if operator is not yet pressed
      task += number;
      $display.append(number);
      showMessage(`${$computation.text()}${number}`, $computation);
    } else if (isOperatorPressed) {
      // If operator was already pressed switch to the next number
      task += number;
      $display.text(number);
      showMessage(`${$computation.text()}${number}`, $computation);
      isOperatorPressed = false;
    }
    numberWithCommas(task);
  }

  function addOperators(key) {
    const operator = $(this).text() || key;
    // Cannot use any operator except '-' at the beginning
    if (!isInAction && operator !== '-') return;
    hideMessage($errors);
    if (!isInAction && operator === '-') {
      // In case we want to start with negative number
      task = operator;
      $display.text(operator);
      showMessage(task, $computation);
      isInAction = true;
    } else if (task.endsWith('.') && isNotComplete(task)) {
      // Swap the last '.' in first number with an operator (avoid '123.+', get '123+')
      task = `${task.slice(0, -1)}${operator}`;
      $display.text($display.text().slice(0, -1));
      showMessage(`${task.slice(0, -1)} ${operator} `, $computation);
      isOperatorPressed = true;
      isChained = true;
    } else if (isLastDecimal(task) && task.endsWith('0') && isNotComplete(task)) {
      // Remove trailing zeroes in first decimal number (avoid '1.2300', get '1.23')
      task = `${prettify(task)}${operator}`;
      $display.text(task.slice(0, -1));
      showMessage(`${$display.text()} ${operator} `, $computation);
      isOperatorPressed = true;
      isChained = true;
    } else if (isLastOperator(task) && task.length !== 1) {
      // Swap the last operator for a new one except it is '-' at the beginning
      task = `${task.slice(0, -1)}${operator}`;
      showMessage(`${task.slice(0, -1)} ${operator} `, $computation);
    } else if (!isChained && task !== '-') {
      // The very first operation, after which we need to use chaining
      task += operator;
      showMessage(`${$computation.text()} ${operator} `, $computation);
      isOperatorPressed = true;
      isChained = true;
    } else if (isChained) {
      // If we chaining operations we need to compute and
      // show result everytime after an operator was pressed
      getResult(task);
      // If task returns empty do not execute the function
      if (task === '') return;
      task += operator;
      showMessage(`${task.slice(0, -1)} ${operator} `, $computation);
      isOperatorPressed = true;
      isResultShown = false;
    }
  }

  function handleKeyboard(e) {
    // Handle backslash key
    if (e.keyCode === 220) return;
    const key = $allButtons.filter(`[data-key~="${e.key}"]`).get(0);
    // If we cannot find value of the key which is
    // used in our calculator do not execute the function
    if (!key) return;
    const keyType = key.classList[0];
    switch (keyType) {
      case 'number':
        addNumbers($(key).text());
        break;
      case 'operator':
        addOperators($(key).text());
        break;
      case 'decimal':
        addDecimal();
        break;
      case 'equals':
        getResult();
        break;
      case 'backspace':
        backspace();
        break;
      case 'clear':
        clearAll();
        break;
    }
  }

  $(window).on('keydown', styleOnPress);
  $(window).on('keydown', handleKeyboard);
  $allButtons.on('click', styleOnClick);
  $allButtons.on('transitionend', removeTransition);
  $backspace.on('click', backspace);
  $clearAll.on('click', clearAll);
  $equalsSign.on('click', getResult);
  $decimal.on('click', addDecimal)
  $numbers.on('click', addNumbers);
  $operators.on('click', addOperators);

});