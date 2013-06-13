BOARD_SIZE = 8;

if (navigator.userAgent.indexOf('iPhone') != -1 || navigator.userAgent.indexOf('iPad') != -1) {
    SQUARE_PIXELS = 45;
} else {
    SQUARE_PIXELS = 60;
}

PIECE_OFFSET = 0;
PIECE_PIXELS = SQUARE_PIXELS - 2 * PIECE_OFFSET;
BANK_PIXELS = SQUARE_PIXELS;
BANK_HORIZ_BUFFER = 8;
BOARD_WIDTH = BOARD_SIZE * SQUARE_PIXELS;
BOARD_HEIGHT = BOARD_SIZE * SQUARE_PIXELS + 2 * BANK_PIXELS;

WHITE = 'W';
BLACK = 'B';

PAWN = 'P';
KNIGHT = 'N';
BISHOP = 'B';
ROOK = 'R';
QUEEN = 'Q';
KING = 'K';
EMPTY = '.';
EMPTY2 = EMPTY + EMPTY;

BANK_ORDER = [QUEEN, ROOK, BISHOP, KNIGHT, PAWN];
BANK_FONT_SIZE = 24;

LIGHT_COLOR = '#f0d9b5';
DARK_COLOR = '#b58863';

FROM_COLOR = '#9cf';
TO_COLOR = '#28d';

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
}

DisplayTimer.prototype.getFromTimer = function(timer) {
    this.minutes = timer.minutes;
    this.seconds = timer.seconds;
    this.milliseconds = timer.milliseconds;
    this.startTime = timer.startTime;
    this.display();
}

DisplayTimer.prototype.updateTime = function() {
    Timer.prototype.updateTime.call(this);
    this.display();

    if (this.outOfTime()) {
        socket.emit('game_over');
        stopTimers();
    }
}

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
}

// placeBank actually places a new image
ChessBoard.prototype.placeBank = function(player, bankIndex, count) {
    assert(ChessValidator.isValidPlayer(player), 'Invalid player given to ChessBoard.placeBank: ' + player);
    assert(0 <= bankIndex && bankIndex < BANK_ORDER.length, 'Invalid bankIndex given to ChessBoard.placeBank: ' + bankIndex);
    count = count === undefined ? 0 : count;

    var bankY = player == this.bottomPlayer ? BOARD_HEIGHT - BANK_PIXELS : 0;
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
        text.attr('fill', 'red').attr('font-weight', 'bold');
    }

    return image;
}

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
        text.attr('fill', 'red').attr('font-weight', 'bold');
    }
}

ChessBoard.prototype.defaultSquareColors = function() {
    for (var x = 0; x < BOARD_SIZE; x++) {
        for (var y = 0; y < BOARD_SIZE; y++) {
            // Choose between light brown and dark brown
            var squareColor = (x + y) % 2 == 0 ? LIGHT_COLOR : DARK_COLOR;
            this.boardSquares[x][y].attr('fill', squareColor);
        }
    }
}

ChessBoard.prototype.initBoard = function() {
    this.bottomPlayer = this.number == 0 ? WHITE : BLACK;

    this.raphael = Raphael('board' + this.number, BOARD_WIDTH, BOARD_HEIGHT);
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

    for (square in STARTING_BOARD) {
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

    for (i in BANK_ORDER) {
        this.placeBank(WHITE, i);
        this.placeBank(BLACK, i);
    }

    this.validator = new ChessValidator();
    this.timers = {};
    this.timers[WHITE] = new DisplayTimer(DisplayTimer.INITIAL_MILLISECONDS, 'timer' + this.number + '_' + WHITE);
    this.timers[BLACK] = new DisplayTimer(DisplayTimer.INITIAL_MILLISECONDS, 'timer' + this.number + '_' + BLACK);
}

ChessBoard.prototype.startTimer = function(startTime) {
    if (this.timerInterval) {
        clearInterval(this.timerInterval);
    }

    var self = this;

    this.timerInterval = setInterval(function() {
        self.timers[self.validator.turn].updateTime();
    }, DisplayTimer.INTERVAL);
}

ChessBoard.prototype.getBoardFromValidator = function() {
    var self = this;

    // For each square, check the current piece and the validator piece and see if they're different
    ChessValidator.allSquares().forEach(function(square) {
        var piece = self.pieceAtSquare[square];
        var name = piece ? piece.data('name') : EMPTY2;
        var validatorName = self.validator.getPieceAtSquare(square).name;

        if (name != validatorName) {
            if (name != EMPTY2) {
                piece.remove();
                self.pieceAtSquare[square] = null;
            }

            if (validatorName != EMPTY2) {
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
    if (this.validator.lastMove != '') {
        var squares = this.validator.fromAndToSquares(this.validator.lastMove);
        var coords = this.squareToCoordinates(squares[0]);
        this.boardSquares[coords[0]][coords[1]].attr('fill', FROM_COLOR);
        coords = this.squareToCoordinates(squares[1]);
        this.boardSquares[coords[0]][coords[1]].attr('fill', TO_COLOR);
    }

    [WHITE, BLACK].forEach(function(player) {
        self.timers[player].getFromTimer(self.validator.timers[player]);

        if (self.validator.turn == player && !self.validator.firstMove) {
            self.timers[player].updateTime();
        }
    });

    if (!this.validator.firstMove) {
        this.startTimer();
    }
}

// Note: square -- 'a1' to 'h8'; coordinates -- x = 0, y = 0 to x = 7, y = 7
// (0, 0) = 'a8'; (7, 7) = 'h1'
ChessBoard.prototype.squareToCoordinates = function(square, skipAssert) {
    if (!skipAssert) {
        assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessBoard.squareToCoordinates: ' + square);
    }

    var x = square.charCodeAt(0) - 'a'.charCodeAt(0);
    var y = '8'.charCodeAt(0) - square.charCodeAt(1);

    // If the bottom player is black, flip the coordinates
    if (this.bottomPlayer == WHITE) {
        return [x, y];
    } else {
        return [BOARD_SIZE - 1 - x, BOARD_SIZE - 1 - y];
    }
}

ChessBoard.prototype.coordinatesToSquare = function(x, y, skipAssert) {
    if (!skipAssert) {
        assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessBoard.coordinatesToSquare: ' + x + ', ' + y);
    }

    // If the bottom player is black, flip the coordinates
    if (this.bottomPlayer == WHITE) {
        return String.fromCharCode(x + 'a'.charCodeAt(0), '8'.charCodeAt(0) - y);
    } else {
        return String.fromCharCode('h'.charCodeAt(0) - x, y + '1'.charCodeAt(0));
    }
}

ChessBoard.prototype.makeMove = function(move) {
    if (!this.validator.isLegalMove(move)) {
        return false;
    }

    this.validator.makeMove(move);
    this.lastMove = move;
    displayBoards();

    // Send the move to the server
    var emitMove = this.number + '_' + move;
    socket.emit('make_move', emitMove);
    console.log('Sent: ' + emitMove);
    return true;
}

ChessBoard.prototype.coordinatesToPixels = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessBoard.coordinatesToPixels: ' + x + ', ' + y);
    return [x * SQUARE_PIXELS, y * SQUARE_PIXELS + BANK_PIXELS];
}

ChessBoard.prototype.squareToPixels = function(square) {
    assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessBoard.squareToPixels: ' + square);
    var coords = this.squareToCoordinates(square);
    return this.coordinatesToPixels(coords[0], coords[1]);
}

ChessBoard.prototype.pixelsToCoordinates = function(x, y) {
    var squareX = Math.floor(x / SQUARE_PIXELS);
    var squareY = Math.floor((y - BANK_PIXELS) / SQUARE_PIXELS);
    return [squareX, squareY];
}

ChessBoard.prototype.pixelsToSquare = function(x, y) {
    var coords = this.pixelsToCoordinates(x, y);
    return this.coordinatesToSquare(coords[0], coords[1], true);
}

ChessBoard.pieceStart = function(x, y, event) {
    this.data('originalX', this.attr('x'));
    this.data('originalY', this.attr('y'));

    var centerX = this.attr('x') + PIECE_PIXELS / 2, centerY = this.attr('y') + PIECE_PIXELS / 2;
    var coords = this.paper.chessBoard.pixelsToCoordinates(centerX, centerY);
    this.paper.chessBoard.defaultSquareColors();
    this.paper.chessBoard.boardSquares[coords[0]][coords[1]].attr('fill', FROM_COLOR);
}

ChessBoard.pieceMove = function(dx, dy, x, y, event) {
    this.attr('x', this.data('originalX') + dx);
    this.attr('y', this.data('originalY') + dy);
}

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
    if (ChessValidator.areValidCoordinates(toCoords[0], toCoords[1]) && this.paper.chessBoard.validator.isLegalMove(move)) {
        console.log('Legal move!');
        this.paper.chessBoard.makeMove(move);
    } else {
        // Put back in place
        console.log('Illegal move!');
        var pixelCoords = this.paper.chessBoard.squareToPixels(this.data('square'));
        this.attr('x', pixelCoords[0]);
        this.attr('y', pixelCoords[1]);
        this.paper.chessBoard.getBoardFromValidator();
    }
}

ChessBoard.bankStart = function(x, y, event) {
    var name = this.data('name');
    var player = name[0];
    var piece = name[1];
    var count = this.paper.chessBoard.bank[player][piece][2];

    // Create a copy, even if count == 0.
    var bankIndex = this.data('bankIndex');
    this.paper.chessBoard.placeBank(player, bankIndex, count);
    this.data('originalX', this.attr('x'));
    this.data('originalY', this.attr('y'));
}

ChessBoard.bankMove = function(dx, dy, x, y, event) {
    var name = this.data('name');
    var player = name[0];
    var piece = name[1];
    var count = this.paper.chessBoard.bank[player][piece][2];

    // Don't let the piece move if count == 0.
    if (count > 0) {
        this.attr('x', this.data('originalX') + dx);
        this.attr('y', this.data('originalY') + dy);
    }
}

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
    if (count > 0 && ChessValidator.areValidCoordinates(toCoords[0], toCoords[1]) && this.paper.chessBoard.validator.isLegalMove(move)) {
        console.log('Legal move!');
        this.paper.chessBoard.makeMove(move);
    } else {
        // Put back in place
        console.log('Illegal move!');
    }

    this.remove();
}

function makeLinks() {
    boards[0].validator.otherValidator = boards[1].validator;
    boards[1].validator.otherValidator = boards[0].validator;
}

function displayBoards() {
    boards[0].getBoardFromValidator();
    boards[1].getBoardFromValidator();

    // Hack; raphael's image function doesn't have callback
    setTimeout(function() {
        if (boards[0].validator.isCheckmate()) {
            alert('Checkmate on left board!');
        }

        if (boards[1].validator.isCheckmate()) {
            alert('Checkmate on right board!');
        }
    });
}

function stopTimers() {
    clearInterval(boards[0].timerInterval);
    clearInterval(boards[1].timerInterval);
}

var socket, boards = [];

$(document).ready(function() {
    // Set up socket.io
    if (document.URL.indexOf('localhost') == -1) {
        socket = io.connect('http://nealwu.com:8000');
    } else {
        socket = io.connect('http://localhost:8000');
    }

    socket.on('update', function(validators) {
        if (boards.length == 0) {
            // Create two boards AFTER the socket is connected
            boards = [new ChessBoard(0), new ChessBoard(1)];
        }

        boards[0].validator = validators[0];
        boards[1].validator = validators[1];
        fixPrototypes(boards[0].validator);
        fixPrototypes(boards[1].validator);
        makeLinks();
        displayBoards();
    });

    socket.emit('start_game', document.URL);
});