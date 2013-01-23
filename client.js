SQUARE_SIZE = 60;
BOARD_SIZE = 8 * SQUARE_SIZE;
PIECE_OFFSET = 5;
PIECE_SIZE = SQUARE_SIZE - 2 * PIECE_OFFSET;


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

STARTING_BOARD = {
    'a1': WHITE + ROOK,
    'b1': WHITE + KNIGHT,
    'c1': WHITE + BISHOP,
    'd1': WHITE + QUEEN,
    'e1': WHITE + KING,
    'f1': WHITE + BISHOP,
    'g1': WHITE + KNIGHT,
    'h1': WHITE + ROOK,
    'a2': WHITE + PAWN,
    'b2': WHITE + PAWN,
    'c2': WHITE + PAWN,
    'd2': WHITE + PAWN,
    'e2': WHITE + PAWN,
    'f2': WHITE + PAWN,
    'g2': WHITE + PAWN,
    'h2': WHITE + PAWN,
    'a7': BLACK + PAWN,
    'b7': BLACK + PAWN,
    'c7': BLACK + PAWN,
    'd7': BLACK + PAWN,
    'e7': BLACK + PAWN,
    'f7': BLACK + PAWN,
    'g7': BLACK + PAWN,
    'h7': BLACK + PAWN,
    'a8': BLACK + ROOK,
    'b8': BLACK + KNIGHT,
    'c8': BLACK + BISHOP,
    'd8': BLACK + QUEEN,
    'e8': BLACK + KING,
    'f8': BLACK + BISHOP,
    'g8': BLACK + KNIGHT,
    'h8': BLACK + ROOK,
};

// CLass for chess boards. number is the index of the board (0 or 1).
function ChessBoard(number) {
    this.number = number;
    this.bottomPlayer = this.number == 0 ? WHITE : BLACK;
    this.raphael = Raphael('board' + this.number, BOARD_SIZE, BOARD_SIZE);
    this.initBoard();
}

ChessBoard.prototype.initBoard = function() {
    // Set up the 64 squares
    this.boardSquares = [];

    for (var x = 0; x < 8; x++) {
        this.boardSquares[x] = [];
        for (var y = 0; y < 8; y++) {
            // Choose between light brown and dark brown
            var squareColor = (x + y) % 2 == 0 ? '#f0d9b5' : '#b58863';
            this.boardSquares[x][y] = this.raphael.rect(x * SQUARE_SIZE, y * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE)
                .attr('fill', squareColor)
                .attr('stroke-width', 0);
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

    // If the bottom player is black, flip the y-coordinate
    return [x, this.bottomPlayer == WHITE ? y : 7 - y];
}

ChessBoard.prototype.coordinatesToSquare = function(x, y) {
    // If the bottom player is black, flip the y-coordinate
    return String.fromCharCode(x + 'a'.charCodeAt(0), this.bottomPlayer == WHITE ? '8'.charCodeAt(0) - y : y - '1'.charCodeAt(0));
}

ChessBoard.prototype.placePiece = function(piece, square) {
    var coords = this.squareToCoordinates(square);

}

$(document).ready(function() {
    // Create two boards
    var boards = [new ChessBoard(0), new ChessBoard(1)];
});