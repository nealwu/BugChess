SQUARE_PIXELS = 60;
PIECE_OFFSET = 3;
PIECE_PIXELS = SQUARE_PIXELS - 2 * PIECE_OFFSET;
BANK_PIXELS = SQUARE_PIXELS;
BANK_HORIZ_BUFFER = 8;
BOARD_WIDTH = 8 * SQUARE_PIXELS;
BOARD_HEIGHT = 8 * SQUARE_PIXELS + 2 * BANK_PIXELS;

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

// Class for chess boards. number is the index of the board (0 or 1).
function ChessBoard(number) {
    this.number = number;
    this.bottomPlayer = this.number == 0 ? WHITE : BLACK;
    this.initBoard();
}

ChessBoard.prototype.placePiece = function(name, square) {
    var coords = this.squareToCoordinates(square);
    var piece = this.raphael.image('images/pieces/' + name + '.svg',
        coords[0] * SQUARE_PIXELS + PIECE_OFFSET, BANK_PIXELS + coords[1] * SQUARE_PIXELS + PIECE_OFFSET, PIECE_PIXELS, PIECE_PIXELS);
    piece.data('name', name);
    piece.drag(ChessBoard.pieceMove, ChessBoard.pieceStart, ChessBoard.pieceEnd);
    this.pieceAtSquare[square] = piece;
    return piece;
}

ChessBoard.prototype.placeBank = function(player, bankIndex) {
    var bankY = player == this.bottomPlayer ? BOARD_HEIGHT - BANK_PIXELS : 0;
    var piece = BANK_ORDER[bankIndex];
    var name = player + piece;

    var x = BOARD_WIDTH * bankIndex / BANK_ORDER.length + PIECE_OFFSET;
    var y = bankY + PIECE_OFFSET;

    var image = this.raphael.image('images/pieces/' + name + '.svg',
        BOARD_WIDTH * bankIndex / BANK_ORDER.length + PIECE_OFFSET, bankY + PIECE_OFFSET, PIECE_PIXELS, PIECE_PIXELS);
    image.data('name', name);
    // TODO: image.drag(ChessBoard.pieceMove, ChessBoard.pieceStart, ChessBoard.pieceEnd);
    this.bank[player][piece] = [image, 0];
    var text = this.raphael.text(x + PIECE_PIXELS + BANK_HORIZ_BUFFER, y + PIECE_PIXELS / 2, ':0').attr('font-size', 24);
    return image;
}

ChessBoard.prototype.initBoard = function() {
    this.raphael = Raphael('board' + this.number, BOARD_WIDTH, BOARD_HEIGHT);
    this.raphael.chessBoard = this;

    // Set up the 64 squares
    this.boardSquares = [];

    for (var x = 0; x < 8; x++) {
        this.boardSquares[x] = [];
        for (var y = 0; y < 8; y++) {
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

ChessBoard.allSquares = function() {
    var squares = [];

    for (var x = 0; x < 8; x++) {
        for (var y = 0; y < 8; y++) {
            squares.push(String.fromCharCode(x + 'a'.charCodeAt(0), y + '1'.charCodeAt(0)));
        }
    }

    return squares;
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
    var squares = ChessBoard.allSquares();
    for (i in squares) {
        var name = this.validator.getPieceAtSquare(squares[i]);
        if (name != EMPTY2) {
            this.placePiece(name, squares[i]);
        }
    }


}

// Note: square -- 'a1' to 'h8'; coordinates -- x = 0, y = 0 to x = 7, y = 7
// (0, 0) = 'a8'; (7, 7) = 'h1'
ChessBoard.prototype.squareToCoordinates = function(square) {
    var x = square.charCodeAt(0) - 'a'.charCodeAt(0);

    if (x < 0)
        x = square.charCodeAt(0) - 'A'.charCodeAt(0);

    var y = '8'.charCodeAt(0) - square.charCodeAt(1);

    // If the bottom player is black, flip the coordinates
    if (this.bottomPlayer == WHITE) {
        return [x, y];
    } else {
        return [7 - x, 7 - y];
    }
}

ChessBoard.prototype.coordinatesToSquare = function(x, y) {
    // If the bottom player is black, flip the coordinates
    if (this.bottomPlayer == WHITE) {
        return String.fromCharCode(x + 'a'.charCodeAt(0), '8'.charCodeAt(0) - y);
    } else {
        return String.fromCharCode('h'.charCodeAt(0) - x, y + '1'.charCodeAt(0));
    }
}

ChessBoard.pieceStart = function(x, y, event) {
    this.data('originalX', this.attr('x'));
    this.data('originalY', this.attr('y'));
}

ChessBoard.pieceMove = function(dx, dy, x, y, event) {
    this.attr('x', this.data('originalX') + dx);
    this.attr('y', this.data('originalY') + dy);
}

ChessBoard.prototype.makeMove = function(move, emit) {
    if (!this.validator.isLegalMove(move)) {
        return false;
    }

    this.validator.makeMove(move);

    // Send the move to the server
    if (emit) {
        socket.emit('make_move', { move: this.number + '_' + move});
    }

    // Move pieces on the front end
    if (move.length == 7 && this.validator.isValidSquare(move.substring(2, 4)) && this.validator.isValidSquare(move.substring(5, 7))) {
        var fromSquare = move.substring(2, 4);
        var toSquare = move.substring(5, 7);
        var toCoords = this.squareToCoordinates(toSquare);

        if (this.pieceAtSquare[toSquare]) {
            this.pieceAtSquare[toSquare].remove();
        }

        this.pieceAtSquare[fromSquare].attr('x', toCoords[0] * SQUARE_PIXELS + PIECE_OFFSET);
        this.pieceAtSquare[fromSquare].attr('y', BANK_PIXELS + toCoords[1] * SQUARE_PIXELS + PIECE_OFFSET);

        this.pieceAtSquare[toSquare] = this.pieceAtSquare[fromSquare];
        this.pieceAtSquare[fromSquare] = null;
        return true;
    }

    return false;
}

ChessBoard.prototype.pixelsToSquare = function(x, y) {
    var squareX = Math.floor(x / SQUARE_PIXELS);
    var squareY = Math.floor((y - BANK_PIXELS) / SQUARE_PIXELS);
    console.log(squareX + ' ' + squareY);
    return this.coordinatesToSquare(squareX, squareY);
}

ChessBoard.pieceEnd = function(event) {
    // Get the coordinates of the piece's center
    var centerX = this.attr('x') + PIECE_PIXELS / 2, centerY = this.attr('y') + PIECE_PIXELS / 2;
    var toSquare = this.paper.chessBoard.pixelsToSquare(centerX, centerY);
    var toCoords = this.paper.chessBoard.squareToCoordinates(toSquare);
    var fromSquare = this.paper.chessBoard.pixelsToSquare(this.data('originalX'), this.data('originalY'));
    var player = this.data('name')[0];
    var move = player + '_' + fromSquare + '-' + toSquare;
    console.log(move);

    // Check for validity
    if (this.paper.chessBoard.validator.isInsideBoard(toCoords[0], toCoords[1]) && this.paper.chessBoard.validator.isLegalMove(move)) {
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

var boards, socket;

$(document).ready(function() {
    // Set up socket.io
    socket = io.connect('http://localhost');

    // Create two boards AFTER the socket is connected
    boards = [new ChessBoard(0), new ChessBoard(1)];

    socket.on('make_move', function(data) {
        var move = data['move'];
        var number = parseInt(move[0]);
        move = move.substring(2, move.length);
        boards[number].makeMove(move, false);
    });
});