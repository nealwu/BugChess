/* globals console, alert, Timer, $, ChessValidator, Raphael, STARTING_BOARD, io, fixPrototypes, makeLinks */

var MAX_CHATS = 15;

var BOARD_SIZE = 8;
var SQUARE_PIXELS;

if (navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('iPad') !== -1) {
  SQUARE_PIXELS = 45;
} else {
  SQUARE_PIXELS = 36;
}

var PIECE_OFFSET = 0;
var PIECE_PIXELS = SQUARE_PIXELS - 2 * PIECE_OFFSET;
var BANK_PIXELS = SQUARE_PIXELS;
var BANK_HORIZ_BUFFER = 8;
var BOARD_WIDTH = BOARD_SIZE * SQUARE_PIXELS;
var BOARD_HEIGHT = BOARD_SIZE * SQUARE_PIXELS + 2 * BANK_PIXELS;

var WHITE = 'W';
var BLACK = 'B';

var PAWN = 'P';
var KNIGHT = 'N';
var BISHOP = 'B';
var ROOK = 'R';
var QUEEN = 'Q';
var KING = 'K';
var EMPTY = '.';
var EMPTY2 = EMPTY + EMPTY;

var BANK_ORDER = [QUEEN, ROOK, BISHOP, KNIGHT, PAWN];
var BANK_FONT_SIZE = 24;

var LIGHT_COLOR = '#f0d9b5';
var DARK_COLOR = '#b58863';

var FROM_COLOR = '#9cf';
var TO_COLOR = '#28d';

var shouldRotateBoards = false;

function assert(result, description) {
  if (!result) {
    console.log(description);
    alert(description);
  }
}

function DisplayTimer(initial, id) {
  Timer.call(this, initial);
  this.id = id;
}

DisplayTimer.prototype = new Timer();
DisplayTimer.prototype.constructor = DisplayTimer;

DisplayTimer.INITIAL_MINUTES = Timer.INITIAL_MINUTES;
DisplayTimer.INITIAL_MILLISECONDS = Timer.INITIAL_MILLISECONDS;
DisplayTimer.INTERVAL = 100;

DisplayTimer.prototype.display = function() {
  $('#' + this.id).html(this.toString());

  if (this.outOfTime()) {
    $('#' + this.id).css('color', 'red');
  }
};

DisplayTimer.prototype.getFromTimer = function(timer) {
  this.minutes = timer.minutes;
  this.seconds = timer.seconds;
  this.milliseconds = timer.milliseconds;
  this.startTime = timer.startTime;
  this.display();
};

DisplayTimer.prototype.updateTime = function() {
  Timer.prototype.updateTime.call(this);
  this.display();

  if (this.outOfTime()) {
    socket.emit('game_over');
    stopTimers();
  }
};

// Class for chess boards. number is the index of the board (0 or 1).
function ChessBoard(number) {
  this.number = number;
  this.initBoard();
}

ChessBoard.prototype.placePiece = function(name, square) {
  assert(ChessValidator.isValidName(name), 'Invalid name given to ChessBoard.placePiece: ' + name);
  assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessBoard.placePiece: ' + square);

  if (this.pieceAtSquare[square]) {
    this.pieceAtSquare[square].remove();
  }

  var coords = this.squareToCoordinates(square);
  var piece = this.raphael.image('/images/pieces/' + name + '.svg',
  coords[0] * SQUARE_PIXELS + PIECE_OFFSET, BANK_PIXELS + coords[1] * SQUARE_PIXELS + PIECE_OFFSET, PIECE_PIXELS, PIECE_PIXELS);
  piece.data('name', name);
  piece.data('square', square);
  piece.drag(ChessBoard.pieceMove, ChessBoard.pieceStart, ChessBoard.pieceEnd);
  this.pieceAtSquare[square] = piece;
  return piece;
};

// placeBank actually places a new image
ChessBoard.prototype.placeBank = function(player, bankIndex, count) {
  assert(ChessValidator.isValidPlayer(player), 'Invalid player given to ChessBoard.placeBank: ' + player);
  assert(0 <= bankIndex && bankIndex < BANK_ORDER.length, 'Invalid bankIndex given to ChessBoard.placeBank: ' + bankIndex);
  count = count === undefined ? 0 : count;

  var bankY = player === this.bottomPlayer ? BOARD_HEIGHT - BANK_PIXELS : 0;
  var piece = BANK_ORDER[bankIndex];
  var name = player + piece;

  if (this.bank[player][piece] !== undefined) {
    // Remove the text previously associated with the piece
    this.bank[player][piece][1].remove();
  }

  var x = BOARD_WIDTH * bankIndex / BANK_ORDER.length + PIECE_OFFSET;
  var y = bankY + PIECE_OFFSET;

  var image = this.raphael.image('/images/pieces/' + name + '.svg', x, y, PIECE_PIXELS, PIECE_PIXELS);
  image.data('name', name);
  image.data('bankIndex', bankIndex);
  image.drag(ChessBoard.bankMove, ChessBoard.bankStart, ChessBoard.bankEnd);

  var text = this.raphael.text(x + PIECE_PIXELS + BANK_HORIZ_BUFFER, y + PIECE_PIXELS / 2, ': ' + count).attr('font-size', BANK_FONT_SIZE);
  this.bank[player][piece] = [image, text, count];

  if (count > 0) {
    text.attr('fill', 'green').attr('font-weight', 'bold');
  }

  return image;
};

// changeBank just modifies the text and number
ChessBoard.prototype.changeBank = function(player, piece, count) {
  assert(ChessValidator.isValidPlayer(player), 'Invalid player given to ChessBoard.changeBank: ' + player);
  assert(ChessValidator.isValidPiece(piece), 'Invalid piece given to ChessBoard.changeBank: ' + piece);
  assert(count >= 0, 'Invalid count given to ChessBoard.changeBank: ' + count);
  assert(this.bank[player][piece] !== undefined, 'ChessBoard.changeBank called before bank was initialized');

  var text = this.bank[player][piece][1];
  var textX = text.attr('x'), textY = text.attr('y');
  text.remove();
  text = this.raphael.text(textX, textY, ': ' + count).attr('font-size', BANK_FONT_SIZE);
  this.bank[player][piece][1] = text;
  this.bank[player][piece][2] = count;

  // TODO: make this do bold instead; also learn how to reset the text of the text object without replacing the whole object
  if (count > 0) {
    text.attr('fill', 'green').attr('font-weight', 'bold');
  }
};

ChessBoard.prototype.defaultSquareColors = function() {
  for (var x = 0; x < BOARD_SIZE; x++) {
    for (var y = 0; y < BOARD_SIZE; y++) {
      // Choose between light brown and dark brown
      var squareColor = (x + y) % 2 === 0 ? LIGHT_COLOR : DARK_COLOR;
      this.boardSquares[x][y].attr('fill', squareColor);
    }
  }
};

ChessBoard.prototype.initBoard = function() {
  this.unrotatedNumber = this.number;
  this.bottomPlayer = this.number === 0 ? WHITE : BLACK;

  this.raphael = new Raphael('board' + this.number, BOARD_WIDTH, BOARD_HEIGHT);
  this.raphael.chessBoard = this;

  this.boardSquares = [];

  for (var x = 0; x < BOARD_SIZE; x++) {
    this.boardSquares[x] = [];
    for (var y = 0; y < BOARD_SIZE; y++) {
      this.boardSquares[x][y] = this.raphael.rect(x * SQUARE_PIXELS, BANK_PIXELS + y * SQUARE_PIXELS, SQUARE_PIXELS, SQUARE_PIXELS)
      .attr('stroke-width', 0);
    }
  }

  this.defaultSquareColors();

  // Place pieces
  this.pieceAtSquare = {};

  for (var square in STARTING_BOARD) {
    var name = STARTING_BOARD[square];
    this.placePiece(name, square);
  }

  // Set up the two banks
  var bankColor = '#ccc';
  this.raphael.rect(0, 0, BOARD_WIDTH, BANK_PIXELS).attr('fill', bankColor);
  this.raphael.rect(0, BOARD_HEIGHT - BANK_PIXELS, BOARD_WIDTH, BANK_PIXELS).attr('fill', bankColor);

  this.bank = {};
  this.bank[WHITE] = {};
  this.bank[BLACK] = {};

  for (var i in BANK_ORDER) {
    this.placeBank(WHITE, i);
    this.placeBank(BLACK, i);
  }

  this.validator = new ChessValidator();
  this.timers = {};
  this.timers[WHITE] = new DisplayTimer(DisplayTimer.INITIAL_MILLISECONDS, 'timer' + this.number + '_' + WHITE);
  this.timers[BLACK] = new DisplayTimer(DisplayTimer.INITIAL_MILLISECONDS, 'timer' + this.number + '_' + BLACK);
};

ChessBoard.prototype.startTimer = function() {
  if (this.timerInterval) {
    window.clearInterval(this.timerInterval);
  }

  var self = this;

  this.timerInterval = window.setInterval(function() {
    self.timers[self.validator.turn].updateTime();
  }, DisplayTimer.INTERVAL);
};

ChessBoard.prototype.getBoardFromValidator = function() {
  var self = this;

  // For each square, check the current piece and the validator piece and see if they're different
  ChessValidator.allSquares().forEach(function(square) {
    var piece = self.pieceAtSquare[square];
    var name = piece ? piece.data('name') : EMPTY2;
    var validatorName = self.validator.getPieceAtSquare(square).name;

    if (name !== validatorName) {
      if (name !== EMPTY2) {
        piece.remove();
        self.pieceAtSquare[square] = null;
      }

      if (validatorName !== EMPTY2) {
        self.placePiece(validatorName, square);
      }
    }
  });

  [WHITE, BLACK].forEach(function(player) {
    BANK_ORDER.forEach(function(piece) {
      self.changeBank(player, piece, self.validator.bank[player][piece]);
    });
  });

  this.defaultSquareColors();

  // Highlight most recent move
  if (this.validator.lastMove !== '') {
    var squares = this.validator.fromAndToSquares(this.validator.lastMove);
    var coords = this.squareToCoordinates(squares[0]);
    this.boardSquares[coords[0]][coords[1]].attr('fill', FROM_COLOR);
    coords = this.squareToCoordinates(squares[1]);
    this.boardSquares[coords[0]][coords[1]].attr('fill', TO_COLOR);
  }

  [WHITE, BLACK].forEach(function(player) {
    self.timers[player].getFromTimer(self.validator.timers[player]);

    if (self.validator.turn === player && !self.validator.firstMove) {
      self.timers[player].updateTime();
    }
  });

  if (!this.validator.firstMove) {
    this.startTimer();
  }
};

// Note: square -- 'a1' to 'h8'; coordinates -- x = 0, y = 0 to x = 7, y = 7
// (0, 0) = 'a8'; (7, 7) = 'h1'
ChessBoard.prototype.squareToCoordinates = function(square, skipAssert) {
  if (!skipAssert) {
    assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessBoard.squareToCoordinates: ' + square);
  }

  var x = square.charCodeAt(0) - 'a'.charCodeAt(0);
  var y = '8'.charCodeAt(0) - square.charCodeAt(1);

  // If the bottom player is black, flip the coordinates
  if (this.bottomPlayer === WHITE) {
    return [x, y];
  } else {
    return [BOARD_SIZE - 1 - x, BOARD_SIZE - 1 - y];
  }
};

ChessBoard.prototype.coordinatesToSquare = function(x, y, skipAssert) {
  if (!skipAssert) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessBoard.coordinatesToSquare: ' + x + ', ' + y);
  }

  // If the bottom player is black, flip the coordinates
  if (this.bottomPlayer === WHITE) {
    return String.fromCharCode(x + 'a'.charCodeAt(0), '8'.charCodeAt(0) - y);
  } else {
    return String.fromCharCode('h'.charCodeAt(0) - x, y + '1'.charCodeAt(0));
  }
};

ChessBoard.prototype.makeMove = function(move) {
  var seat = this.number + '_' + move[0];

  if ($('#sit' + seat).val() !== username) {
    console.log('You do not have permission to move this piece');
    return false;
  }

  if ($('#sit0_W').val() === 'Sit!' || $('#sit0_B').val() === 'Sit!' || $('#sit1_W').val() === 'Sit!' || $('#sit1_B').val() === 'Sit!') {
    console.log('Not all seats have been taken yet');
    return false;
  }

  if (!this.validator.isLegalMove(move)) {
    return false;
  }

  this.validator.makeMove(move);
  this.lastMove = move;
  displayBoards();

  // Send the move to the server
  var emitMove = this.unrotatedNumber + '_' + move;
  socket.emit('make_move', getGameID(), emitMove, username);
  console.log('Sent: ' + emitMove);
  return true;
};

ChessBoard.prototype.coordinatesToPixels = function(x, y) {
  assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessBoard.coordinatesToPixels: ' + x + ', ' + y);
  return [x * SQUARE_PIXELS, y * SQUARE_PIXELS + BANK_PIXELS];
};

ChessBoard.prototype.squareToPixels = function(square) {
  assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessBoard.squareToPixels: ' + square);
  var coords = this.squareToCoordinates(square);
  return this.coordinatesToPixels(coords[0], coords[1]);
};

ChessBoard.prototype.pixelsToCoordinates = function(x, y) {
  var squareX = Math.floor(x / SQUARE_PIXELS);
  var squareY = Math.floor((y - BANK_PIXELS) / SQUARE_PIXELS);
  return [squareX, squareY];
};

ChessBoard.prototype.pixelsToSquare = function(x, y) {
  var coords = this.pixelsToCoordinates(x, y);
  return this.coordinatesToSquare(coords[0], coords[1], true);
};

ChessBoard.pieceStart = function(x, y, event) {
  this.toFront();

  this.data('originalX', this.attr('x'));
  this.data('originalY', this.attr('y'));

  var centerX = this.attr('x') + PIECE_PIXELS / 2, centerY = this.attr('y') + PIECE_PIXELS / 2;
  var coords = this.paper.chessBoard.pixelsToCoordinates(centerX, centerY);
  this.paper.chessBoard.defaultSquareColors();
  this.paper.chessBoard.boardSquares[coords[0]][coords[1]].attr('fill', FROM_COLOR);

  var square = this.paper.chessBoard.coordinatesToSquare(coords[0], coords[1]);
  var legalMoves = this.paper.chessBoard.validator.legalMoves(false);

  for (var i in legalMoves) {
    var move = legalMoves[i];

    if (move.substring(2, 4) === square) {
      var toSquare = move.substring(5, 7);
      var toCoords = this.paper.chessBoard.squareToCoordinates(toSquare);
      this.paper.chessBoard.boardSquares[toCoords[0]][toCoords[1]].attr('fill', TO_COLOR);
    }
  }
};

ChessBoard.pieceMove = function(dx, dy, x, y, event) {
  this.attr('x', this.data('originalX') + dx);
  this.attr('y', this.data('originalY') + dy);
};

ChessBoard.pieceEnd = function(event) {
  // Get the coordinates of the piece's center
  var centerX = this.attr('x') + PIECE_PIXELS / 2, centerY = this.attr('y') + PIECE_PIXELS / 2;
  var toSquare = this.paper.chessBoard.pixelsToSquare(centerX, centerY);
  var toCoords = this.paper.chessBoard.pixelsToCoordinates(centerX, centerY);
  var fromSquare = this.data('square');
  var player = this.data('name')[0];
  var move = player + '_' + fromSquare + '-' + toSquare;
  console.log(move);

  // Check for validity
  if (ChessValidator.areValidCoordinates(toCoords[0], toCoords[1]) && this.paper.chessBoard.makeMove(move)) {
    console.log('Legal move!');
  } else {
    // Put back in place
    console.log('Illegal move!');
    var pixelCoords = this.paper.chessBoard.squareToPixels(this.data('square'));
    this.attr('x', pixelCoords[0]);
    this.attr('y', pixelCoords[1]);
    this.paper.chessBoard.getBoardFromValidator();
  }
};

ChessBoard.bankStart = function(x, y, event) {
  this.toFront();

  var name = this.data('name');
  var player = name[0];
  var piece = name[1];
  var count = this.paper.chessBoard.bank[player][piece][2];

  // Create a copy, even if count === 0.
  var bankIndex = this.data('bankIndex');
  this.paper.chessBoard.placeBank(player, bankIndex, count);
  this.data('originalX', this.attr('x'));
  this.data('originalY', this.attr('y'));
};

ChessBoard.bankMove = function(dx, dy, x, y, event) {
  var name = this.data('name');
  var player = name[0];
  var piece = name[1];
  var count = this.paper.chessBoard.bank[player][piece][2];

  // Don't let the piece move if count === 0.
  if (count > 0) {
    this.attr('x', this.data('originalX') + dx);
    this.attr('y', this.data('originalY') + dy);
  }
};

ChessBoard.bankEnd = function(event) {
  var name = this.data('name');
  var player = name[0];
  var piece = name[1];
  var count = this.paper.chessBoard.bank[player][piece][2];

  // Get the coordinates of the piece's center
  var centerX = this.attr('x') + PIECE_PIXELS / 2, centerY = this.attr('y') + PIECE_PIXELS / 2;
  var toSquare = this.paper.chessBoard.pixelsToSquare(centerX, centerY);
  var toCoords = this.paper.chessBoard.pixelsToCoordinates(centerX, centerY);
  var move = player + '_' + piece + toSquare;
  console.log(move);

  // Check for validity
  if (count > 0 && ChessValidator.areValidCoordinates(toCoords[0], toCoords[1]) && this.paper.chessBoard.makeMove(move)) {
    console.log('Legal move!');
  } else {
    // Put back in place
    console.log('Illegal move!');
  }

  this.remove();
};

var checkmated = false;

function displayBoards() {
  boards[0].getBoardFromValidator();
  boards[1].getBoardFromValidator();

  // Hack; raphael's image function doesn't have callback
  window.setTimeout(function() {
    if (!checkmated && boards[0].validator.isCheckmate()) {
      alert('Checkmate on left board!');
      checkmated = true;
    }

    if (!checkmated && boards[1].validator.isCheckmate()) {
      alert('Checkmate on right board!');
      checkmated = true;
    }
  }, 1000);
}

function stopTimers() {
  window.clearInterval(boards[0].timerInterval);
  window.clearInterval(boards[1].timerInterval);
}

function getGameID() {
  return parseInt(document.URL.substring(document.URL.lastIndexOf('/') + 1));
}

var socket, boards = [], seat_to_socket = {}, username = '';

$(document).ready(function() {
  // Set up socket.io
  socket = io.connect();

  if (username === '') {
    // name = prompt('What is your name?');
    username = $('#username').text();
  }

  socket.on('update', function(validators) {
    if (boards.length === 0) {
      // Create two boards AFTER the socket is connected
      boards = [new ChessBoard(0), new ChessBoard(1)];
    }

    boards[0].validator = validators[0];
    boards[1].validator = validators[1];

    if (shouldRotateBoards) {
      boards[0].validator = validators[1];
      boards[1].validator = validators[0];
    }

    fixPrototypes(boards[0].validator);
    fixPrototypes(boards[1].validator);
    makeLinks(boards[0].validator, boards[1].validator);
    displayBoards();
  });

  socket.emit('start_game', getGameID());

  $('.sit_button').click(function(event) {
    var position = this.id.substring(this.id.length - 3);

    if (shouldRotateBoards) {
      position[0] = position[0] === '0' ? '1' : '0';
    }

    if (username === '') {
      // name = prompt('What is your name?');
      username = $('#username').text();
    }

    socket.emit('sit', getGameID(), {position: position, name: username});
  });

  $('#rotate').click(function(event) {
    shouldRotateBoards = !shouldRotateBoards;

    // Swap the two validators and unrotatedNumber's and re-display the boards
    var temp = boards[0].validator;
    boards[0].validator = boards[1].validator;
    boards[1].validator = temp;

    temp = boards[0].unrotatedNumber;
    boards[0].unrotatedNumber = boards[1].unrotatedNumber;
    boards[1].unrotatedNumber = temp;

    displayBoards();

    // Swap the sitting names
    temp = $('#sit0_W').val();
    $('#sit0_W').val($('#sit1_W').val());
    $('#sit1_W').val(temp);

    temp = $('#sit0_B').val();
    $('#sit0_B').val($('#sit1_B').val());
    $('#sit1_B').val(temp);
  });

  socket.on('sit', function(data) {
    var socketID = data.socketID;
    var position = data.position;
    var name = data.name;

    $('#sit' + position).val(name);
    seat_to_socket[position] = socketID;

    if (socketID === socket.id) {
      $('#sit' + position).css('font-weight', 'bold');
    }
  });

  $('#chat').keypress(function(event) {
    if (event.which === 13) {
      socket.emit('chat', getGameID(), $('#username').text(), $('#chat').val());
      $('#chat').val('');
    }
  });

  function hourAMPM(hour) {
    var ampm = hour < 12 ? 'am' : 'pm';
    return [(hour + 11) % 12 + 1, ampm];
  }

  function padOnce(number) {
    return parseInt(number) < 10 ? '0' + number : number;
  }

  socket.on('chat', function(username, message) {
    var date = new Date();
    var h = hourAMPM(date.getHours());
    var time = h[0] + ':' + padOnce(date.getMinutes()) + ':' + padOnce(date.getSeconds()) + ' ' + h[1];

    $('#chats').append($('<p class="chat">').html('[' + time + '] <strong>' + username + '</strong>: ' + message));

    var chatsChildren = $('#chats').children();

    if (chatsChildren.length > MAX_CHATS) {
      chatsChildren[0].remove();
    }
  });
});
