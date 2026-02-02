<?php
// Test script to verify database connection to Bluehost
require_once 'config/database.php';

echo "<h2>🐀 Rat Reader - Database Connection Test</h2>\n";

try {
    $database = new Database();
    $connection = $database->getConnection();
    
    if ($connection) {
        echo "<p style='color: green;'>✅ Successfully connected to Bluehost database!</p>\n";
        
        // Test if tables exist
        $stmt = $connection->prepare("SHOW TABLES");
        $stmt->execute();
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo "<h3>Database Tables:</h3>\n";
        if (empty($tables)) {
            echo "<p style='color: orange;'>⚠️ No tables found. You need to run the schema.sql file.</p>\n";
        } else {
            echo "<ul>\n";
            foreach ($tables as $table) {
                echo "<li>$table</li>\n";
            }
            echo "</ul>\n";
        }
        
        // Test basic query - Fixed SQL syntax
        $stmt = $connection->prepare("SELECT NOW() as server_time");
        $stmt->execute();
        $result = $stmt->fetch();
        echo "<p>Current server time: " . $result['server_time'] . "</p>\n";
        
        echo "<p style='color: green;'>🎉 Database setup is complete and working!</p>\n";
        
    } else {
        echo "<p style='color: red;'>❌ Failed to connect to database</p>\n";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Connection error: " . $e->getMessage() . "</p>\n";
}
?>

<style>
body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
h2 { color: #2196F3; }
</style>