SQUARE_PIXELS = 60;
BOARD_PIXELS = 8 * SQUARE_PIXELS;
PIECE_OFFSET = 3;
PIECE_PIXELS = SQUARE_PIXELS - 2 * PIECE_OFFSET;

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

// Class for chess boards. number is the index of the board (0 or 1).
function ChessBoard(number) {
    this.number = number;
    this.bottomPlayer = this.number == 0 ? WHITE : BLACK;
    this.initBoard();
}

ChessBoard.prototype.initBoard = function() {
    this.raphael = Raphael('board' + this.number, BOARD_PIXELS, BOARD_PIXELS);
    this.raphael.chessBoard = this;

    // Set up the 64 squares
    this.boardSquares = [];

    for (var x = 0; x < 8; x++) {
        this.boardSquares[x] = [];
        for (var y = 0; y < 8; y++) {
            // Choose between light brown and dark brown
            var squareColor = (x + y) % 2 == 0 ? '#f0d9b5' : '#b58863';
            this.boardSquares[x][y] = this.raphael.rect(x * SQUARE_PIXELS, y * SQUARE_PIXELS, SQUARE_PIXELS, SQUARE_PIXELS)
                .attr('fill', squareColor)
                .attr('stroke-width', 0);
        }
    }

    this.validator = new ChessValidator();
    this.pieceAtSquare = {};

    for (square in STARTING_BOARD) {
        var name = STARTING_BOARD[square];
        var piece = this.placePiece(name, square);
    }
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

ChessBoard.prototype.placePiece = function(name, square) {
    var coords = this.squareToCoordinates(square);
    var piece = this.raphael.image('images/pieces/' + name + '.svg',
        coords[0] * SQUARE_PIXELS + PIECE_OFFSET, coords[1] * SQUARE_PIXELS + PIECE_OFFSET, PIECE_PIXELS, PIECE_PIXELS);
    piece.data('name', name);
    piece.drag(ChessBoard.pieceMove, ChessBoard.pieceStart, ChessBoard.pieceEnd);
    this.pieceAtSquare[square] = piece;
    return piece;
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
    var x = Math.floor(centerX / SQUARE_PIXELS), y = Math.floor(centerY / SQUARE_PIXELS);
    var toSquare = this.paper.chessBoard.coordinatesToSquare(x, y);
    var fromSquare = this.paper.chessBoard.coordinatesToSquare(Math.floor(this.data('originalX') / SQUARE_PIXELS), Math.floor(this.data('originalY') / SQUARE_PIXELS));
    var player = this.data('name')[0];
    var move = player + '_' + fromSquare + '-' + toSquare;
    console.log(move);

    // Check for validity
    if (x >= 0 && x < 8 && y >= 0 && y < 8 && this.paper.chessBoard.validator.isLegalMove(move)) {
        console.log('Legal move!');
        this.paper.chessBoard.validator.makeMove(move);

        if (this.paper.chessBoard.pieceAtSquare[toSquare]) {
            this.paper.chessBoard.pieceAtSquare[toSquare].remove();
        }

        this.attr('x', x * SQUARE_PIXELS + PIECE_OFFSET);
        this.attr('y', y * SQUARE_PIXELS + PIECE_OFFSET);

        this.paper.chessBoard.pieceAtSquare[toSquare] = this;
        this.paper.chessBoard.pieceAtSquare[fromSquare] = null;
    } else {
        // Put back in place
        console.log('Illegal move');
        this.attr('x', this.data('originalX'));
        this.attr('y', this.data('originalY'));
    }

    this.paper.chessBoard.getBoardFromValidator();
}

var boards;

$(document).ready(function() {
    // Set up socket.io
    var socket = io.connect('http://localhost');
    socket.on('news', function (data) {
        console.log(data);
        socket.emit('my other event', { my: 'data' });
    });

    // Create two boards
    boards = [new ChessBoard(0), new ChessBoard(1)];
});