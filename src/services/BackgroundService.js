import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import BackgroundJob from 'react-native-background-actions';
import { Vibration, AppState, NativeEventEmitter, NativeModules } from 'react-native';
import Proximity from 'react-native-proximity';

// Dummy event emitter for simple communication with App UI
const serviceEvents = new NativeEventEmitter(NativeModules.ServiceEvents);

let faceDownStartTime = 0;
let isTimerStarted = 0;
let lastProximityStatus = false;
let appStateVisible = AppState.currentState;

const options = {
  taskName: 'TheFlipEscapeBackground',
  taskTitle: 'The Flip-Escape Running',
  taskDesc: 'Monitoring sensors for discrete exit trigger...',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#6200EE',
  parameters: {
    delay: 1000,
  },
};

const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

class BackgroundService {
  constructor() {
    this.subscription = null;
    this.proxySubscription = null;
    this.fakeCallTriggered = false;
    this.timerCountdown = 0;
    this.isActive = false;
  }

  onTrigger(callback) {
    // This is a simplified listener. In a real app, use a dedicated event emitter.
    // For this demonstration, we'll use a simple static property.
    BackgroundService.triggerCallback = callback;
  }

  static triggerCallback = null;

  async start() {
    if (this.isActive) return true;
    try {
      await BackgroundJob.start(this.backgroundTask, options);
      this.isActive = true;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async stop() {
    this.isActive = false;
    await BackgroundJob.stop();
  }

  backgroundTask = async (taskData) => {
    // Accelerometer config
    setUpdateIntervalForType(SensorTypes.accelerometer, 500);
    this.subscription = accelerometer.subscribe(({ z }) => {
      this.handleSensorUpdate(z);
    });

    // Proximity sensor listener
    this.proxySubscription = Proximity.addListener((data) => {
      lastProximityStatus = data.proximity;
    });

    // Update AppState listener for unlock detection
    const appStateListener = AppState.addEventListener('change', nextAppState => {
      if (appStateVisible.match(/inactive|background/) && nextAppState === 'active') {
        // App became active (phone likely unlocked)
        if (this.timerCountdown > 0) {
          console.log('Unlock detected! Cancelling fake call countdown.');
          this.timerCountdown = 0;
          this.fakeCallTriggered = false;
        }
      }
      appStateVisible = nextAppState;
    });

    while (BackgroundJob.isRunning()) {
      if (this.timerCountdown > 0) {
        this.timerCountdown--;
        if (this.timerCountdown === 0) {
          this.executeFakeCall();
        }
      }
      await sleep(1000);
    }

    // Cleanup when stopped
    this.subscription?.unsubscribe();
    this.proxySubscription?.remove();
    appStateListener.remove();
  };

  handleSensorUpdate(z) {
    // Check if Face Down (Z axis negative) and Proximity Sensor is NEAR
    // (Layar menghadap bawah & HP menempel di meja)
    const isFaceDown = z < -8.5 && lastProximityStatus === true;

    if (isFaceDown) {
      if (faceDownStartTime === 0) {
        faceDownStartTime = Date.now();
      } else if (Date.now() - faceDownStartTime >= 5000 && !this.fakeCallTriggered) {
        this.triggerConfirmation();
      }
    } else {
      faceDownStartTime = 0;
    }
  }

  triggerConfirmation() {
    this.fakeCallTriggered = true;
    this.timerCountdown = 45; // 45 seconds delay

    // Vibration confirmation: 2 short pulses (0.2s)
    Vibration.vibrate([0, 200, 200, 200]);
    
    console.log('Trigger success! 2x vibration sent. Delay 45s starts.');
  }

  executeFakeCall() {
    this.fakeCallTriggered = false;
    if (BackgroundService.triggerCallback) {
      BackgroundService.triggerCallback();
    }
  }
}

export default new BackgroundService();
