BOARD_SIZE = 8;

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

function ChessValidator() {
    this.initialize();
}

ChessValidator.prototype.initialize = function() {
    // Initialize to empty
    this.board = [[EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2],
                  [EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2],
                  [EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2],
                  [EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2],
                  [EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2],
                  [EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2],
                  [EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2],
                  [EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2, EMPTY2]];

    for (square in STARTING_BOARD) {
        this.setPieceAtSquare(square, STARTING_BOARD[square]);
    }

    this.turn = 'W';
}

ChessValidator.prototype.printBoard = function() {
    for (var y = BOARD_SIZE - 1; y >= 0; y--) {
        var line = "";

        for (var x = 0; x < BOARD_SIZE; x++) {
            line += this.getPieceAt(x, y);

            if (x < BOARD_SIZE - 1) {
                line += ' ';
            }
        }

        console.log(line);
    }
}

ChessValidator.prototype.squareToCoordinates = function(square) {
    var x = square.charCodeAt(0) - 'a'.charCodeAt(0);

    if (x < 0)
        x = square.charCodeAt(0) - 'A'.charCodeAt(0);

    var y = square.charCodeAt(1) - '1'.charCodeAt(0);
    return [x, y];
}

ChessValidator.prototype.isEmptyAtSquare = function(square) {
    return this.getPieceAtSquare(square) == EMPTY2;
}

ChessValidator.prototype.isEmptyAt = function(x, y) {
    return this.getPieceAt(x, y) == EMPTY2;
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

ChessValidator.prototype.insideBoard = function(x, y) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

ChessValidator.prototype.getPawnAttackingSquares = function(x, y) {
    var self = this;
    var squares = [];
    var color = this.getPieceAt(x, y)[0];
    var dy = color == WHITE ? +1 : -1;

    [-1, +1].forEach(function(dx) {
        var nx = x + dx, ny = y + dy;

        if (self.insideBoard(nx, ny)) {
            squares.push([nx, ny]);
        }
    });

    return squares;
}

ChessValidator.prototype.getKnightAttackingSquares = function(x, y) {
    var squares = [];
    var dx = [-2, -2, -1, -1, +1, +1, +2, +2];
    var dy = [-1, +1, -2, +2, -2, +2, -1, +1];

    for (i in dx) {
        var nx = x + dx[i], ny = y + dy[i];

        if (this.insideBoard(nx, ny)) {
            squares.push([nx, ny]);
        }
    }

    return squares;
}

ChessValidator.prototype.getBishopAttackingSquares = function(x, y) {
    var self = this;
    var squares = [];

    [-1, +1].forEach(function(dx) {
        [-1, +1].forEach(function(dy) {
            var nx = x + dx, ny = y + dy;

            while (self.insideBoard(nx, ny)) {
                squares.push([nx, ny]);

                if (!self.isEmptyAt(nx, ny)) {
                    break;
                }

                nx += dx;
                ny += dy;
            }
        });
    });

    return squares;
}

ChessValidator.prototype.getRookAttackingSquares = function(x, y) {
    var squares = [];
    var dx = [-1, +1, 0, 0];
    var dy = [0, 0, -1, +1];

    for (i in dx) {
        var nx = x + dx[i], ny = y + dy[i];

        while (this.insideBoard(nx, ny)) {
            squares.push([nx, ny]);

            if (!this.isEmptyAt(nx, ny)) {
                break;
            }

            nx += dx[i];
            ny += dy[i];
        }
    }

    return squares;
}

ChessValidator.prototype.getQueenAttackingSquares = function(x, y) {
    return this.getBishopAttackingSquares(x, y).concat(this.getRookAttackingSquares(x, y));
}

ChessValidator.prototype.getKingAttackingSquares = function(x, y) {
    var squares = [];

    for (var dx = -1; dx <= +1; dx++) {
        for (var dy = -1; dy <= +1; dy++) {
            if (dx != 0 || dy != 0) {
                var nx = x + dx, ny = y + dy;

                if (this.insideBoard(nx, ny)) {
                    squares.push([nx, ny]);
                }
            }
        }
    }

    return squares;
}

// Get the squares attacked by a certain piece. Includes friendly pieces.
ChessValidator.prototype.getAttackingSquares = function(x, y) {
    var piece = this.getPieceAt(x, y)[1];

    if (piece == EMPTY) {
        return [];
    } else if (piece == PAWN) {
        return this.getPawnAttackingSquares(x, y);
    } else if (piece == KNIGHT) {
        return this.getKnightAttackingSquares(x, y);
    } else if (piece == BISHOP) {
        return this.getBishopAttackingSquares(x, y);
    } else if (piece == ROOK) {
        return this.getRookAttackingSquares(x, y);
    } else if (piece == QUEEN) {
        return this.getQueenAttackingSquares(x, y);
    } else if (piece == KING) {
        return this.getKingAttackingSquares(x, y);
    }

    console.log("Forgot a piece? " + piece);
    return [];
}

ChessValidator.prototype.inCheck = function(player) {
    var other = player == WHITE ? BLACK : WHITE;
    var king = [-1, -1];

    for (var x = 0; x < BOARD_SIZE; x++) {
        for (var y = 0; y < BOARD_SIZE; y++) {
            if (this.getPieceAt(x, y) == player + KING) {
                king = [x, y];
            }
        }
    }

    for (var x = 0; x < BOARD_SIZE; x++) {
        for (var y = 0; y < BOARD_SIZE; y++) {
            if (this.getPieceAt(x, y)[0] == other && this.getAttackingSquares(x, y).indexOf(king) != -1) {
                return true;
            }
        }
    }

    return false;
}

function isLowerCase(str) {
    return str == str.toLowerCase();
}

/*
 * Move notation:
 * 1. W_f2-g4         [normal move; could be a capture]
 * 2. B_Qc3           [bughouse drop]
 * 3. B_0-0 / B_0-0-0 [castling]
 * First character is the player making the move.
 * En passant doesn't have special notation, but watch out for it.
 * Pawn promotions should automatically turn into a queen for now.
 * TODO: enable underpromotions
 */
ChessValidator.prototype.isLegalMove = function(move) {
    // Can't move on your opponent's turn
    if (move[0] != this.turn) {
        return false;
    }

    if (move[2] == '0') {
        // Case 3

    } else if (isLowerCase(move[2])) {
        // Case 1

        var from = move.substring(2, 4);
        var to = move.substring(5, 7);
        var fromPiece = this.getPieceAtSquare(from);
        var toPiece = this.getPieceAtSquare(to);

        // Starting square must have a piece of the right color
        if (fromPiece[0] != move[0]) {
            return false;
        }

        // Starting piece color cannot be the same as ending piece color
        if (fromPiece[0] == toPiece[0]) {
            return false;
        }

        // Must be a valid move for the type of piece

        // Check pawn specifically; everything else can just use getAttackingSquares
        if (fromPiece[1] == PAWN && this.squareToCoordinates(from)[0] == this.squareToCoordinates(to)[0]) {
            var coords = this.squareToCoordinates(from);
            var dy = move[0] == WHITE ? +1 : -1;
            var x = coords[0], y = coords[1] + dy;

            if (!this.insideBoard(x, y) || !this.isEmptyAt(x, y)) {
                return false;
            }
        } else {
            if (this.getAttackingMoves())
        }

        // Must not end up in check
    } else {
        // Case 2

    }
}

ChessValidator.prototype.legalMoves = function() {

}

ChessValidator.prototype.simulateMove = function(move) {
    if (move[2] == '0') {
        // Case 3

    } else if (isLowerCase(move[2])) {
        // Case 1
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);
        var replaced = this.getPieceAtSquare(to);
        this.setPieceAtSquare(to, this.getPieceAtSquare(from));
        this.setPieceAtSquare(from, EMPTY2);

        var coords = this.squareToCoordinates(to);

        // Pawn promotion (automatic queen for now)
        if ((move[0] == WHITE && coords[1] == BOARD_SIZE - 1) || (move[0] == BLACK && coords[1] == 0)) {
            // This might be more difficult to undo
        }

        // TODO: replace with resetting the entire object
        return replaced;
    } else {
        // Case 2

    }
}

ChessValidator.prototype.undoMove = function(move, replaced) {
    // TODO: replace with just resetting the entire board

    if (move[2] == '0') {
        // Case 3

    } else if (isLowerCase(move[2])) {
        // Case 1
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);
        this.setPieceAtSquare(from, this.getPieceAtSquare(to));
        this.setPieceAtSquare(to, replaced);
    } else {
        // Case 2

    }
}

ChessValidator.prototype.makeMove = function(move) {
    // Call simulateMove?

    this.turn = this.turn == WHITE ? BLACK : WHITE;
}

var x = new ChessValidator();