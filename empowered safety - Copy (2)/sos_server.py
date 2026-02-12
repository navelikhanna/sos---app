from flask import Flask, request, jsonify
from flask_cors import CORS
from twilio.rest import Client

app = Flask(__name__)
CORS(app)  # Allow requests from frontend

# Twilio credentials (secure with env vars in production)
account_sid = 'AC242ad24af5153423341d1134a294c1fa'
auth_token = '8436a61f5f31e08042f8d5c4479ddcb4'
twilio_number = '+17345778469'
fallback_number = '+918390964262'

client = Client(account_sid, auth_token)

@app.route('/sos', methods=['POST'])
def send_sos():
    try:
        data = request.get_json()
        contact_number = data.get("number")

        if not contact_number:
            contact_number = fallback_number
            print(f"[⚠️ Warning] No number provided. Using fallback: {fallback_number}")

        print(f"[📥] Attempting to send SOS to: {contact_number}")
        
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        google_maps_link = f"https://maps.google.com/?q={latitude},{longitude}"

        message = client.messages.create(
            body=f"🚨 SOS Alert: I need help!\n📍 Location: {google_maps_link}",
            from_=twilio_number,
            to=contact_number
        )

        print(f"[✅] SOS message sent to {contact_number}, SID: {message.sid}")
        return jsonify({"status": "success", "sid": message.sid}), 200

    except Exception as e:
        print(f"[❌ ERROR] Failed to send SOS: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
