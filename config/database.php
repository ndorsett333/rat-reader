<?php
// Database configuration for Bluehost
// You'll need to replace these values with your actual Bluehost database credentials

class Database {
    private $host = 'localhost'; // Usually 'localhost' for Bluehost
    private $db_name = 'your_database_name'; // Replace with your database name
    private $username = 'your_db_username'; // Replace with your database username  
    private $password = 'your_db_password'; // Replace with your database password
    private $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
            );
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        
        return $this->conn;
    }
}
?>