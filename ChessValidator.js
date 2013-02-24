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

function isLowerCase(str) {
    return str == str.toLowerCase();
}

function deepCopy(array) {
    var jqueryCopy = $.extend(true, {}, array);
    var newArray = [];

    for (i in jqueryCopy) {
        newArray.push(jqueryCopy[i]);
    }

    return newArray;
}

function arraysEqual(a, b) {
    if (a.length != b.length) {
        return false;
    }

    for (i in a) {
        if (a[i] != b[i]) {
            return false;
        }
    }

    return true;
}

function arrayContains(array, elem) {
    for (i in array) {
        if (arraysEqual(array[i], elem)) {
            return true;
        }
    }

    return false;
}

function ChessValidator() {
    this.initialize();
}

ChessValidator.allSquares = function() {
    var squares = [];

    for (var x = 0; x < BOARD_SIZE; x++) {
        for (var y = 0; y < BOARD_SIZE; y++) {
            squares.push(String.fromCharCode(x + 'a'.charCodeAt(0), y + '1'.charCodeAt(0)));
        }
    }

    return squares;
}

ChessValidator.prototype.initialize = function() {
    // Initialize to empty
    this.board = [];

    for (var x = 0; x < BOARD_SIZE; x++) {
        this.board[x] = [];
        for (var y = 0; y < BOARD_SIZE; y++) {
            this.board[x][y] = EMPTY2;
        }
    }

    var squares = ChessValidator.allSquares();
    this.hasMoved = {};

    for (i in squares) {
        this.hasMoved[squares[i]] = false;
    }

    for (square in STARTING_BOARD) {
        this.setPieceAtSquare(square, STARTING_BOARD[square]);
    }

    this.bank = {};
    this.bank[WHITE] = {};
    this.bank[BLACK] = {};
    this.bank[WHITE][QUEEN] = this.bank[WHITE][ROOK] = this.bank[WHITE][BISHOP] = this.bank[WHITE][KNIGHT] = this.bank[WHITE][PAWN] = 0;
    this.bank[BLACK][QUEEN] = this.bank[BLACK][ROOK] = this.bank[BLACK][BISHOP] = this.bank[BLACK][KNIGHT] = this.bank[BLACK][PAWN] = 0;

    this.turn = WHITE;
    this.lastMove = '';
}

ChessValidator.prototype.bankToStr = function(bank) {
    return QUEEN + ':' + bank[QUEEN] + ' ' +
            ROOK + ':' + bank[ROOK] + ' ' +
            BISHOP + ':' + bank[BISHOP] + ' ' +
            KNIGHT + ':' + bank[KNIGHT] + ' ' +
            PAWN + ':' + bank[PAWN];
}

ChessValidator.prototype.printBoard = function() {
    console.log(BLACK + ' = ' + this.bankToStr(this.bank[BLACK]));

    for (var y = 0; y < BOARD_SIZE; y++) {
        var line = '';

        for (var x = 0; x < BOARD_SIZE; x++) {
            line += this.getPieceAt(x, y);

            if (x < BOARD_SIZE - 1) {
                line += ' ';
            }
        }

        console.log(line);
    }

    console.log(WHITE + ' = ' + this.bankToStr(this.bank[WHITE]));
}

// Note: square -- 'a1' to 'h8'; coordinates -- x = 0, y = 0 to x = 7, y = 7
// (0, 0) = 'a8'; (7, 7) = 'h1'
ChessValidator.prototype.squareToCoordinates = function(square) {
    var x = square.charCodeAt(0) - 'a'.charCodeAt(0);

    if (x < 0)
        x = square.charCodeAt(0) - 'A'.charCodeAt(0);

    var y = '8'.charCodeAt(0) - square.charCodeAt(1);
    return [x, y];
}

ChessValidator.prototype.coordinatesToSquare = function(x, y) {
    return String.fromCharCode(x + 'a'.charCodeAt(0), '8'.charCodeAt(0) - y);
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
    if (this.isInsideBoard(x, y)) {
        return this.board[x][y];
    } else {
        return null;
    }
}

ChessValidator.prototype.setPieceAtSquare = function(square, piece) {
    var coords = this.squareToCoordinates(square);
    this.setPieceAt(coords[0], coords[1], piece);
}

ChessValidator.prototype.setPieceAt = function(x, y, piece) {
    if (this.isInsideBoard(x, y)) {
        this.board[x][y] = piece;
    }
}

ChessValidator.prototype.isInsideBoard = function(x, y) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

ChessValidator.prototype.isValidSquare = function(square) {
    return square.length == 2 && 'a' <= square[0] && square[0] <= 'z' && '1' <= square[1] && square[1] <= '8';
}

ChessValidator.prototype.getPawnAttackingSquares = function(x, y) {
    var self = this;
    var squares = [];
    var color = this.getPieceAt(x, y)[0];
    var dy = color == WHITE ? -1 : +1;

    [-1, +1].forEach(function(dx) {
        var nx = x + dx, ny = y + dy;

        if (self.isInsideBoard(nx, ny)) {
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

        if (this.isInsideBoard(nx, ny)) {
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

            while (self.isInsideBoard(nx, ny)) {
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

        while (this.isInsideBoard(nx, ny)) {
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

                if (this.isInsideBoard(nx, ny)) {
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

    console.log('Forgot a piece? ' + piece);
    return [];
}

ChessValidator.prototype.isInCheck = function(player) {
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
            if (this.getPieceAt(x, y)[0] == other && arrayContains(this.getAttackingSquares(x, y), king)) {
                return true;
            }
        }
    }

    return false;
}

ChessValidator.prototype.checkCastle = function(move) {
    if (move.length >= 7) {
        var column = move[0] == WHITE ? '1' : '8';
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);

        if (from == 'e' + column && to[1] == column) {
            if (move.charCodeAt(5) < 'd'.charCodeAt(0)) {
                move = move.substring(0, 2) + '0-0-0';
            } else if (move.charCodeAt(5) > 'f'.charCodeAt(0)) {
                move = move.substring(0, 2) + '0-0';
            }
        }
    }

    return move;
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
 * TODO: check for invalid move notation (sent by client, so can't be trusted)
 * TODO: pawns can only move diagonally when capturing; also check en passant
 */
ChessValidator.prototype.isLegalMove = function(move) {
    move = this.checkCastle(move);

    // Can't move on your opponent's turn
    if (move[0] != this.turn) {
        return false;
    }

    if (move[2] == '0') {
        // Case 3: castling

        var column = move[0] == WHITE ? '1' : '8';

        if (move.length == 5) {
            // Kingside castle

            if (this.getPieceAtSquare('e' + column) != move[0] + KING || this.getPieceAtSquare('h' + column) != move[0] + ROOK) {
                return false;
            }

            // Verify the king and rook haven't moved
            if (this.hasMoved['e' + column] || this.hasMoved['h' + column]) {
                return false;
            }

            if (!this.isEmptyAtSquare('f' + column) || !this.isEmptyAtSquare('g' + column)) {
                return false;
            }

            // Verify no position is in check

            if (this.isInCheck(move[0])) {
                return false;
            }

            var originalBoard = this.simulateMove(move[0] + '_' + 'e' + column + '-' + 'f' + column);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.simulateMove(move[0] + '_' + 'f' + column + '-' + 'g' + column);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.undoMove(originalBoard);
            return true;
        } else {
            // Queenside castle
            if (this.getPieceAtSquare('e' + column) != move[0] + KING || this.getPieceAtSquare('a' + column) != move[0] + ROOK) {
                return false;
            }

            // Verify the king and rook haven't moved
            if (this.hasMoved['e' + column] || this.hasMoved['a' + column]) {
                return false;
            }

            if (!this.isEmptyAtSquare('b' + column) || !this.isEmptyAtSquare('c' + column) || !this.isEmptyAtSquare('d' + column)) {
                return false;
            }

            // Verify no position is in check

            if (this.isInCheck(move[0])) {
                return false;
            }

            var originalBoard = this.simulateMove(move[0] + '_' + 'e' + column + '-' + 'd' + column);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.simulateMove(move[0] + '_' + 'd' + column + '-' + 'c' + column);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.undoMove(originalBoard);
            return true;
        }
    } else if (isLowerCase(move[2])) {
        // Case 1: regular move

        var from = move.substring(2, 4);
        var to = move.substring(5, 7);
        var fromPiece = this.getPieceAtSquare(from);
        var toPiece = this.getPieceAtSquare(to);
        var fromCoords = this.squareToCoordinates(from);
        var toCoords = this.squareToCoordinates(to);

        // Starting square must have a piece of the right color
        if (fromPiece[0] != move[0]) {
            return false;
        }

        // Starting piece color cannot be the same as ending piece color
        // Also prevents moving to the same square
        if (fromPiece[0] == toPiece[0]) {
            return false;
        }

        // Must be a valid move for the type of piece

        // Check pawn moving forward specifically; everything else can just use getAttackingSquares
        if (fromPiece[1] == PAWN) {
            if (fromCoords[0] == toCoords[0]) {
                var x = fromCoords[0], y = fromCoords[1];
                var dir = move[0] == WHITE ? -1 : +1;
                var dy = toCoords[1] - y;

                // Can't move backwards
                if (dy * dir <= 0) {
                    return false;
                }

                // Can't move more than two steps
                if (Math.abs(dy) > 2) {
                    return false;
                } else if (Math.abs(dy) == 2) {
                    // Must be on the first row of pawns
                    if (fromCoords[1] != (move[0] == WHITE ? 6 : 1)) {
                        return false;
                    }

                    // Must have both squares clear
                    if (!this.isEmptyAt(x, y + dir) || !this.isEmptyAt(x, y + 2 * dir)) {
                        return false;
                    }
                } else if (Math.abs(dy) == 1) {
                    if (!this.isInsideBoard(x, y + dir) || !this.isEmptyAt(x, y + dir)) {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                // Can only move diagonally when capturing
                if (!arrayContains(this.getAttackingSquares(fromCoords[0], fromCoords[1]), toCoords)) {
                    return false;
                }

                if (this.isEmptyAt(toCoords[0], toCoords[1])) {
                    return false;
                }
            }
        } else {
            if (!arrayContains(this.getAttackingSquares(fromCoords[0], fromCoords[1]), toCoords)) {
                return false;
            }
        }
    } else {
        // Case 2: dropped piece

        var piece = move[2];
        var bankCount = this.bank[this.turn][piece];

        if (bankCount === undefined || bankCount <= 0) {
            return false;
        }

        // TODO: check for validity here too
        var square = move.substring(3, 5);

        if (!this.isEmptyAtSquare(square)) {
            return false;
        }
    }

    // Must not end up in check
    var previousBoard = this.simulateMove(move);
    var legal = !this.isInCheck(move[0]);
    this.undoMove(previousBoard);
    return legal;
}

ChessValidator.prototype.legalMoves = function(x, y) {

}

ChessValidator.prototype.simulateMove = function(move, skipCheckCastle) {
    if (!skipCheckCastle) {
        move = this.checkCastle(move);
    }

    var previousBoard = deepCopy(this.board);

    if (move[2] == '0') {
        // Case 3: castling
        var column = move[0] == WHITE ? '1' : '8';

        if (move.length == 5) {
            // Hack: move the king to g1 / g8 and move the rook to f1 / f8
            this.simulateMove(move[0] + '_e' + column + '-g' + column, true);
            this.simulateMove(move[0] + '_h' + column + '-f' + column, true);
        } else {
            this.simulateMove(move[0] + '_e' + column + '-c' + column, true);
            this.simulateMove(move[0] + '_a' + column + '-d' + column, true);
        }
    } else if (isLowerCase(move[2])) {
        // Case 1: regular move
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);
        this.setPieceAtSquare(to, this.getPieceAtSquare(from));
        this.setPieceAtSquare(from, EMPTY2);

        var coords = this.squareToCoordinates(to);

        // Pawn promotion (automatic queen for now)
        // TODO: enable underpromotion
        if (this.getPieceAtSquare(to)[1] == PAWN) {
            if ((move[0] == WHITE && coords[1] == 0) || (move[0] == BLACK && coords[1] == BOARD_SIZE - 1)) {
                this.setPieceAtSquare(to, move[0] + QUEEN);
            }
        }
    } else {
        // Case 2: dropped piece
        var piece = move[0] + move[2];
        var square = move.substring(3, 5);
        this.setPieceAtSquare(square, piece);
    }

    return previousBoard;
}

// To be used for highlighting as well
ChessValidator.prototype.fromAndToSquares = function(move) {
    if (move[2] == '0') {
        // Case 3: castling
        var column = move[0] == WHITE ? '1' : '8';

        if (move.length == 5) {
            return ['e' + column, 'g' + column];
        } else {
            return ['e' + column, 'c' + column];
        }
    } else if (isLowerCase(move[2])) {
        // Case 1: regular move
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);
        return [from, to];
    } else {
        // Case 2: dropped piece
        var piece = move[0] + move[2];
        var square = move.substring(3, 5);
        this.setPieceAtSquare(square, piece);
        // Decrement the bank
        this.bank[move[0]][move[2]]--;
        return [square, square];
    }
}

ChessValidator.prototype.undoMove = function(previousBoard) {
    this.board = deepCopy(previousBoard);
}

ChessValidator.prototype.makeMove = function(move) {
    move = this.checkCastle(move);

    // Call simulateMove
    if (this.isLegalMove(move)) {
        this.simulateMove(move);
        this.turn = this.turn == WHITE ? BLACK : WHITE;

        // Update hasMoved
        var squares = this.fromAndToSquares(move);
        var from = squares[0], to = squares[1];
        this.hasMoved[from] = this.hasMoved[to] = true;
        this.lastMove = move;
        return true;
    }

    return false;
}

var x = new ChessValidator();