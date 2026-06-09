import os
import json
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
import mimetypes
import traceback

# Host and Port configuration
HOST = "0.0.0.0"
PORT = 3000

# Load .env file manually to stay 100% dependency-free
if os.path.exists('.env'):
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                parts = line.split('=', 1)
                if len(parts) == 2:
                    k, v = parts[0].strip(), parts[1].strip()
                    # Strip wrapping quotes if present
                    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                        v = v[1:-1]
                    os.environ[k] = v

print("Environment configured. OPENWEATHER_API_KEY present:", bool(os.environ.get("OPENWEATHER_API_KEY")))
print("Environment configured. GEMINI_API_KEY present:", bool(os.environ.get("GEMINI_API_KEY")))

def get_openweather_key(headers, query_params):
    # Check OS environment first
    env_key = os.environ.get("OPENWEATHER_API_KEY", "")
    if env_key and len(env_key.strip()) > 0:
        return env_key.strip()
    
    # Check modern case-insensitive HTTP headers
    header_key = headers.get("x-openweather-api-key")
    if header_key and len(header_key.strip()) > 0:
        return header_key.strip()
        
    # Check query parameters fallback
    query_key = query_params.get("appid")
    if query_key:
        val = query_key[0] if isinstance(query_key, list) else query_key
        if val and len(val.strip()) > 0:
            return val.strip()
            
    return None

class PythonWeatherServerHandler(BaseHTTPRequestHandler):
    
    def log_message(self, format, *args):
        # Override to log clearly to the console
        print(f"[{self.log_date_time_string()}] {format%args}")

    def send_json(self, status_code, data):
        try:
            response_bytes = json.dumps(data).encode('utf-8')
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-openweather-api-key')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
        except Exception as e:
            print(f"Error writing JSON response: {e}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-openweather-api-key')
        self.end_headers()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        normalized_path = parsed_url.path

        if normalized_path == "/api/ai/summary":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                return self.send_json(400, {"error": "Invalid JSON format in request body."})
            
            weather_data = payload.get("weatherData")
            if not weather_data:
                return self.send_json(400, {"error": "Missing required 'weatherData' body parameter."})

            gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
            if not gemini_key:
                return self.send_json(503, {
                    "error": "Gemini API Key is not configured. AI Summaries are currently unavailable."
                })

            # Prepare custom prompt matching server.ts instructions
            prompt = f"""You are a professional weather host and meteorology expert. Analyze the following weather and forecast data, then generate a personalized meteorological insight.
      
You must respond with a JSON object holding exactly these fields:
- "summary": A brief, professional, and friendly 2-3 sentence overview of the current weather situation and general expectation.
- "apparelRecommendation": Exactly what clothing/kit is appropriate for this weather (be precise: layers, footwear, raincoat, shades etc.).
- "outdoorActivitySuitability": A crisp, informative breakdown indicating if it's ideal for running, hiking, swimming, cycling, or if people should seek indoor activities.
- "travelAdvice": A helpful tip regarding safety or journey comfort given coordinates, wind speeds, visibility, or incoming precipitations.

Weather details:
{json.dumps(weather_data, indent=2)}
"""

            # REST request parameters for Gemini Generative AI
            gemini_payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": {
                        "type": "OBJECT",
                        "properties": {
                            "summary": {
                                "type": "STRING",
                                "description": "Short friendly paragraph summarizing target forecast."
                            },
                            "apparelRecommendation": {
                                "type": "STRING",
                                "description": "Specific clothes, boots, gears, layers recommended for conditions."
                            },
                            "outdoorActivitySuitability": {
                                "type": "STRING",
                                "description": "Suitability, safety, index of outdoor events."
                            },
                            "travelAdvice": {
                                "type": "STRING",
                                "description": "Driving, commuting, transit safety constraints or tips."
                            }
                        },
                        "required": [
                            "summary",
                            "apparelRecommendation",
                            "outdoorActivitySuitability",
                            "travelAdvice"
                        ]
                    }
                }
            }

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={gemini_key}"
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "aistudio-build"
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(gemini_payload).encode('utf-8'),
                headers=headers,
                method="POST"
            )

            try:
                with urllib.request.urlopen(req) as resp:
                    resp_data = json.loads(resp.read().decode('utf-8'))
                    text = resp_data['candidates'][0]['content']['parts'][0]['text']
                    ai_parsed = json.loads(text.strip())
                    return self.send_json(200, ai_parsed)
            except urllib.error.HTTPError as error:
                try:
                    err_bytes = error.read()
                    err_text = err_bytes.decode('utf-8')
                    err_json = json.loads(err_text)
                    print("Gemini API Error Detail:", err_json)
                except Exception:
                    err_text = str(error)
                    err_json = None

                err_summary_str = f"REST Error: {err_text}"
                if "429" in err_summary_str or "RESOURCE_EXHAUSTED" in err_summary_str or "quota" in err_summary_str.lower():
                    errorMessage = "Gemini API rate limit exceeded. The free tier quota has been reached (limit: 5 requests per minute). Please wait a moment and try again."
                else:
                    errorMessage = f"Gemini model error: {err_text}"
                
                return self.send_json(500, {"error": errorMessage})
            except Exception as e:
                print("Gemini generic failure:")
                traceback.print_exc()
                return self.send_json(500, {"error": f"Failed to contact the AI model: {str(e)}"})
            
        else:
            self.send_json(404, {"error": "Not Found"})

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        normalized_path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # 1. API: Check configuration statuses
        if normalized_path == "/api/weather/config":
            has_env_key = bool(os.environ.get("OPENWEATHER_API_KEY", "").strip())
            return self.send_json(200, {
                "hasEnvKey": has_env_key
            })

        # 2. Proxy route: Geocoding
        elif normalized_path == "/api/weather/geocode":
            q = query_params.get("q")
            if not q:
                return self.send_json(400, {"error": "Missing query parameter 'q'"})
            
            q_val = q[0]
            api_key = get_openweather_key(self.headers, query_params)
            if not api_key:
                return self.send_json(401, {
                    "error": "OpenWeather API Key is missing. Add it to the secrets panel or the in-app settings."
                })

            encoded_q = urllib.parse.quote(q_val)
            url = f"https://api.openweathermap.org/geo/1.0/direct?q={encoded_q}&limit=5&appid={api_key}"
            
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "aistudio-build"})
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    return self.send_json(200, data)
            except Exception as e:
                print("Geocoding Proxy Error:", e)
                return self.send_json(500, {"error": f"Failed to fetch geocoding data: {str(e)}"})

        # 3. Proxy route: Current Weather
        elif normalized_path == "/api/weather/current":
            lat = query_params.get("lat")
            lon = query_params.get("lon")
            units = query_params.get("units", ["metric"])[0]

            if not lat or not lon:
                return self.send_json(400, {"error": "Missing 'lat' or 'lon' query parameters."})

            api_key = get_openweather_key(self.headers, query_params)
            if not api_key:
                return self.send_json(401, {"error": "OpenWeather API Key is missing."})

            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat[0]}&lon={lon[0]}&appid={api_key}&units={units}"
            
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "aistudio-build"})
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    return self.send_json(200, data)
            except Exception as e:
                print("Current Weather Proxy Error:", e)
                return self.send_json(500, {"error": f"Failed to fetch current weather: {str(e)}"})

        # 4. Proxy route: 5-Day/3-Hour Forecast
        elif normalized_path == "/api/weather/forecast":
            lat = query_params.get("lat")
            lon = query_params.get("lon")
            units = query_params.get("units", ["metric"])[0]

            if not lat or not lon:
                return self.send_json(400, {"error": "Missing 'lat' or 'lon' query parameters."})

            api_key = get_openweather_key(self.headers, query_params)
            if not api_key:
                return self.send_json(401, {"error": "OpenWeather API Key is missing."})

            url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat[0]}&lon={lon[0]}&appid={api_key}&units={units}"
            
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "aistudio-build"})
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    return self.send_json(200, data)
            except Exception as e:
                print("Forecast Proxy Error:", e)
                return self.send_json(500, {"error": f"Failed to fetch forecast trend: {str(e)}"})

        # 5. Proxy route: Air Quality Index (AQI)
        elif normalized_path == "/api/weather/airpollution":
            lat = query_params.get("lat")
            lon = query_params.get("lon")

            if not lat or not lon:
                return self.send_json(400, {"error": "Missing 'lat' or 'lon' query parameters."})

            api_key = get_openweather_key(self.headers, query_params)
            if not api_key:
                return self.send_json(401, {"error": "OpenWeather API Key is missing."})

            url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat[0]}&lon={lon[0]}&appid={api_key}"
            
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "aistudio-build"})
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    return self.send_json(200, data)
            except Exception as e:
                print("Air Quality Proxy Error:", e)
                return self.send_json(500, {"error": f"Failed to fetch air quality levels: {str(e)}"})

        # 6. Static files serving from dist/
        else:
            dist_dir = os.path.join(os.getcwd(), 'dist')
            target_path = normalized_path.lstrip('/')
            if not target_path:
                target_path = 'index.html'
                
            full_path = os.path.join(dist_dir, target_path)
            
            # Secure path traversal check
            real_dist = os.path.realpath(dist_dir)
            real_target = os.path.realpath(full_path)
            
            if not real_target.startswith(real_dist) or not os.path.isfile(real_target):
                # Fallback to SPA Router main content page
                full_path = os.path.join(dist_dir, 'index.html')
            
            try:
                # Resolve content-type headers
                content_type, _ = mimetypes.guess_type(full_path)
                if not content_type:
                    content_type = 'application/octet-stream'
                
                # Fix up any extension registration anomalies
                if full_path.endswith('.css'):
                    content_type = 'text/css'
                elif full_path.endswith('.js'):
                    content_type = 'application/javascript; charset=utf-8'
                elif full_path.endswith('.svg'):
                    content_type = 'image/svg+xml'
                    
                with open(full_path, 'rb') as f:
                    file_bytes = f.read()
                    
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(file_bytes)))
                # Cache control to keep loading extremely snappy
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(file_bytes)
            except Exception as e:
                print(f"Error serving static file {full_path}: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Internal Server Error")

def main():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, PythonWeatherServerHandler)
    print(f"Python standard weather API backend listening on address http://{HOST}:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down weather server...")
        httpd.server_close()

if __name__ == '__main__':
    main()
