package src;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

public class App {

    private static final int PORT = 8080;

    public static void main(String[] args) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
            server.createContext("/", new StaticFileHandler());
            server.createContext("/api/generate", new GenerateHandler());
            server.createContext("/api/solve", new SolveHandler());
            server.setExecutor(null); // default executor
            System.out.println("=================================================");
            System.out.println("Sudoku DSA Project Backend Server Started!");
            System.out.println("Open your browser and navigate to:");
            System.out.println("http://localhost:" + PORT);
            System.out.println("=================================================");
            server.start();
        } catch (IOException e) {
            System.err.println("Failed to start server: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Handler for serving static files (HTML, CSS, JS)
    private static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String pathStr = exchange.getRequestURI().getPath();
            if (pathStr.equals("/")) {
                pathStr = "/index.html";
            }

            // Prevent path traversal vulnerability
            if (pathStr.contains("..")) {
                sendError(exchange, 400, "Bad Request");
                return;
            }

            Path filePath = Paths.get("web", pathStr.substring(1));
            if (!Files.exists(filePath) || Files.isDirectory(filePath)) {
                sendError(exchange, 404, "404 Not Found: " + pathStr);
                return;
            }

            String contentType = getContentType(pathStr);
            exchange.getResponseHeaders().set("Content-Type", contentType);

            byte[] bytes = Files.readAllBytes(filePath);
            exchange.sendResponseHeaders(200, bytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(bytes);
            os.close();
        }

        private String getContentType(String path) {
            if (path.endsWith(".html")) return "text/html; charset=utf-8";
            if (path.endsWith(".css")) return "text/css; charset=utf-8";
            if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
            if (path.endsWith(".png")) return "image/png";
            if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
            if (path.endsWith(".svg")) return "image/svg+xml";
            if (path.endsWith(".ico")) return "image/x-icon";
            return "application/octet-stream";
        }
    }

    // Handler for generating a new Sudoku
    private static class GenerateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendError(exchange, 405, "Method Not Allowed");
                return;
            }

            // Parse difficulty
            String query = exchange.getRequestURI().getQuery();
            String difficulty = "medium";
            if (query != null && query.contains("difficulty=")) {
                String[] parts = query.split("difficulty=");
                if (parts.length > 1) {
                    difficulty = parts[1].split("&")[0];
                }
            }

            long startTime = System.nanoTime();
            SudokuGenerator generator = new SudokuGenerator();
            generator.generate(difficulty);
            long endTime = System.nanoTime();
            double durationMs = (endTime - startTime) / 1_000_000.0;

            String json = String.format(
                    "{\"puzzle\":%s,\"solution\":%s,\"difficulty\":\"%s\",\"genTimeMs\":%.3f}",
                    boardToJson(generator.getPuzzle()),
                    boardToJson(generator.getSolution()),
                    difficulty,
                    durationMs
            );

            sendJson(exchange, json);
        }
    }

    // Handler for solving a Sudoku
    private static class SolveHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendError(exchange, 405, "Method Not Allowed");
                return;
            }

            // Read request body
            InputStream is = exchange.getRequestBody();
            String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            is.close();

            int[][] board;
            try {
                board = parseBoard(body);
            } catch (Exception e) {
                sendError(exchange, 400, "Invalid JSON puzzle grid: " + e.getMessage());
                return;
            }

            long startTime = System.nanoTime();
            SudokuSolver solver = new SudokuSolver(board);
            boolean success = solver.solveWithTracking();
            long endTime = System.nanoTime();
            double durationMs = (endTime - startTime) / 1_000_000.0;

            // Format steps JSON
            List<SudokuSolver.SolverStep> steps = solver.getSteps();
            StringBuilder stepsJson = new StringBuilder();
            stepsJson.append("[");
            for (int i = 0; i < steps.size(); i++) {
                stepsJson.append(steps.get(i).toString());
                if (i < steps.size() - 1) {
                    stepsJson.append(",");
                }
            }
            stepsJson.append("]");

            String json = String.format(
                    "{\"success\":%b,\"solution\":%s,\"steps\":%s,\"limitExceeded\":%b,\"solveTimeMs\":%.3f}",
                    success,
                    boardToJson(solver.getGrid()),
                    stepsJson.toString(),
                    solver.isLimitExceeded(),
                    durationMs
            );

            sendJson(exchange, json);
        }
    }

    // Helper to send JSON responses
    private static void sendJson(HttpExchange exchange, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(200, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    // Helper to send error responses
    private static void sendError(HttpExchange exchange, int status, String message) throws IOException {
        String json = String.format("{\"error\":\"%s\"}", message.replace("\"", "\\\""));
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    // Helper: Convert int[][] to JSON representation
    private static String boardToJson(int[][] board) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int r = 0; r < 9; r++) {
            sb.append("[");
            for (int c = 0; c < 9; c++) {
                sb.append(board[r][c]);
                if (c < 8) sb.append(",");
            }
            sb.append("]");
            if (r < 8) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    // Helper: Extract 81 integers from JSON string to construct 9x9 grid
    private static int[][] parseBoard(String json) {
        int[][] board = new int[9][9];
        int r = 0, c = 0;
        int num = 0;
        boolean insideNumber = false;
        for (int i = 0; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (Character.isDigit(ch)) {
                num = num * 10 + (ch - '0');
                insideNumber = true;
            } else {
                if (insideNumber) {
                    if (r < 9 && c < 9) {
                        board[r][c] = num;
                    }
                    num = 0;
                    insideNumber = false;
                    c++;
                    if (c == 9) {
                        c = 0;
                        r++;
                    }
                }
            }
        }
        if (insideNumber && r < 9 && c < 9) {
            board[r][c] = num;
        }
        return board;
    }
}
