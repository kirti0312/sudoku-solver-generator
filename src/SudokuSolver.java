package src;

import java.util.ArrayList;
import java.util.List;

public class SudokuSolver {

    public static class SolverStep {
        public int row;
        public int col;
        public int val;
        public String type; // "TRY", "BACKTRACK", "SUCCESS"

        public SolverStep(int r, int c, int v, String t) {
            this.row = r;
            this.col = c;
            this.val = v;
            this.type = t;
        }

        @Override
        public String toString() {
            return String.format("{\"row\":%d,\"col\":%d,\"val\":%d,\"type\":\"%s\"}", row, col, val, type);
        }
    }

    private final int[][] grid;
    private final List<SolverStep> steps;
    private int stepLimit = 20000; // Limit recorded steps to avoid OutOfMemory or huge JSON payloads
    private boolean limitExceeded = false;

    public SudokuSolver(int[][] board) {
        this.grid = new int[9][9];
        for (int r = 0; r < 9; r++) {
            System.arraycopy(board[r], 0, this.grid[r], 0, 9);
        }
        this.steps = new ArrayList<>();
    }

    public boolean solve() {
        return solve(0, 0, false);
    }

    public boolean solveWithTracking() {
        this.steps.clear();
        this.limitExceeded = false;
        return solve(0, 0, true);
    }

    private boolean solve(int row, int col, boolean track) {
        if (col == 9) {
            col = 0;
            row++;
            if (row == 9) {
                return true;
            }
        }

        if (grid[row][col] != 0) {
            return solve(row, col + 1, track);
        }

        for (int val = 1; val <= 9; val++) {
            if (isValid(grid, row, col, val)) {
                grid[row][col] = val;
                if (track && !limitExceeded) {
                    if (steps.size() < stepLimit) {
                        steps.add(new SolverStep(row, col, val, "TRY"));
                    } else {
                        limitExceeded = true;
                    }
                }

                if (solve(row, col + 1, track)) {
                    return true;
                }

                grid[row][col] = 0;
                if (track && !limitExceeded) {
                    if (steps.size() < stepLimit) {
                        steps.add(new SolverStep(row, col, 0, "BACKTRACK"));
                    } else {
                        limitExceeded = true;
                    }
                }
            }
        }
        return false;
    }

    public static boolean isValid(int[][] board, int row, int col, int val) {
        for (int i = 0; i < 9; i++) {
            if (board[row][i] == val) return false;
            if (board[i][col] == val) return false;
            if (board[row - row % 3 + i / 3][col - col % 3 + i % 3] == val) return false;
        }
        return true;
    }

    public int[][] getGrid() {
        return grid;
    }

    public List<SolverStep> getSteps() {
        return steps;
    }

    public boolean isLimitExceeded() {
        return limitExceeded;
    }

    // Helper method to count solutions (used for uniqueness checking in generator)
    public static int countSolutions(int[][] board, int maxCount) {
        int[][] temp = new int[9][9];
        for (int r = 0; r < 9; r++) {
            System.arraycopy(board[r], 0, temp[r], 0, 9);
        }
        return solveAndCount(temp, 0, 0, 0, maxCount);
    }

    private static int solveAndCount(int[][] board, int row, int col, int count, int maxCount) {
        if (col == 9) {
            col = 0;
            row++;
            if (row == 9) {
                return count + 1;
            }
        }

        if (board[row][col] != 0) {
            return solveAndCount(board, row, col + 1, count, maxCount);
        }

        for (int val = 1; val <= 9; val++) {
            if (isValid(board, row, col, val)) {
                board[row][col] = val;
                count = solveAndCount(board, row, col + 1, count, maxCount);
                board[row][col] = 0;

                if (count >= maxCount) {
                    return count;
                }
            }
        }
        return count;
    }
}
