console.log("✅ JS file loaded");

// ============================================================
// INITIALIZE - Set up event listeners when page loads
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayContacts();
    document.getElementById('addContactBtn').addEventListener('click', addContact);
    document.getElementById('startBtn').addEventListener('click', startListening);
});

// ============================================================
// EMERGENCY CONTACTS MANAGEMENT
// ============================================================

// Reads from localStorage and adds a "Remove" button
function loadAndDisplayContacts() {
    const contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [];
    const contactList = document.getElementById('contactList');
    contactList.innerHTML = ''; // Clear the list first

    if (contacts.length === 0) {
        contactList.innerHTML = '<li style="opacity: 0.6;">No contacts added yet</li>';
        return;
    }

    contacts.forEach((contact, index) => {
        let li = document.createElement("li");
        
        let contactInfo = document.createElement("span");
        contactInfo.textContent = `${contact.name}: ${contact.number}`;
        
        let removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.className = 'delete-btn';
        
        // This line connects the button to the delete function
        removeBtn.onclick = () => deleteContact(index);
        
        li.appendChild(contactInfo);
        li.appendChild(removeBtn);
        contactList.appendChild(li);
    });
}

// Deletes a contact from localStorage
function deleteContact(index) {
    let contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [];
    contacts.splice(index, 1); // Remove the contact at the specified index
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
    loadAndDisplayContacts(); // Refresh the list
}

// Saves a new contact to localStorage
function addContact() {
    const name = document.getElementById("contactName").value.trim();
    const number = document.getElementById("contactNumber").value.trim();

    if (!name || !number) {
        alert("❗ Please enter both name and number.");
        return;
    }

    // Ensure number has the + prefix if not present
    let formattedNumber = number;
    if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber;
    }

    const newContact = { name: name, number: formattedNumber };
    let contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [];
    contacts.push(newContact);
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
    loadAndDisplayContacts();
    document.getElementById("contactName").value = "";
    document.getElementById("contactNumber").value = "";
}

// ============================================================
// SOS FUNCTIONALITY
// ============================================================

function requestLocation() {
    const contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [];
    if (contacts.length === 0) {
        alert("❗ No emergency contacts found. Please add a contact first.");
        return;
    }

    if (confirm("⚠ This will send a real SOS to your contacts. Proceed?")) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            alert(`📍 Location acquired. Dispatching SOS to ${contacts.length} contact(s).`);

            contacts.forEach(contact => {
                fetch("http://127.0.0.1:5000/sos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ number: contact.number, latitude: lat, longitude: lon })
                })
                .then(response => response.json())
                .then(data => {
                    console.log(`Server Response for ${contact.name}:`, data);
                })
                .catch(error => {
                    console.error("🚫 Fetch error:", error);
                    alert("❌ Error connecting to SOS server. Is the Python script running?");
                });
            });

            alert("✅ SOS alerts have been dispatched to all emergency contacts!");

        }, error => {
            console.error("❌ Geolocation error:", error);
            alert("❌ Could not get your location.");
        });
    }
}

// ============================================================
// VOICE ACTIVATION
// ============================================================

function triggerVoiceSOS() {
    const statusElement = document.getElementById("statusMessage");
    const contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [];
    if (contacts.length === 0) {
        statusElement.innerText = "❌ No contacts found.";
        statusElement.style.display = "block";
        return;
    }
    statusElement.innerText = "Accessing location...";
    statusElement.style.display = "block";
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        statusElement.innerText = `Sending SOS to ${contacts.length} contact(s)...`;
        contacts.forEach(contact => {
            fetch("http://127.0.0.1:5000/sos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number: contact.number, latitude: lat, longitude: lon })
            }).then(() => {
                statusElement.innerText = "✅ SOS sent successfully!";
            }).catch(() => {
                statusElement.innerText = "❌ Error connecting to server.";
            });
        });
    });
}

function alertPolice() {
    alert("🚓 Alert sent to nearest police station!");
}

function startListening() {
    const statusElement = document.getElementById("statusMessage");
    const startBtn = document.getElementById("startBtn");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Sorry, your browser does not support speech recognition.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    startBtn.textContent = "🎙️ Listening...";
    startBtn.disabled = true;
    recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript.toLowerCase();
        const commands = ["help", "emergency", "stop"];
        for (const cmd of commands) {
            if (spoken.includes(cmd)) {
                // REMOVED: fetch to port 8080 - it was broken and unnecessary
                if (cmd === "help" || cmd === "emergency") {
                    if (confirm("🆘 SOS command received. Send your location to emergency contacts?")) {
                        triggerVoiceSOS();
                    } else {
                        statusElement.innerText = "SOS cancelled by user.";
                        statusElement.style.display = "block";
                    }
                } else if (cmd === "stop") {
                    statusElement.innerText = "Action cancelled.";
                    statusElement.style.display = "block";
                }
                return;
            }
        }
    };
    recognition.onerror = (event) => {
        statusElement.innerText = `Error: ${event.error}`;
        statusElement.style.display = "block";
    };
    recognition.onend = () => {
        startBtn.textContent = "Start Listening";
        startBtn.disabled = false;
    };
}

// ============================================================
// HEART RATE DETECTION WITH TENSORFLOW.JS FACE DETECTION
// ============================================================

let hrStream = null;
let hrAnimationFrame = null;
let hrStartTime = null;
let faceDetectionModel = null;

// PPG analysis variables
let redValues = [];
let bpmReadings = [];
const MEASUREMENT_DURATION = 20;
const FPS = 30;
const MIN_BPM = 50;
const MAX_BPM = 150;
const EMERGENCY_THRESHOLD = 130;

// Face detection variables
let faceDetected = false;
let noFaceFrameCount = 0;
const MAX_NO_FACE_FRAMES = 30;

async function startHeartRateDetection() {
    const video = document.getElementById('hrVideo');
    const canvas = document.getElementById('hrCanvas');
    const resultsDiv = document.getElementById('healthResults');
    const startBtn = document.getElementById('startHRBtn');
    const stopBtn = document.getElementById('stopHRBtn');
    
    // Reset previous session
    redValues = [];
    bpmReadings = [];
    hrStartTime = Date.now();
    faceDetected = false;
    noFaceFrameCount = 0;
    
    document.getElementById('hrStatus').innerText = "Loading face detection model...";
    
    // Load TensorFlow.js face detection model
    try {
        if (!faceDetectionModel) {
            // Load blazeface model from CDN
            faceDetectionModel = await blazeface.load();
            console.log("Face detection model loaded successfully!");
        }
    } catch (error) {
        console.error("Failed to load face detection model:", error);
        alert("❌ Failed to load face detection. Please check your internet connection and try again.");
        return;
    }
    
    // Request camera access
    try {
        hrStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        video.srcObject = hrStream;
        video.style.display = "block";
        resultsDiv.style.display = "block";
        startBtn.style.display = "none";
        stopBtn.style.display = "block";
        
        document.getElementById('heartRate').innerText = "--";
        document.getElementById('hrStatus').innerText = "Starting camera...";
        document.getElementById('sosWarning').innerText = "";
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            video.play();
            
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            document.getElementById('hrStatus').innerText = "📸 Looking for face... Please position your forehead in the frame.";
            
            // Start capturing frames
            captureFrames();
        };
    } catch (error) {
        console.error("Camera error:", error);
        alert("❌ Could not access camera. Please grant camera permissions.");
        stopHeartRateDetection();
    }
}

async function captureFrames() {
    const video = document.getElementById('hrVideo');
    const canvas = document.getElementById('hrCanvas');
    const ctx = canvas.getContext('2d');
    
    async function processFrame() {
        if (!hrStream) return;
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            // Detect faces using TensorFlow.js BlazeFace
            const predictions = await faceDetectionModel.estimateFaces(video, false);
            
            if (predictions && predictions.length > 0) {
                // Face detected!
                faceDetected = true;
                noFaceFrameCount = 0;
                
                const face = predictions[0];
                
                // Get bounding box
                const start = face.topLeft;
                const end = face.bottomRight;
                const faceWidth = end[0] - start[0];
                const faceHeight = end[1] - start[1];
                
                // Draw face box (green)
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 3;
                ctx.strokeRect(start[0], start[1], faceWidth, faceHeight);
                
                // Calculate elapsed time
                const elapsed = (Date.now() - hrStartTime) / 1000;
                
                // Check if measurement complete
                if (elapsed >= MEASUREMENT_DURATION) {
                    showFinalResult();
                    return;
                }
                
                // Extract forehead region (top 30% of face)
                const foreheadX = start[0] + faceWidth * 0.25;
                const foreheadY = start[1] + faceHeight * 0.05;
                const foreheadWidth = faceWidth * 0.5;
                const foreheadHeight = faceHeight * 0.25;
                
                // Draw forehead region (pink/magenta)
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(foreheadX, foreheadY, foreheadWidth, foreheadHeight);
                
                // Get image data from forehead region
                const imageData = ctx.getImageData(
                    Math.max(0, foreheadX),
                    Math.max(0, foreheadY),
                    Math.min(foreheadWidth, canvas.width - foreheadX),
                    Math.min(foreheadHeight, canvas.height - foreheadY)
                );
                
                // Calculate average red value
                let redSum = 0;
                let pixelCount = 0;
                for (let i = 0; i < imageData.data.length; i += 4) {
                    redSum += imageData.data[i]; // Red channel
                    pixelCount++;
                }
                const avgRed = redSum / pixelCount;
                
                // Store red value
                redValues.push({
                    value: avgRed,
                    timestamp: Date.now()
                });
                
                // Update progress
                const progress = Math.floor((elapsed / MEASUREMENT_DURATION) * 100);
                const secondsLeft = Math.ceil(MEASUREMENT_DURATION - elapsed);
                
                if (elapsed < 2) {
                    document.getElementById('hrStatus').innerText = "✓ Face detected! Calibrating... hold still";
                } else {
                    document.getElementById('hrStatus').innerText = 
                        `✓ Measuring... ${progress}% (${secondsLeft}s remaining)`;
                    
                    // Calculate intermediate BPM every 3 seconds
                    if (elapsed > 3 && redValues.length >= 90 && Math.floor(elapsed) % 3 === 0) {
                        const bpm = calculateHeartRate();
                        if (bpm > 0 && bpm >= MIN_BPM && bpm <= MAX_BPM) {
                            bpmReadings.push(bpm);
                            console.log(`Reading ${bpmReadings.length}: ${bpm} BPM`);
                        }
                    }
                }
                
            } else {
                // No face detected
                noFaceFrameCount++;
                
                if (noFaceFrameCount > MAX_NO_FACE_FRAMES) {
                    document.getElementById('hrStatus').innerText = 
                        "❌ Face lost! Please position your forehead in the frame.";
                    document.getElementById('heartRate').innerText = "--";
                    
                    // Reset measurement if we were measuring before
                    if (faceDetected) {
                        redValues = [];
                        bpmReadings = [];
                        hrStartTime = Date.now();
                        faceDetected = false;
                    }
                } else {
                    document.getElementById('hrStatus').innerText = 
                        `📸 Looking for face... (${noFaceFrameCount}/${MAX_NO_FACE_FRAMES})`;
                }
            }
            
        } catch (error) {
            console.error("Face detection error:", error);
            // Continue even if one frame fails
        }
        
        // Continue capturing (throttle to ~30 FPS)
        setTimeout(() => {
            hrAnimationFrame = requestAnimationFrame(processFrame);
        }, 33);
    }
    
    processFrame();
}

function calculateHeartRate() {
    if (redValues.length < 90) return 0;
    
    const signal = redValues.map(item => item.value);
    const mean = signal.reduce((a, b) => a + b) / signal.length;
    let filtered = signal.map(v => v - mean);
    
    // Moving average filter
    const windowSize = 5;
    const smoothed = [];
    for (let i = 0; i < filtered.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - windowSize); j <= Math.min(filtered.length - 1, i + windowSize); j++) {
            sum += filtered[j];
            count++;
        }
        smoothed.push(sum / count);
    }
    
    // Peak detection
    const peaks = [];
    const threshold = Math.max(...smoothed) * 0.3;
    
    for (let i = 5; i < smoothed.length - 5; i++) {
        const isPeak = 
            smoothed[i] > smoothed[i-1] && 
            smoothed[i] > smoothed[i-2] &&
            smoothed[i] > smoothed[i-3] &&
            smoothed[i] > smoothed[i+1] && 
            smoothed[i] > smoothed[i+2] &&
            smoothed[i] > smoothed[i+3] &&
            smoothed[i] > threshold;
            
        if (isPeak) {
            if (peaks.length === 0 || i - peaks[peaks.length - 1] > 15) {
                peaks.push(i);
            }
        }
    }
    
    if (peaks.length < 3) return 0;
    
    const peakIntervals = [];
    for (let i = 1; i < peaks.length; i++) {
        peakIntervals.push(peaks[i] - peaks[i-1]);
    }
    
    if (peakIntervals.length === 0) return 0;
    
    peakIntervals.sort((a, b) => a - b);
    const trimStart = Math.floor(peakIntervals.length * 0.1);
    const trimEnd = Math.ceil(peakIntervals.length * 0.9);
    const trimmedIntervals = peakIntervals.slice(trimStart, trimEnd);
    
    if (trimmedIntervals.length === 0) return 0;
    
    const avgInterval = trimmedIntervals.reduce((a, b) => a + b) / trimmedIntervals.length;
    const intervalInSeconds = avgInterval / FPS;
    let bpm = 60 / intervalInSeconds;
    
    if (bpm < MIN_BPM || bpm > MAX_BPM) {
        return 0;
    }
    
    return bpm;
}

function showFinalResult() {
    if (hrAnimationFrame) {
        cancelAnimationFrame(hrAnimationFrame);
        hrAnimationFrame = null;
    }
    
    if (!faceDetected || bpmReadings.length === 0) {
        document.getElementById('hrStatus').innerText = 
            "❌ Unable to measure. No face detected or insufficient data.";
        document.getElementById('heartRate').innerText = "--";
        document.getElementById('sosWarning').innerText = 
            "Please ensure your face is clearly visible and try again.";
        return;
    }
    
    const finalBpm = Math.round(
        bpmReadings.reduce((a, b) => a + b) / bpmReadings.length
    );
    
    document.getElementById('heartRate').innerText = finalBpm;
    document.getElementById('hrStatus').innerText = 
        `✓ Measurement complete (${bpmReadings.length} readings averaged)`;
    
    console.log(`Final BPM: ${finalBpm}`);
    console.log(`Readings:`, bpmReadings);
    
    if (finalBpm >= EMERGENCY_THRESHOLD) {
        document.getElementById('sosWarning').innerText = 
            `🚨 EMERGENCY! Heart rate ${finalBpm} BPM is dangerously high!`;
        document.getElementById('sosWarning').style.color = "#ff0000";
        
        if (confirm(`⚠️ CRITICAL: Your heart rate is ${finalBpm} BPM!\n\nSend emergency SOS?`)) {
            requestLocation();
        }
    } else if (finalBpm < 60) {
        document.getElementById('sosWarning').innerText = 
            `⚠️ Low heart rate (${finalBpm} BPM)`;
        document.getElementById('sosWarning').style.color = "#ffaa00";
    } else {
        document.getElementById('sosWarning').innerText = 
            `✓ Heart rate normal (${finalBpm} BPM)`;
        document.getElementById('sosWarning').style.color = "#00ff00";
    }
}

function stopHeartRateDetection() {
    const video = document.getElementById('hrVideo');
    const resultsDiv = document.getElementById('healthResults');
    const startBtn = document.getElementById('startHRBtn');
    const stopBtn = document.getElementById('stopHRBtn');
    
    if (hrStream) {
        hrStream.getTracks().forEach(track => track.stop());
        hrStream = null;
    }
    
    if (hrAnimationFrame) {
        cancelAnimationFrame(hrAnimationFrame);
        hrAnimationFrame = null;
    }
    
    video.srcObject = null;
    video.style.display = "none";
    resultsDiv.style.display = "none";
    startBtn.style.display = "block";
    stopBtn.style.display = "none";
    
    redValues = [];
    bpmReadings = [];
    faceDetected = false;
}