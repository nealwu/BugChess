/* globals console, alert, Timer, $, ChessEngine, Raphael, STARTING_BOARD, io, fixPrototypes, makeLinks */

var MAX_CHATS = 15;

var BOARD_SIZE = 8;
var SQUARE_PIXELS = 0;

if (navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('iPad') !== -1) {
  SQUARE_PIXELS = 45;
} else {
  if ($(window).width() >= 1360) {
    SQUARE_PIXELS = 60;
  } else if ($(window).width() >= 1200) {
    SQUARE_PIXELS = 48;
  } else {
    SQUARE_PIXELS = 36;
  }
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
var BANK_FONT_SIZE = 20;

var LIGHT_COLOR = '#f0d9b5';
var DARK_COLOR = '#b58863';

var FROM_COLOR = '#9cf';
var TO_COLOR = '#28d';

var SIT_BUTTON_TEXT = 'Sit here!';

var shouldRotateBoards = false;
var alertedOutOfTime = false;

// Game state variables
var socket = null;
var boards = [];
var username = '';
var checkmated = false;

function assert(result, description) {
  if (!result) {
    console.log(description);
    alert(description);
  }
}

function stopTimers() {
  window.clearInterval(boards[0].timerInterval);
  window.clearInterval(boards[1].timerInterval);
}

function getGameID() {
  return parseInt(document.URL.match(/\/game\/([0-9]+)/)[1]);
}

function displayBoards() {
  boards[0].getBoardFromEngine();
  boards[1].getBoardFromEngine();

  var testCheckmate = function() {
    if (!checkmated && boards[0].engine.isCheckmate()) {
      checkmated = true;
      stopTimers();
      socket.emit('game_over', getGameID());
      $('#game-status0_' + boards[0].engine.getTurn()).text('Checkmate!');
    }

    if (!checkmated && boards[1].engine.isCheckmate()) {
      checkmated = true;
      stopTimers();
      socket.emit('game_over', getGameID());
      $('#game-status1_' + boards[1].engine.getTurn()).text('Checkmate!');
    }
  };

  // Hack; raphael's image function doesn't have callback
  window.setTimeout(testCheckmate);
  window.setTimeout(testCheckmate, 500);
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

DisplayTimer.prototype.displayOutOfTimeIfNeeded = function() {
  if (this.outOfTime()) {
    if (!alertedOutOfTime) {
      // Extract the last three characters out of 'timer0_W'
      var player = this.id.substring(5);
      $('#game-status' + player).text('Out of time!');
      alertedOutOfTime = true;
    }
  }
}

DisplayTimer.prototype.updateTime = function() {
  if (boards[0].engine.isFinished() || boards[1].engine.isFinished()) {
    this.displayOutOfTimeIfNeeded();
    return;
  }

  Timer.prototype.updateTime.call(this, true);
  this.display();

  if (this.outOfTime()) {
    stopTimers();
    this.displayOutOfTimeIfNeeded();
    socket.emit('game_over', getGameID());
  }
};

// Class for chess boards. number is the index of the board (0 or 1).
function ChessBoard(number) {
  this.number = number;
  this.initBoard();
}

ChessBoard.prototype.placePiece = function(name, square) {
  assert(ChessEngine.isValidName(name), 'Invalid name given to ChessBoard.placePiece: ' + name);
  assert(ChessEngine.isValidSquare(square), 'Invalid square given to ChessBoard.placePiece: ' + square);

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

ChessBoard.prototype.setBank = function(player, bankArray) {
  assert(ChessEngine.isValidPlayer(player), 'Invalid player given to ChessBoard.setBank: ' + player);
  var bankY = player === this.bottomPlayer ? BOARD_HEIGHT - BANK_PIXELS : 0;

  // Clear the old images
  this.bankImages[player].forEach(function(image) {
    image.remove();
  });

  this.bankImages[player] = [];

  for (var i = 0; i < bankArray.length; i++) {
    var piece = bankArray[i];
    var name = player + piece;
    var x = PIECE_PIXELS * i + PIECE_OFFSET;
    var y = bankY + PIECE_OFFSET;
    var image = this.raphael.image('/images/pieces/' + name + '.svg', x, y, PIECE_PIXELS, PIECE_PIXELS);
    image.data('name', name);
    image.drag(ChessBoard.bankMove, ChessBoard.bankStart, ChessBoard.bankEnd);
    this.bankImages[player].push(image);
  }
}

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

  this.bankImages = {};
  this.bankImages[WHITE] = [];
  this.bankImages[BLACK] = [];

  this.engine = new ChessEngine();
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
    self.timers[self.engine.turn].updateTime();
  }, DisplayTimer.INTERVAL);
};

ChessBoard.prototype.getBoardFromEngine = function() {
  var self = this;

  // For each square, check the current piece and the engine piece and see if they're different
  ChessEngine.allSquares().forEach(function(square) {
    var piece = self.pieceAtSquare[square];
    var name = piece ? piece.data('name') : EMPTY2;
    var engineName = self.engine.getPieceAtSquare(square).name;

    if (name !== engineName) {
      if (name !== EMPTY2) {
        piece.remove();
        self.pieceAtSquare[square] = null;
      }

      if (engineName !== EMPTY2) {
        self.placePiece(engineName, square);
      }
    }
  });

  [WHITE, BLACK].forEach(function(player) {
    var bankArray = [];

    BANK_ORDER.forEach(function(piece) {
      for (var i = 0; i < self.engine.bank[player][piece]; i++) {
        bankArray.push(piece);
      }
    });

    self.setBank(player, bankArray);
  });

  this.defaultSquareColors();

  // Highlight most recent move
  if (this.engine.lastMove !== '') {
    var squares = this.engine.fromAndToSquares(this.engine.lastMove);
    var coords = this.squareToCoordinates(squares[0]);
    this.boardSquares[coords[0]][coords[1]].attr('fill', FROM_COLOR);
    coords = this.squareToCoordinates(squares[1]);
    this.boardSquares[coords[0]][coords[1]].attr('fill', TO_COLOR);
  }

  [WHITE, BLACK].forEach(function(player) {
    self.timers[player].getFromTimer(self.engine.timers[player]);

    if (self.engine.turn === player && !self.engine.firstMove) {
      self.timers[player].updateTime();
    }
  });

  if (!this.engine.firstMove && !this.engine.isFinished()) {
    this.startTimer();
  }
};

// Note: square -- 'a1' to 'h8'; coordinates -- x = 0, y = 0 to x = 7, y = 7
// (0, 0) = 'a8'; (7, 7) = 'h1'
ChessBoard.prototype.squareToCoordinates = function(square, skipAssert) {
  if (!skipAssert) {
    assert(ChessEngine.isValidSquare(square), 'Invalid square given to ChessBoard.squareToCoordinates: ' + square);
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
    assert(ChessEngine.areValidCoordinates(x, y), 'Invalid coordinates given to ChessBoard.coordinatesToSquare: ' + x + ', ' + y);
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

  if ($('#sit0_W').val() === SIT_BUTTON_TEXT || $('#sit0_B').val() === SIT_BUTTON_TEXT ||
      $('#sit1_W').val() === SIT_BUTTON_TEXT || $('#sit1_B').val() === SIT_BUTTON_TEXT) {
    console.log('Not all seats have been taken yet');
    return false;
  }

  if (!this.engine.isLegalMove(move)) {
    return false;
  }

  this.engine.makeMove(move);
  this.lastMove = move;
  displayBoards();

  // Send the move to the server
  var realBoardNumber = shouldRotateBoards ? 1 - this.number : this.number;
  var emitMove = realBoardNumber + '_' + move;
  socket.emit('make_move', getGameID(), emitMove, username);
  console.log('Sent: ' + emitMove);
  return true;
};

ChessBoard.prototype.coordinatesToPixels = function(x, y) {
  assert(ChessEngine.areValidCoordinates(x, y), 'Invalid coordinates given to ChessBoard.coordinatesToPixels: ' + x + ', ' + y);
  return [x * SQUARE_PIXELS, y * SQUARE_PIXELS + BANK_PIXELS];
};

ChessBoard.prototype.squareToPixels = function(square) {
  assert(ChessEngine.isValidSquare(square), 'Invalid square given to ChessBoard.squareToPixels: ' + square);
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

  var centerX = this.attr('x') + PIECE_PIXELS / 2;
  var centerY = this.attr('y') + PIECE_PIXELS / 2;
  var coords = this.paper.chessBoard.pixelsToCoordinates(centerX, centerY);
  this.paper.chessBoard.defaultSquareColors();
  this.paper.chessBoard.boardSquares[coords[0]][coords[1]].attr('fill', FROM_COLOR);

  var square = this.paper.chessBoard.coordinatesToSquare(coords[0], coords[1]);
  var legalMoves = this.paper.chessBoard.engine.legalMoves(false);

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
  var centerX = this.attr('x') + PIECE_PIXELS / 2;
  var centerY = this.attr('y') + PIECE_PIXELS / 2;
  var toSquare = this.paper.chessBoard.pixelsToSquare(centerX, centerY);
  var toCoords = this.paper.chessBoard.pixelsToCoordinates(centerX, centerY);
  var fromSquare = this.data('square');
  var player = this.data('name')[0];
  var move = player + '_' + fromSquare + '-' + toSquare;
  console.log(move);

  // Check for validity
  if (ChessEngine.areValidCoordinates(toCoords[0], toCoords[1]) && this.paper.chessBoard.makeMove(move)) {
    console.log('Legal move!');
  } else {
    // Put back in place
    console.log('Illegal move!');
    var pixelCoords = this.paper.chessBoard.squareToPixels(this.data('square'));
    this.attr('x', pixelCoords[0]);
    this.attr('y', pixelCoords[1]);
    this.paper.chessBoard.getBoardFromEngine();
  }
};

ChessBoard.bankStart = function(x, y, event) {
  this.toFront();
  this.data('originalX', this.attr('x'));
  this.data('originalY', this.attr('y'));
};

ChessBoard.bankMove = function(dx, dy, x, y, event) {
  this.attr('x', this.data('originalX') + dx);
  this.attr('y', this.data('originalY') + dy);
};

ChessBoard.bankEnd = function(event) {
  var name = this.data('name');
  var player = name[0];
  var piece = name[1];

  // Get the coordinates of the piece's center
  var centerX = this.attr('x') + PIECE_PIXELS / 2;
  var centerY = this.attr('y') + PIECE_PIXELS / 2;
  var toSquare = this.paper.chessBoard.pixelsToSquare(centerX, centerY);
  var toCoords = this.paper.chessBoard.pixelsToCoordinates(centerX, centerY);
  var move = player + '_' + piece + toSquare;
  console.log(move);

  // Check for validity
  if (ChessEngine.areValidCoordinates(toCoords[0], toCoords[1]) && this.paper.chessBoard.makeMove(move)) {
    this.remove();
    console.log('Legal move!');
  } else {
    // Put back in place
    this.attr('x', this.data('originalX'));
    this.attr('y', this.data('originalY'));
    console.log('Illegal move!');
  }
};

$(document).ready(function() {
  // Set up socket.io
  socket = io.connect();

  if (username === '') {
    username = $('#username').text();
  }

  socket.on('update', function(engines) {
    if (boards.length === 0) {
      // Create two boards AFTER the socket is connected
      boards = [new ChessBoard(0), new ChessBoard(1)];
    }

    boards[0].engine = engines[0];
    boards[1].engine = engines[1];

    if (shouldRotateBoards) {
      boards[0].engine = engines[1];
      boards[1].engine = engines[0];
    }

    fixPrototypes(boards[0].engine);
    fixPrototypes(boards[1].engine);
    makeLinks(boards[0].engine, boards[1].engine);
    displayBoards();
  });

  $('.sit_button').click(function(event) {
    var position = this.id.substring(this.id.length - 3);

    if (shouldRotateBoards) {
      position = (position[0] === '0' ? '1' : '0') + position.substring(1);
    }

    if ($(this).val() !== SIT_BUTTON_TEXT) {
      return;
    }

    socket.emit('sit', getGameID(), {position: position, name: username});
  });

  $('#rotate').click(function(event) {
    // On the client we will completely rotate everything, but when we communicate with the server we need to check for shouldRotateBoards
    shouldRotateBoards = !shouldRotateBoards;

    // Swap the two engines and re-display the boards
    var temp = boards[0].engine;
    boards[0].engine = boards[1].engine;
    boards[1].engine = temp;
    displayBoards();

    // Swap the sit button contents
    var copy0_W = $('#sit0_W').clone();
    var copy1_W = $('#sit1_W').clone();
    var copy0_B = $('#sit0_B').clone();
    var copy1_B = $('#sit1_B').clone();
    $('#sit0_W').val(copy1_W.val());
    $('#sit1_W').val(copy0_W.val());
    $('#sit0_B').val(copy1_B.val());
    $('#sit1_B').val(copy0_B.val());

    function copyStyle(obj, copyObj) {
      if (copyObj.attr('style')) {
        obj.attr('style', copyObj.attr('style'));
      } else {
        obj.attr('style', '');
      }
    }

    copyStyle($('#sit0_W'), copy1_W);
    copyStyle($('#sit1_W'), copy0_W);
    copyStyle($('#sit0_B'), copy1_B);
    copyStyle($('#sit1_B'), copy0_B);
  });

  socket.on('sit', function(data) {
    var position = data.position;
    var name = data.name;

    if (shouldRotateBoards) {
      position = (position[0] === '0' ? '1' : '0') + position.substring(1);
    }

    $('#sit' + position).val(name).show();

    if (name === username) {
      // This is us
      $('#sit' + position).css('font-weight', 'bold');

      // Hide the sit buttons for the other team: flip the board and then the position
      var otherBoard = position[0] === '0' ? '1' : '0';
      var otherSide = position[2] === 'W' ? 'B' : 'W';
      var button1 = $('#sit' + otherBoard + '_' + position[2]);
      var button2 = $('#sit' + position[0] + '_' + otherSide);

      if (button1.val() === SIT_BUTTON_TEXT) {
        button1.hide();
      }

      if (button2.val() === SIT_BUTTON_TEXT) {
        button2.hide();
      }
    }
  });

  $('#chat').keypress(function(event) {
    if (event.which === 13) {
      socket.emit('chat', getGameID(), username, $('#chat').val());
      $('#chat').val('');
    }
  });

  socket.on('chat', function(name, date, message) {
    function hourAMPM(hour) {
      var ampm = hour < 12 ? 'am' : 'pm';
      return [(hour + 11) % 12 + 1, ampm];
    }

    function padOnce(number) {
      return parseInt(number) < 10 ? '0' + number : number;
    }

    var dateObj = new Date(date);
    var h = hourAMPM(dateObj.getHours());
    var time = h[0] + ':' + padOnce(dateObj.getMinutes()) + ':' + padOnce(dateObj.getSeconds()) + ' ' + h[1];

    $('#chats').append($('<p class="chat">').html('[' + time + '] <strong>' + name + '</strong>: ' + message));

    var chatsChildren = $('#chats').children();

    if (chatsChildren.length > MAX_CHATS) {
      chatsChildren[0].remove();
    }
  });

  socket.emit('connect_to_game', getGameID());
});
