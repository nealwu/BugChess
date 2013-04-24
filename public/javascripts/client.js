BOARD_SIZE = 8;

SQUARE_PIXELS = 64;
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

function assert(result, description) {
    if (!result) {
        console.log(description);
        alert(description);
    }
}

// Class for chess boards. number is the index of the board (0 or 1).
function ChessBoard(number) {
    this.number = number;
    this.bottomPlayer = this.number == 0 ? WHITE : BLACK;
    this.initBoard();
}

ChessBoard.prototype.placePiece = function(name, square) {
    assert(ChessValidator.isValidName(name), 'Invalid name given to ChessBoard.placePiece: ' + name);
    assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessBoard.placePiece: ' + square);
    var coords = this.squareToCoordinates(square);
    var piece = this.raphael.image('images/pieces/' + name + '.svg',
        coords[0] * SQUARE_PIXELS + PIECE_OFFSET, BANK_PIXELS + coords[1] * SQUARE_PIXELS + PIECE_OFFSET, PIECE_PIXELS, PIECE_PIXELS);
    piece.data('name', name);
    piece.drag(ChessBoard.pieceMove, ChessBoard.pieceStart, ChessBoard.pieceEnd);
    this.pieceAtSquare[square] = piece;
    return piece;
}

// placeBank actually places a new image
ChessBoard.prototype.placeBank = function(player, bankIndex, initial) {
    assert(ChessValidator.isValidPlayer(player), 'Invalid player given to ChessBoard.placeBank: ' + player);
    assert(0 <= bankIndex && bankIndex < BANK_ORDER.length, 'Invalid bankIndex given to ChessBoard.placeBank: ' + bankIndex);
    initial = initial === undefined ? 0 : initial;

    var bankY = player == this.bottomPlayer ? BOARD_HEIGHT - BANK_PIXELS : 0;
    var piece = BANK_ORDER[bankIndex];
    var name = player + piece;

    if (this.bank[player][piece] !== undefined) {
        // Remove the text previously associated with the piece
        this.bank[player][piece][1].remove();
    }

    var x = BOARD_WIDTH * bankIndex / BANK_ORDER.length + PIECE_OFFSET;
    var y = bankY + PIECE_OFFSET;

    var image = this.raphael.image('images/pieces/' + name + '.svg', x, y, PIECE_PIXELS, PIECE_PIXELS);
    image.data('name', name);
    image.data('bankIndex', bankIndex);
    image.drag(ChessBoard.bankMove, ChessBoard.bankStart, ChessBoard.bankEnd);

    var text = this.raphael.text(x + PIECE_PIXELS + BANK_HORIZ_BUFFER, y + PIECE_PIXELS / 2, ':' + initial).attr('font-size', BANK_FONT_SIZE);
    this.bank[player][piece] = [image, text, initial];
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
    this.bank[player][piece][1] = this.raphael.text(textX, textY, ':' + count).attr('font-size', BANK_FONT_SIZE);
    this.bank[player][piece][2] = count;
}

ChessBoard.prototype.initBoard = function() {
    this.raphael = Raphael('board' + this.number, BOARD_WIDTH, BOARD_HEIGHT);
    this.raphael.chessBoard = this;

    // Set up the 64 squares
    this.boardSquares = [];

    for (var x = 0; x < BOARD_SIZE; x++) {
        this.boardSquares[x] = [];
        for (var y = 0; y < BOARD_SIZE; y++) {
            // Choose between light brown and dark brown
            var squareColor = (x + y) % 2 == 0 ? '#f0d9b5' : '#b58863';
            this.boardSquares[x][y] = this.raphael.rect(x * SQUARE_PIXELS, BANK_PIXELS + y * SQUARE_PIXELS, SQUARE_PIXELS, SQUARE_PIXELS)
                .attr('fill', squareColor)
                .attr('stroke-width', 0);
        }
    }

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
}

ChessBoard.prototype.getBoardFromValidator = function() {
    // Get rid of all the pieces on the board
    for (square in this.pieceAtSquare) {
        var piece = this.pieceAtSquare[square];

        if (piece) {
            piece.remove();
        }

        this.pieceAtSquare[square] = null;
    }

    // Grab all the pieces in the validator and then put them on the board
    var self = this;

    ChessValidator.allSquares().forEach(function(square) {
        var name = self.validator.getPieceAtSquare(square).name;

        if (name != EMPTY2) {
            self.placePiece(name, square);
        }
    });

    [WHITE, BLACK].forEach(function(player) {
        BANK_ORDER.forEach(function(piece) {
            self.changeBank(player, piece, self.validator.bank[player][piece]);
        });
    });
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

ChessBoard.prototype.makeMove = function(move, emit) {
    if (!this.validator.isLegalMove(move)) {
        return false;
    }

    this.validator.makeMove(move);

    // Send the move to the server
    if (emit) {
        this.lastMove = move;
        var emitMove = this.number + '_' + move;
        socket.emit('make_move', {move: emitMove});
        console.log('Sending: ' + emitMove);
    } else {
        this.getBoardFromValidator();
    }

    return true;
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
    var fromSquare = this.paper.chessBoard.pixelsToSquare(this.data('originalX'), this.data('originalY'));
    var player = this.data('name')[0];
    var move = player + '_' + fromSquare + '-' + toSquare;
    console.log(move);

    // Check for validity
    if (ChessValidator.areValidCoordinates(toCoords[0], toCoords[1]) && this.paper.chessBoard.validator.isLegalMove(move)) {
        console.log('Legal move!');
        this.paper.chessBoard.makeMove(move, true);
    } else {
        // Put back in place
        console.log('Illegal move');
        this.attr('x', this.data('originalX'));
        this.attr('y', this.data('originalY'));
    }

    this.paper.chessBoard.getBoardFromValidator();
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
        this.paper.chessBoard.makeMove(move, true);

        // Set it in the array so it can be removed
        this.paper.chessBoard.pieceAtSquare[toSquare] = this;
        this.paper.chessBoard.getBoardFromValidator();
    } else {
        // Put back in place
        console.log('Illegal move');
        this.remove();
    }
}

var boards, socket;

$(document).ready(function() {
    // Set up socket.io
    socket = io.connect('http://localhost');

    // Create two boards AFTER the socket is connected
    boards = [new ChessBoard(0), new ChessBoard(1)];
    boards[0].validator.otherBoard = boards[1];
    boards[1].validator.otherBoard = boards[0];

    socket.on('make_move', function(data) {
        var move = data['move'];
        console.log('Received: ' + move);
        var number = parseInt(move[0]);
        move = move.substring(2, move.length);

        if (boards[number].lastMove != move) {
            boards[number].makeMove(move, false);
        }
    });
});