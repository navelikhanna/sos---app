require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const app = express();
app.use(express.json());
app.use(cors());
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const policeNumber = "+1123456789";
app.post("/send-sos", (req, res) => {
    const { latitude, longitude, contacts } = req.body;
    const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const message = `🚨 SOS Alert! I need help! My location: ${locationUrl}`;
    if (contacts.length === 0) {
        twilioClient.messages.create({ body: `🚔 Police Alert! Help Needed! Location: ${locationUrl}`, from: process.env.TWILIO_PHONE_NUMBER, to: policeNumber });
    } else {
        contacts.forEach(contact => {
            twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: contact.number });
        });
    }
    res.json({ message: "🚨 SOS Alert Sent!" });
});
app.post("/send-police-alert", (req, res) => {
    twilioClient.messages.create({ body: "🚔 Emergency! Help Needed!", from: process.env.TWILIO_PHONE_NUMBER, to: policeNumber });
    res.json({ message: "🚔 Police Alert Sent!" });
});
app.listen(3000, () => console.log("✅ Server running on port 3000"));
