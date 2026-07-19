Add-Type -AssemblyName System.Net.Http

$apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGFhanJqd2Jkc254dHZnbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2MDI3MzEsImV4cCI6MjA2MTE3ODczMX0.K4KL3Gx0OcMkrPXTB7CKLPuGdRcA_RBd0W8t9lF7Hmw'
$url = 'https://auxaajrjwbdsnxtvgmsb.supabase.co/auth/v1/signup'
$body = '{"email":"verificacao.rate.limit99@gmail.com","password":"Teste@2026x"}'

$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Add('apikey', $apikey)

$content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, 'application/json')

$response = $client.PostAsync($url, $content).Result
$statusCode = [int]$response.StatusCode
$responseBody = $response.Content.ReadAsStringAsync().Result

Write-Output "HTTP Status: $statusCode"
Write-Output "Body: $responseBody"
