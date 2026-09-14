<?php
declare(strict_types=1);

ini_set('session.use_strict_mode', '1');
$isHttps = isset($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
session_name('insol_customer_form');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $isHttps, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    } catch (Throwable $error) {
        respond(500, ['ok' => false, 'message' => 'Не удалось подготовить защищённую форму']);
    }
    $_SESSION['form_started_at'] = time();
    respond(200, ['ok' => true, 'csrf_token' => $_SESSION['csrf_token']]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['ok' => false, 'message' => 'Метод не поддерживается']);
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength <= 0 || $contentLength > 24000) {
    respond(413, ['ok' => false, 'message' => 'Некорректный размер запроса']);
}
$contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (strpos($contentType, 'multipart/form-data') !== 0 && strpos($contentType, 'application/x-www-form-urlencoded') !== 0) {
    respond(415, ['ok' => false, 'message' => 'Неподдерживаемый формат запроса']);
}
if (count($_POST) > 12) {
    respond(400, ['ok' => false, 'message' => 'Некорректный запрос']);
}

$configPath = dirname(__DIR__) . '/mail-config.php';
if (!is_file($configPath)) $configPath = __DIR__ . '/mail-config.php';
if (!is_file($configPath)) respond(500, ['ok' => false, 'message' => 'Почта формы не настроена']);
$config = require $configPath;
if (!is_array($config)) respond(500, ['ok' => false, 'message' => 'Почта формы не настроена']);

$allowedHosts = array_values(array_filter($config['allowed_hosts'] ?? [], static fn($host): bool => is_string($host) && $host !== ''));
$requestHost = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')) ?? '');
$sourceUrl = (string)($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '');
$sourceHost = strtolower((string)(parse_url($sourceUrl, PHP_URL_HOST) ?? ''));
$fetchSite = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
if ($requestHost === '' || $sourceHost === '' || !in_array($requestHost, $allowedHosts, true) || !in_array($sourceHost, $allowedHosts, true) || !hash_equals($requestHost, $sourceHost) || ($fetchSite !== '' && !in_array($fetchSite, ['same-origin', 'same-site'], true))) {
    respond(403, ['ok' => false, 'message' => 'Источник запроса не подтверждён']);
}

if (!empty($_POST['website_check'])) respond(200, ['ok' => true]);

$submittedToken = is_string($_POST['csrf_token'] ?? null) ? (string)$_POST['csrf_token'] : '';
$sessionToken = is_string($_SESSION['csrf_token'] ?? null) ? (string)$_SESSION['csrf_token'] : '';
$startedAt = (int)($_SESSION['form_started_at'] ?? 0);
$formAge = time() - $startedAt;
if ($submittedToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $submittedToken)) respond(403, ['ok' => false, 'message' => 'Сессия формы истекла. Откройте форму ещё раз']);
if ($startedAt <= 0 || $formAge < 2) respond(429, ['ok' => false, 'message' => 'Повторите отправку через несколько секунд']);
if ($formAge > 7200) respond(403, ['ok' => false, 'message' => 'Сессия формы истекла. Откройте форму ещё раз']);

function cleanField(string $key, int $limit, bool $multiline = false): string
{
    $raw = $_POST[$key] ?? '';
    if (!is_string($raw)) throw new InvalidArgumentException('Некорректное значение поля');
    $value = strip_tags(str_replace("\0", '', $raw));
    if ($multiline) {
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
        $value = trim($value);
    } else {
        $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    }
    if (mb_strlen($value, 'UTF-8') > $limit) throw new InvalidArgumentException('Одно из полей превышает допустимую длину');
    return $value;
}

try {
    $name = cleanField('name', 120);
    $email = cleanField('email', 200);
    $phone = cleanField('phone', 18);
    $company = cleanField('company', 200);
    $task = cleanField('task', 3000, true);
    $industry = cleanField('industry', 120);
    $budget = cleanField('budget', 120);
    $deadline = cleanField('deadline', 160);
    $integration = cleanField('integration', 500);
} catch (InvalidArgumentException $error) {
    respond(422, ['ok' => false, 'message' => $error->getMessage()]);
}

if ($name === '' || $email === '' || $task === '' || !isset($_POST['consent'])) respond(422, ['ok' => false, 'message' => 'Заполните обязательные поля']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) respond(422, ['ok' => false, 'message' => 'Укажите корректный e-mail']);
if ($phone !== '' && !preg_match('/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/D', $phone)) respond(422, ['ok' => false, 'message' => 'Введите телефон в формате +7 (000) 000-00-00']);

$to = (string)($config['to_email'] ?? '');
$from = (string)($config['from_email'] ?? '');
$siteName = (string)($config['site_name'] ?? 'INSOL');
if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL)) respond(500, ['ok' => false, 'message' => 'Почта формы не настроена']);

$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rateDirectory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'insol-customer-form-rate';
if (!is_dir($rateDirectory) && !@mkdir($rateDirectory, 0700, true) && !is_dir($rateDirectory)) respond(500, ['ok' => false, 'message' => 'Сервис временно недоступен']);
$rateFile = $rateDirectory . DIRECTORY_SEPARATOR . hash('sha256', $ip) . '.json';
$rateHandle = @fopen($rateFile, 'c+');
if ($rateHandle === false || !flock($rateHandle, LOCK_EX)) respond(500, ['ok' => false, 'message' => 'Сервис временно недоступен']);
$entries = json_decode((string)stream_get_contents($rateHandle), true);
$entries = is_array($entries) ? array_values(array_filter($entries, static fn($timestamp): bool => is_int($timestamp) && $timestamp > time() - 480)) : [];
if (count($entries) >= 2) {
    flock($rateHandle, LOCK_UN);
    fclose($rateHandle);
    respond(429, ['ok' => false, 'message' => 'Можно отправить не более 2 заявок за 8 минут']);
}
$entries[] = time();
rewind($rateHandle);
ftruncate($rateHandle, 0);
fwrite($rateHandle, json_encode($entries));
flock($rateHandle, LOCK_UN);
fclose($rateHandle);

function shown(string $value): string { return $value !== '' ? $value : '—'; }

$subject = 'Новый AI-проект с сайта ' . $siteName;
$textBody = implode("\n", [
    'Новая заявка на подбор AI-исполнителя', '',
    'Имя: ' . $name,
    'E-mail: ' . $email,
    'Телефон: ' . shown($phone),
    'Компания: ' . shown($company),
    'Отрасль: ' . shown($industry),
    'Бюджет: ' . shown($budget),
    'Желаемый срок: ' . shown($deadline),
    'Интеграции: ' . shown($integration), '',
    'Задача:', $task, '',
    'Согласие на обработку персональных данных: да',
    'IP: ' . $ip,
]);

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . $siteName . ' <' . $from . '>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . PHP_VERSION,
];
if (!mail($to, $encodedSubject, $textBody, implode("\r\n", $headers))) respond(500, ['ok' => false, 'message' => 'Сервер не смог отправить письмо. Попробуйте позже']);

unset($_SESSION['csrf_token'], $_SESSION['form_started_at']);
respond(200, ['ok' => true, 'message' => 'Заявка отправлена']);
