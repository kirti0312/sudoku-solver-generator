package src;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class SudokuGenerator {

    private final int[][] solution;
    private final int[][] puzzle;
    private final Random random;

    public SudokuGenerator() {
        this.solution = new int[9][9];
        this.puzzle = new int[9][9];
        this.random = new Random();
    }

    public void generate(String difficulty) {
        // Step 1: Generate a fully solved board
        fillBoard();

        // Copy solution to puzzle
        for (int r = 0; r < 9; r++) {
            System.arraycopy(solution[r], 0, puzzle[r], 0, 9);
        }

        // Step 2: Determine target empty cells based on difficulty
        int targetEmpty;
        switch (difficulty.toLowerCase()) {
            case "easy":
                targetEmpty = 36 + random.nextInt(6); // 36 to 41 empty cells (40-45 clues)
                break;
            case "medium":
                targetEmpty = 44 + random.nextInt(6); // 44 to 49 empty cells (32-37 clues)
                break;
            case "hard":
                targetEmpty = 52 + random.nextInt(6); // 52 to 57 empty cells (24-29 clues)
                break;
            default:
                targetEmpty = 40;
                break;
        }

        // Step 3: Remove cells while maintaining a unique solution
        removeCells(targetEmpty);
    }

    private boolean fillBoard() {
        // Clear board
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                solution[r][c] = 0;
            }
        }
        return fillBoardRecursive(0, 0);
    }

    private boolean fillBoardRecursive(int row, int col) {
        if (col == 9) {
            col = 0;
            row++;
            if (row == 9) {
                return true;
            }
        }

        List<Integer> numbers = new ArrayList<>();
        for (int i = 1; i <= 9; i++) {
            numbers.add(i);
        }
        Collections.shuffle(numbers, random);

        for (int val : numbers) {
            if (SudokuSolver.isValid(solution, row, col, val)) {
                solution[row][col] = val;
                if (fillBoardRecursive(row, col + 1)) {
                    return true;
                }
                solution[row][col] = 0;
            }
        }
        return false;
    }

    private void removeCells(int targetEmpty) {
        // Create a list of all 81 positions and shuffle it
        List<Integer> positions = new ArrayList<>();
        for (int i = 0; i < 81; i++) {
            positions.add(i);
        }
        Collections.shuffle(positions, random);

        int emptyCount = 0;
        for (int pos : positions) {
            if (emptyCount >= targetEmpty) {
                break;
            }

            int r = pos / 9;
            int c = pos % 9;

            if (puzzle[r][c] != 0) {
                int backup = puzzle[r][c];
                puzzle[r][c] = 0;

                // Check if puzzle still has a unique solution (only 1 solution)
                // We pass 2 as maxCount because we only care if it's more than 1
                if (SudokuSolver.countSolutions(puzzle, 2) == 1) {
                    emptyCount++;
                } else {
                    // Put it back if removing it makes solution non-unique
                    puzzle[r][c] = backup;
                }
            }
        }
    }

    public int[][] getSolution() {
        return solution;
    }

    public int[][] getPuzzle() {
        return puzzle;
    }
}
