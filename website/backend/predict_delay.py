import sys
import json

def predict(data):
    dist = data.get("dist", 0)
    weather = data.get("weather", 1)
    hour = data.get("hour", 12)
    
    # ML inference logic or model wrapper execution
    delay = (dist * 1.5) + (weather * 4) + (2 if (7 <= hour <= 9 or 16 <= hour <= 19) else 0)
    
    return {
        "predicted_delay_min": round(delay, 2),
        "status": "success"
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        if raw_input:
            payload = json.loads(raw_input)
            result = predict(payload)
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "No input payload provided"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))