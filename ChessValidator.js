SIZE = 8;

WHITE = 'W';
BLACK = 'B';

PAWN = 'P';
KNIGHT = 'N';
BISHOP = 'B';
ROOK = 'R';
QUEEN = 'Q';
KING = 'K';
EMPTY = '.';

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

function ChessValidator() {
    this.initialize();
}

ChessValidator.prototype.initialize = function() {
    // Initialize to empty
    this.board = [['..', '..', '..', '..', '..', '..', '..', '..'],
                  ['..', '..', '..', '..', '..', '..', '..', '..'],
                  ['..', '..', '..', '..', '..', '..', '..', '..'],
                  ['..', '..', '..', '..', '..', '..', '..', '..'],
                  ['..', '..', '..', '..', '..', '..', '..', '..'],
                  ['..', '..', '..', '..', '..', '..', '..', '..'],
                  ['..', '..', '..', '..', '..', '..', '..', '..'],
                  ['..', '..', '..', '..', '..', '..', '..', '..']];

    for (square in STARTING_BOARD) {
        this.setPieceAtSquare(square, STARTING_BOARD[square]);
    }

    this.turn = 'W';
}

ChessValidator.prototype.squareToCoordinates = function(square) {
    var x = square.charCodeAt(0) - 'a'.charCodeAt(0);

    if (x < 0)
        x = square.charCodeAt(0) - 'A'.charCodeAt(0);

    var y = square.charCodeAt(1) - '1'.charCodeAt(0);
    return [x, y];
}

ChessValidator.prototype.getPieceAtSquare = function(square) {
    var coords = this.squareToCoordinates(square);
    return this.getPieceAt(coords[0], coords[1]);
}

ChessValidator.prototype.getPieceAt = function(x, y) {
    return this.board[x][y];
}

ChessValidator.prototype.setPieceAtSquare = function(square, piece) {
    var coords = this.squareToCoordinates(square);
    this.setPieceAt(coords[0], coords[1], piece);
}

ChessValidator.prototype.setPieceAt = function(x, y, piece) {
    this.board[x][y] = piece;
}

ChessValidator.prototype.getPawnAttackingSquares = function(x, y) {
    var color = this.getPieceAt(x, y)[0];

    if (color == WHITE) {

    } else if (color == BLACK) {

    }

    console.log("Called getPawnAttackingSquares on an empty square: " + x + ", " + y);
    return [];
}

ChessValidator.prototype.getKnightAttackingSquares = function(x, y) {

}

ChessValidator.prototype.getBishopAttackingSquares = function(x, y) {

}

ChessValidator.prototype.getRookAttackingSquares = function(x, y) {

}

ChessValidator.prototype.getKingAttackingSquares = function(x, y) {

}

ChessValidator.prototype.getAttackingSquares = function(x, y) {
    var piece = this.getPieceAt(x, y)[1];

    if (piece == EMPTY) {
        return [];
    } else if (piece == PAWN) {

    } else if (piece == KNIGHT) {

    } else if (piece == BISHOP) {

    } else if (piece == ROOK) {

    } else if (piece == QUEEN) {

    } else if (piece == KING) {

    }

    console.log("Forgot a piece? " + piece);
    return [];
}

ChessValidator.prototype.inCheck = function(player) {
    var other = player == WHITE ? BLACK : WHITE;
}

var x = new ChessValidator();