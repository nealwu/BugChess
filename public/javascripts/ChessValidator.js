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

function assert(result, description) {
    if (!result) {
        console.log(description);
        alert(description);
    }
}

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
        if (array[i] == elem || arraysEqual(array[i], elem)) {
            return true;
        }
    }

    return false;
}

function Timer(initial) {
    this.getFromMilliseconds(initial);
}

Timer.INITIAL_MINUTES = 5;
Timer.INITIAL_MILLISECONDS = Timer.INITIAL_MINUTES * 60 * 1000

Timer.pad = function(seconds) {
    return seconds < 10 ? '0' + seconds : '' + seconds;
}

Timer.prototype.outOfTime = function() {
    return this.minutes == 0 && this.seconds == 0 && this.milliseconds == 0;
}

Timer.prototype.toString = function() {
    return this.minutes + ':' + Timer.pad(this.seconds) + '.' + Math.floor(this.milliseconds / 100);
}

Timer.prototype.toMilliseconds = function() {
    return this.minutes * 60 * 1000 + this.seconds * 1000 + this.milliseconds;
}

Timer.prototype.getFromMilliseconds = function(milliseconds) {
    this.minutes = Math.floor(milliseconds / 1000 / 60);
    this.seconds = Math.floor(milliseconds / 1000 % 60);
    this.milliseconds = milliseconds % 1000;

    if (this.minutes < 0) {
        this.minutes = this.seconds = this.milliseconds = 0;
    }
}

Timer.prototype.subtractMilliseconds = function(milliseconds) {
    this.getFromMilliseconds(this.toMilliseconds() - milliseconds);
}

Timer.prototype.updateTime = function() {
    var now = (new Date()).valueOf();
    this.subtractMilliseconds(now - this.startTime);
    this.startTime = now;
}

function ChessPiece(name) {
    this.name = name;
    this.originalPiece = name[1];
    this.hasMoved = false;
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

ChessValidator.areValidCoordinates = function(x, y) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

ChessValidator.isValidSquare = function(square) {
    return square.length == 2 && 'a' <= square[0] && square[0] <= 'z' && '1' <= square[1] && square[1] <= '8';
}

ChessValidator.isValidPiece = function(piece) {
    assert(piece.length == 1);
    return piece == KING || piece == QUEEN || piece == ROOK || piece == BISHOP || piece == KNIGHT || piece == PAWN;
}

ChessValidator.isValidPlayer = function(player) {
    return player == WHITE || player == BLACK;
}

ChessValidator.isValidName = function(name, empty) {
    if (empty && name == EMPTY2) {
        return true;
    }

    return name.length == 2 && ChessValidator.isValidPlayer(name[0]) && ChessValidator.isValidPiece(name[1]);
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

    var self = this;

    ChessValidator.allSquares().forEach(function(square) {
        self.setPieceAtSquare(square, EMPTY2);
    });

    for (square in STARTING_BOARD) {
        this.setPieceAtSquare(square, STARTING_BOARD[square]);
    }

    // Set up both banks
    this.bank = {};
    this.bank[WHITE] = {};
    this.bank[BLACK] = {};
    this.bank[WHITE][QUEEN] = this.bank[WHITE][ROOK] = this.bank[WHITE][BISHOP] = this.bank[WHITE][KNIGHT] = this.bank[WHITE][PAWN] = 0;
    this.bank[BLACK][QUEEN] = this.bank[BLACK][ROOK] = this.bank[BLACK][BISHOP] = this.bank[BLACK][KNIGHT] = this.bank[BLACK][PAWN] = 0;

    this.timers = {};
    this.timers[WHITE] = new Timer(Timer.INITIAL_MILLISECONDS);
    this.timers[BLACK] = new Timer(Timer.INITIAL_MILLISECONDS);

    this.turn = WHITE;
    this.lastMove = '';
    this.firstMove = true;
}

ChessValidator.prototype.bankToString = function(bank) {
    return QUEEN + ':' + bank[QUEEN] + ' ' +
            ROOK + ':' + bank[ROOK] + ' ' +
            BISHOP + ':' + bank[BISHOP] + ' ' +
            KNIGHT + ':' + bank[KNIGHT] + ' ' +
            PAWN + ':' + bank[PAWN];
}

ChessValidator.prototype.printBoard = function() {
    console.log(BLACK + ' = ' + this.bankToString(this.bank[BLACK]));

    for (var y = 0; y < BOARD_SIZE; y++) {
        var line = '';

        for (var x = 0; x < BOARD_SIZE; x++) {
            line += this.getPieceAt(x, y).name + ' ';
        }

        console.log(line);
    }

    console.log(WHITE + ' = ' + this.bankToString(this.bank[WHITE]));
}

// Note: square -- 'a1' to 'h8'; coordinates -- x = 0, y = 0 to x = 7, y = 7
// x increases to the right; y increases down. (0, 0) = 'a8'; (7, 7) = 'h1'
ChessValidator.prototype.squareToCoordinates = function(square) {
    assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessValidator.squareToCoordinates: ' + square);
    var x = square.charCodeAt(0) - 'a'.charCodeAt(0);
    var y = '8'.charCodeAt(0) - square.charCodeAt(1);
    return [x, y];
}

ChessValidator.prototype.coordinatesToSquare = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.coordinatesToSquare: ' + x + ', ' + y);
    return String.fromCharCode(x + 'a'.charCodeAt(0), '8'.charCodeAt(0) - y);
}

ChessValidator.prototype.isEmptyAtSquare = function(square) {
    assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessValidator.isEmptyAtSquare: ' + square);
    return this.getPieceAtSquare(square).name == EMPTY2;
}

ChessValidator.prototype.isEmptyAt = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.isEmptyAt: ' + x + ', ' + y);
    return this.getPieceAt(x, y).name == EMPTY2;
}

ChessValidator.prototype.getPieceAtSquare = function(square) {
    assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessValidator.getPieceAtSquare: ' + square);
    var coords = this.squareToCoordinates(square);
    return this.getPieceAt(coords[0], coords[1]);
}

ChessValidator.prototype.getPieceAt = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getPieceAt: ' + x + ', ' + y);
    return this.board[x][y];
}

ChessValidator.prototype.setPieceAtSquare = function(square, name) {
    assert(ChessValidator.isValidSquare(square), 'Invalid square given to ChessValidator.setPieceAtSquare: ' + square);
    assert(ChessValidator.isValidName(name, true), 'Invalid name given to ChessValidator.setPieceAtSquare: ' + name);
    var coords = this.squareToCoordinates(square);
    this.setPieceAt(coords[0], coords[1], name);
}

ChessValidator.prototype.setPieceAt = function(x, y, name) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.setPieceAt: ' + x + ', ' + y);
    assert(ChessValidator.isValidName(name, true), 'Invalid name given to ChessValidator.setPieceAt: ' + name);

    if (ChessValidator.areValidCoordinates(x, y)) {
        this.board[x][y] = new ChessPiece(name);
    }
}

ChessValidator.prototype.movePieceTo = function(from, to) {
    assert(ChessValidator.isValidSquare(from), 'Invalid square given to ChessValidator.movePieceTo: ' + from);
    assert(ChessValidator.isValidSquare(to), 'Invalid square given to ChessValidator.movePieceTo: ' + to);

    var fromCoords = this.squareToCoordinates(from);
    var toCoords = this.squareToCoordinates(to);
    this.board[toCoords[0]][toCoords[1]] = this.board[fromCoords[0]][fromCoords[1]];
    this.setPieceAtSquare(from, EMPTY2);
}

ChessValidator.prototype.getPawnAttackingSquares = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getPawnAttackingSquares: ' + x + ', ' + y);

    var squares = [];
    var color = this.getPieceAt(x, y).name[0];
    var dy = color == WHITE ? -1 : +1;

    [-1, +1].forEach(function(dx) {
        var nx = x + dx, ny = y + dy;

        if (ChessValidator.areValidCoordinates(nx, ny)) {
            squares.push([nx, ny]);
        }
    });

    return squares;
}

ChessValidator.prototype.getKnightAttackingSquares = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getKnightAttackingSquares: ' + x + ', ' + y);

    var squares = [];
    var dx = [-2, -2, -1, -1, +1, +1, +2, +2];
    var dy = [-1, +1, -2, +2, -2, +2, -1, +1];

    for (i in dx) {
        var nx = x + dx[i], ny = y + dy[i];

        if (ChessValidator.areValidCoordinates(nx, ny)) {
            squares.push([nx, ny]);
        }
    }

    return squares;
}

ChessValidator.prototype.getBishopAttackingSquares = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getBishopAttackingSquares: ' + x + ', ' + y);

    var self = this;
    var squares = [];

    [-1, +1].forEach(function(dx) {
        [-1, +1].forEach(function(dy) {
            var nx = x + dx, ny = y + dy;

            while (ChessValidator.areValidCoordinates(nx, ny)) {
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
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getRookAttackingSquares: ' + x + ', ' + y);

    var squares = [];
    var dx = [-1, +1, 0, 0];
    var dy = [0, 0, -1, +1];

    for (i in dx) {
        var nx = x + dx[i], ny = y + dy[i];

        while (ChessValidator.areValidCoordinates(nx, ny)) {
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
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getQueenAttackingSquares: ' + x + ', ' + y);
    return this.getBishopAttackingSquares(x, y).concat(this.getRookAttackingSquares(x, y));
}

ChessValidator.prototype.getKingAttackingSquares = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getKingAttackingSquares: ' + x + ', ' + y);
    var squares = [];

    for (var dx = -1; dx <= +1; dx++) {
        for (var dy = -1; dy <= +1; dy++) {
            if (dx != 0 || dy != 0) {
                var nx = x + dx, ny = y + dy;

                if (ChessValidator.areValidCoordinates(nx, ny)) {
                    squares.push([nx, ny]);
                }
            }
        }
    }

    return squares;
}

// Get the squares attacked by a certain piece. Includes friendly pieces.
ChessValidator.prototype.getAttackingSquares = function(x, y) {
    assert(ChessValidator.areValidCoordinates(x, y), 'Invalid coordinates given to ChessValidator.getAttackingSquares: ' + x + ', ' + y);
    var piece = this.getPieceAt(x, y).name[1];

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

    assert(false, 'Invalid piece: ' + piece);
    return [];
}

ChessValidator.prototype.isInCheck = function(player) {
    assert(ChessValidator.isValidPlayer(player), 'Invalid player in ChessValidator.isInCheck: ' + player);
    var other = player == WHITE ? BLACK : WHITE;
    var king = [-1, -1];

    for (var x = 0; x < BOARD_SIZE; x++) {
        for (var y = 0; y < BOARD_SIZE; y++) {
            if (this.getPieceAt(x, y).name == player + KING) {
                king = [x, y];
            }
        }
    }

    assert(king[0] != -1 && king[1] != -1, 'King not found in ChessValidator.isInCheck');

    for (var x = 0; x < BOARD_SIZE; x++) {
        for (var y = 0; y < BOARD_SIZE; y++) {
            if (this.getPieceAt(x, y).name[0] == other && arrayContains(this.getAttackingSquares(x, y), king)) {
                return true;
            }
        }
    }

    return false;
}

ChessValidator.prototype.checkForCastle = function(move) {
    if (move.length >= 7) {
        var row = move[0] == WHITE ? '1' : '8';
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);

        if (from == 'e' + row && to[1] == row) {
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
    move = this.checkForCastle(move);

    // Can't move on your opponent's turn.
    if (move[0] != this.turn) {
        return false;
    }

    if (!this.firstMove) {
        this.timers[this.turn].updateTime();

        // Illegal if out of time
        if (this.timers[this.turn].outOfTime()) {
            return false;
        }
    }

    if (move[2] == '0') {
        // Case 3: castling

        var row = move[0] == WHITE ? '1' : '8';

        if (move.length == 5) {
            // Kingside castle

            if (this.getPieceAtSquare('e' + row).name != move[0] + KING || this.getPieceAtSquare('h' + row).name != move[0] + ROOK) {
                return false;
            }

            // Verify the king and rook haven't moved
            if (this.getPieceAtSquare('e' + row).hasMoved || this.getPieceAtSquare('h' + row).hasMoved) {
                return false;
            }

            if (!this.isEmptyAtSquare('f' + row) || !this.isEmptyAtSquare('g' + row)) {
                return false;
            }

            // Verify no position is in check

            if (this.isInCheck(move[0])) {
                return false;
            }

            var originalBoard = this.simulateMove(move[0] + '_' + 'e' + row + '-' + 'f' + row, true);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.simulateMove(move[0] + '_' + 'f' + row + '-' + 'g' + row, true);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.undoMove(originalBoard);
            return true;
        } else {
            // Queenside castle

            if (this.getPieceAtSquare('e' + row).name != move[0] + KING || this.getPieceAtSquare('a' + row).name != move[0] + ROOK) {
                return false;
            }

            // Verify the king and rook haven't moved
            if (this.getPieceAtSquare('e' + row).hasMoved || this.getPieceAtSquare('a' + row).hasMoved) {
                return false;
            }

            if (!this.isEmptyAtSquare('b' + row) || !this.isEmptyAtSquare('c' + row) || !this.isEmptyAtSquare('d' + row)) {
                return false;
            }

            // Verify no position is in check

            if (this.isInCheck(move[0])) {
                return false;
            }

            var originalBoard = this.simulateMove(move[0] + '_' + 'e' + row + '-' + 'd' + row, true);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.simulateMove(move[0] + '_' + 'd' + row + '-' + 'c' + row, true);

            if (this.isInCheck(move[0])) {
                this.undoMove(originalBoard);
                return false;
            }

            this.undoMove(originalBoard);
            return true;
        }
    } else if (isLowerCase(move[2])) {
        // Case 1: regular move

        // Need to be careful
        if (move.length < 7) {
            return false;
        }

        var from = move.substring(2, 4);
        var to = move.substring(5, 7);

        if (!ChessValidator.isValidSquare(from) || !ChessValidator.isValidSquare(to)) {
            return false;
        }

        if (this.isEmptyAtSquare(from)) {
            return false;
        }

        var fromPiece = this.getPieceAtSquare(from).name;
        var toPiece = this.getPieceAtSquare(to).name;
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
                    // Must have not yet moved
                    if (this.getPieceAtSquare(from).hasMoved) {
                        return false;
                    }

                    // Must have both squares clear
                    if (!this.isEmptyAt(x, y + dir) || !this.isEmptyAt(x, y + 2 * dir)) {
                        return false;
                    }
                } else if (Math.abs(dy) == 1) {
                    if (!this.isEmptyAt(x, y + dir)) {
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

                // TODO: en passant
                if (this.isEmptyAt(toCoords[0], toCoords[1])) {
                    // Use the y-coordinate of the from to get the en passant pawn
                    var dir = move[0] == WHITE ? -1 : +1;
                    var passant = this.getPieceAt(toCoords[0], fromCoords[1]).name;
                    var passantFromSquare = this.coordinatesToSquare(toCoords[0], toCoords[1] + dir);
                    var passantToSquare = this.coordinatesToSquare(toCoords[0], fromCoords[1]);
                    var passantMove = (move[0] == WHITE ? BLACK : WHITE) + '_' + passantFromSquare + '-' + passantToSquare;
                    return passant[1] == PAWN && this.lastMove == passantMove;
                }
            }
        } else {
            if (!arrayContains(this.getAttackingSquares(fromCoords[0], fromCoords[1]), toCoords)) {
                return false;
            }
        }
    } else {
        // Case 2: dropped piece

        if (move.length < 5) {
            return false;
        }

        var piece = move[2];
        assert(ChessValidator.isValidPiece(piece), 'Invalid piece in ChessValidator.isLegalMove: ' + piece);
        var bankCount = this.bank[this.turn][piece];

        if (bankCount === undefined || bankCount <= 0) {
            return false;
        }

        var square = move.substring(3, 5);

        if (!ChessValidator.isValidSquare(square) || !this.isEmptyAtSquare(square)) {
            return false;
        }

        // Prevent pawns from being dropped on the first or last row
        if (piece == PAWN && (square[1] == '1' || square[1] == '8')) {
            return false;
        }
    }

    // Must not end up in check
    var previousBoard = this.simulateMove(move, true);
    var legal = !this.isInCheck(move[0]);
    this.undoMove(previousBoard);
    return legal;
}

ChessValidator.prototype.legalMoves = function(x, y) {
// getAttackingSquares for everything, and also move forward once + twice for pawns
// Then check isLegalMove, add to set
// Also dropping pieces
// Also two potential castling moves
}

ChessValidator.prototype.isEnPassant = function(move) {
    if (isLowerCase(move[2]) && move.length >= 7) {
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);

        if (ChessValidator.isValidSquare(from) && ChessValidator.isValidSquare(to)) {
            var fromCoords = this.squareToCoordinates(from);
            var toCoords = this.squareToCoordinates(to);
            var name = this.getPieceAtSquare(from).name;

            if (name[1] == PAWN && fromCoords[0] != toCoords[0] && this.isEmptyAtSquare(to)) {
                return true;
            }
        }
    }

    return false;
}

// TODO: simulateMove should return a list of what was captured
ChessValidator.prototype.simulateMove = function(move, castleHack) {
    if (castleHack === undefined || !castleHack) {
        move = this.checkForCastle(move);

        if (!this.isLegalMove(move)) {
            return this.board;
        }
    }

    var previousBoard = deepCopy(this.board);

    if (move[2] == '0') {
        // Case 3: castling
        var row = move[0] == WHITE ? '1' : '8';

        if (move.length == 5) {
            // Hack: move the king to g1 / g8 and move the rook to f1 / f8
            this.simulateMove(move[0] + '_e' + row + '-g' + row, true);
            this.simulateMove(move[0] + '_h' + row + '-f' + row, true);
        } else {
            this.simulateMove(move[0] + '_e' + row + '-c' + row, true);
            this.simulateMove(move[0] + '_a' + row + '-d' + row, true);
        }
    } else if (isLowerCase(move[2])) {
        // Case 1: regular move
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);

        if (!ChessValidator.isValidSquare(from) || !ChessValidator.isValidSquare(to)) {
            return previousBoard;
        }

        var fromCoords = this.squareToCoordinates(from);
        var toCoords = this.squareToCoordinates(to);
        var name = this.getPieceAtSquare(from).name;

        // Check for en passant
        if (this.isEnPassant(move)) {
            this.setPieceAt(toCoords[0], fromCoords[1], EMPTY2);
        }

        this.movePieceTo(from, to);

        // Pawn promotion (automatic queen for now)
        // TODO: enable underpromotion
        if (this.getPieceAtSquare(to).name[1] == PAWN) {
            if ((move[0] == WHITE && toCoords[1] == 0) || (move[0] == BLACK && toCoords[1] == BOARD_SIZE - 1)) {
                this.setPieceAtSquare(to, move[0] + QUEEN);
                this.getPieceAtSquare(to).originalPiece = PAWN;
            }
        }
    } else {
        // Case 2: dropped piece
        var name = move[0] + move[2];
        var square = move.substring(3, 5);

        if (!ChessValidator.isValidSquare(square)) {
            return previousBoard;
        }

        this.setPieceAtSquare(square, name);
    }

    return previousBoard;
}

// To be used for highlighting as well
ChessValidator.prototype.fromAndToSquares = function(move) {
    if (move[2] == '0') {
        // Case 3: castling
        var row = move[0] == WHITE ? '1' : '8';

        if (move.length == 5) {
            return ['e' + row, 'g' + row];
        } else {
            return ['e' + row, 'c' + row];
        }
    } else if (isLowerCase(move[2])) {
        // Case 1: regular move
        var from = move.substring(2, 4);
        var to = move.substring(5, 7);
        return [from, to];
    } else {
        // Case 2: dropped piece
        var square = move.substring(3, 5);
        return [square, square];
    }
}

ChessValidator.prototype.undoMove = function(previousBoard) {
    // TODO: probably don't need deepCopy here?
    this.board = deepCopy(previousBoard);
}

ChessValidator.prototype.makeMove = function(move) {
    if (this.isLegalMove(move)) {
        var squares = this.fromAndToSquares(move);
        var from = squares[0], to = squares[1];

        // TODO: capture and en passant needs to be sent to the other board

        // Check for captures; send the capture to the other board's bank
        if (this.otherValidator !== undefined && isLowerCase(move[2])) {
            var chessPiece = this.getPieceAtSquare(to);

            if (this.isEnPassant(move)) {
                var fromCoords = this.squareToCoordinates(from);
                var toCoords = this.squareToCoordinates(to);
                chessPiece = this.getPieceAt(toCoords[0], fromCoords[1]);
            }

            var name = chessPiece.name;

            if (name != EMPTY2) {
                var player = name[0];
                var originalPiece = chessPiece.originalPiece;
                this.otherValidator.bank[player][originalPiece]++;
            }
        }

        this.simulateMove(move);
        this.turn = this.turn == WHITE ? BLACK : WHITE;

        // Modify bank for dropped pieces
        if (move[2] != '0' && !isLowerCase(move[2])) {
            var player = move[0];
            var piece = move[2];
            this.bank[player][piece]--;
        }

        // Update hasMoved
        this.getPieceAtSquare(from).hasMoved = this.getPieceAtSquare(to).hasMoved = true;
        this.lastMove = move;

        // Update timers
        var now = (new Date()).valueOf();
        this.timers[this.turn].startTime = now;

        if (this.firstMove) {
            this.firstMove = false;

            // Start the timer on the other board
            if (this.otherValidator) {
                this.otherValidator.firstMove = false;
                this.otherValidator.timers[this.otherValidator.turn].startTime = now;
            }
        }
        return true;
    }

    return false;
}

// Preserve prototypes; sort of hacky
function fixPrototypes(validator) {
    validator.__proto__ = ChessValidator.prototype;
    validator.timers[WHITE].__proto__ = Timer.prototype;
    validator.timers[BLACK].__proto__ = Timer.prototype;
}

exports = {ChessValidator: ChessValidator, fixPrototypes: fixPrototypes};

// Hack: will only be true if on the server
if (typeof module != 'undefined') {
    module.exports = exports;
    $ = require('jquery');
}