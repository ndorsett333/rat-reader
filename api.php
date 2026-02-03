<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'config/database.php';

class RatReaderAPI {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        
        // Remove 'api.php' from path if present
        if (end($pathParts) === 'api.php') {
            array_pop($pathParts);
        }
        
        $endpoint = $pathParts[count($pathParts) - 1] ?? '';
        
        try {
            switch ($endpoint) {
                case 'register':
                    if ($method === 'POST') return $this->register();
                    break;
                case 'login':
                    if ($method === 'POST') return $this->login();
                    break;
                case 'logout':
                    if ($method === 'POST') return $this->logout();
                    break;
                case 'feeds':
                    if ($method === 'GET') return $this->getFeeds();
                    if ($method === 'POST') return $this->addFeed();
                    break;
                case 'articles':
                    if ($method === 'GET') return $this->getArticles();
                    break;
                case 'refresh':
                    if ($method === 'POST') return $this->refreshFeeds();
                    break;
                default:
                    $this->sendResponse(['error' => 'Endpoint not found'], 404);
            }
        } catch (Exception $e) {
            $this->sendResponse(['error' => 'Server error: ' . $e->getMessage()], 500);
        }
    }
    
    private function register() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['username']) || !isset($data['password'])) {
            $this->sendResponse(['error' => 'Missing required fields'], 400);
            return;
        }
        
        // Check if username already exists
        $stmt = $this->db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$data['username']]);
        if ($stmt->fetch()) {
            $this->sendResponse(['error' => 'Username already taken'], 400);
            return;
        }
        
        // Create user
        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        $stmt->execute([$data['username'], $passwordHash]);
        
        $userId = $this->db->lastInsertId();
        $token = $this->createSession($userId);
        
        $this->sendResponse([
            'success' => true,
            'user' => [
                'id' => $userId,
                'username' => $data['username']
            ],
            'token' => $token
        ]);
    }
    
    private function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['username']) || !isset($data['password'])) {
            $this->sendResponse(['error' => 'Missing username or password'], 400);
            return;
        }
        
        $stmt = $this->db->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
        $stmt->execute([$data['username']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            $this->sendResponse(['error' => 'Invalid credentials'], 401);
            return;
        }
        
        $token = $this->createSession($user['id']);
        
        $this->sendResponse([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username']
            ],
            'token' => $token
        ]);
    }
    
    private function logout() {
        $token = $this->getAuthToken();
        if ($token) {
            $stmt = $this->db->prepare("DELETE FROM user_sessions WHERE session_token = ?");
            $stmt->execute([$token]);
        }
        
        $this->sendResponse(['success' => true]);
    }
    
    private function getFeeds() {
        $userId = $this->authenticateRequest();
        if (!$userId) return;
        
        $stmt = $this->db->prepare("SELECT id, name, url, last_fetched, is_active FROM feeds WHERE user_id = ? AND is_active = 1");
        $stmt->execute([$userId]);
        $feeds = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendResponse(['feeds' => $feeds]);
    }
    
    private function addFeed() {
        $userId = $this->authenticateRequest();
        if (!$userId) return;
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['url'])) {
            $this->sendResponse(['error' => 'Feed URL is required'], 400);
            return;
        }
        
        $feedName = $data['name'] ?? $this->getFeedTitle($data['url']);
        
        $stmt = $this->db->prepare("INSERT INTO feeds (user_id, name, url) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $feedName, $data['url']]);
        
        $feedId = $this->db->lastInsertId();
        
        // Fetch initial articles
        $this->fetchFeedArticles($feedId, $data['url']);
        
        $this->sendResponse(['success' => true, 'feedId' => $feedId]);
    }
    
    private function getArticles() {
        $userId = $this->authenticateRequest();
        if (!$userId) return;
        
        $feedId = $_GET['feed_id'] ?? null;
        
        $query = "SELECT a.*, f.name as feed_name FROM articles a 
                  JOIN feeds f ON a.feed_id = f.id 
                  WHERE f.user_id = ? ";
        $params = [$userId];
        
        if ($feedId) {
            $query .= "AND a.feed_id = ? ";
            $params[] = $feedId;
        }
        
        $query .= "ORDER BY a.pub_date DESC LIMIT 50";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendResponse(['articles' => $articles]);
    }
    
    private function refreshFeeds() {
        $userId = $this->authenticateRequest();
        if (!$userId) return;
        
        $stmt = $this->db->prepare("SELECT id, url FROM feeds WHERE user_id = ? AND is_active = 1");
        $stmt->execute([$userId]);
        $feeds = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $refreshedCount = 0;
        foreach ($feeds as $feed) {
            if ($this->fetchFeedArticles($feed['id'], $feed['url'])) {
                $refreshedCount++;
            }
        }
        
        $this->sendResponse(['success' => true, 'refreshed' => $refreshedCount]);
    }
    
    private function createSession($userId) {
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $stmt = $this->db->prepare("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $token, $expiresAt]);
        
        return $token;
    }
    
    private function authenticateRequest() {
        $token = $this->getAuthToken();
        
        if (!$token) {
            $this->sendResponse(['error' => 'Authentication required'], 401);
            return false;
        }
        
        $stmt = $this->db->prepare("SELECT user_id FROM user_sessions WHERE session_token = ? AND expires_at > NOW()");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if (!$session) {
            $this->sendResponse(['error' => 'Invalid or expired token'], 401);
            return false;
        }
        
        return $session['user_id'];
    }
    
    private function getAuthToken() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (strpos($authHeader, 'Bearer ') === 0) {
            return substr($authHeader, 7);
        }
        
        return null;
    }
    
    private function getFeedTitle($url) {
        // Simple RSS title extraction
        $content = @file_get_contents($url);
        if ($content && preg_match('/<title>(.*?)<\/title>/i', $content, $matches)) {
            return trim(strip_tags($matches[1]));
        }
        return 'RSS Feed';
    }
    
    private function fetchFeedArticles($feedId, $url) {
        $content = @file_get_contents($url);
        if (!$content) return false;
        
        $xml = simplexml_load_string($content);
        if (!$xml) return false;
        
        $items = $xml->channel->item ?? $xml->entry ?? [];
        
        foreach ($items as $item) {
            $title = (string)($item->title ?? '');
            $description = (string)($item->description ?? $item->summary ?? '');
            $link = (string)($item->link ?? $item->id ?? '');
            $pubDate = (string)($item->pubDate ?? $item->published ?? '');
            
            if (!$title || !$link) continue;
            
            $pubDateTime = date('Y-m-d H:i:s', strtotime($pubDate));
            
            $stmt = $this->db->prepare("INSERT IGNORE INTO articles (feed_id, title, description, link, pub_date) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$feedId, $title, $description, $link, $pubDateTime]);
        }
        
        // Update last_fetched timestamp
        $stmt = $this->db->prepare("UPDATE feeds SET last_fetched = NOW() WHERE id = ?");
        $stmt->execute([$feedId]);
        
        return true;
    }
    
    private function sendResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }
}

// Handle the request
$api = new RatReaderAPI();
$api->handleRequest();
?>