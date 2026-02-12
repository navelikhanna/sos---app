import cv2
import numpy as np
import time
import matplotlib.pyplot as plt
from scipy.signal import find_peaks

# Initialize variables
red_values = []
timestamps = []

cap = cv2.VideoCapture(0)
start_time = time.time()

print("[INFO] Starting camera... Place your finger on the camera.")

# Read frames from webcam
while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Define region of interest
    roi = frame[100:300, 100:300]
    red_channel = roi[:, :, 2]
    avg_red = np.mean(red_channel)

    red_values.append(avg_red)
    timestamps.append(time.time() - start_time)

    # Show live feed
    cv2.rectangle(frame, (100, 100), (300, 300), (0, 0, 255), 2)
    cv2.imshow("PPG - Place finger on camera", frame)

    # Exit when 'q' is pressed or after collecting 300 samples
    if cv2.waitKey(1) & 0xFF == ord('q') or len(red_values) >= 300:
        break

cap.release()
cv2.destroyAllWindows()

# Check if enough data was collected
if len(red_values) < 10:
    print(" Not enough data collected. Please try again.")
    exit()

# Detect peaks
peaks, _ = find_peaks(red_values, distance=30)
duration = timestamps[-1] - timestamps[0]
bpm = (len(peaks) / duration) * 60

# Plot signal and detected peaks
plt.plot(timestamps, red_values, label="Red Intensity")
plt.plot([timestamps[i] for i in peaks], [red_values[i] for i in peaks], "rx", label="Detected Peaks")
plt.title("PPG Signal")
plt.xlabel("Time (s)")
plt.ylabel("Avg Red Value")
plt.grid(True)
plt.legend()
# Show BPM on graph
print(" Showing graph... (close it to continue)")

plt.text(timestamps[-1]*0.7, max(red_values)*0.9, f"HR: {int(bpm)} BPM", fontsize=12, color='red')
plt.show()  # This line pauses script until the graph is closed

# Final output after graph window is closed
print(" Graph closed... proceeding to display heart rate.")
print(f" Estimated Heart Rate: {int(bpm)} BPM")
print(" End of program reached.")


