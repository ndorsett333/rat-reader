<?php
// Database configuration for Bluehost remote connection
class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $conn;

    public function __construct() {
        // Load configuration from environment variables or config file
        $this->host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
        $this->db_name = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? '';
        $this->username = $_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME') ?? '';
        $this->password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?? '';
        $this->port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?? 3306;

        // Fallback to local config file if environment variables not set
        if (empty($this->db_name) && file_exists(__DIR__ . '/database.local.php')) {
            $localConfig = require __DIR__ . '/database.local.php';
            $this->host = $localConfig['host'];
            $this->db_name = $localConfig['db_name'];
            $this->username = $localConfig['username'];
            $this->password = $localConfig['password'];
            $this->port = $localConfig['port'];
        }
    }

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 30
                )
            );
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
            error_log("Database connection failed: " . $exception->getMessage());
        }
        
        return $this->conn;
    }
}
?>