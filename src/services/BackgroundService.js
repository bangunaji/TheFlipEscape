import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import BackgroundJob from 'react-native-background-actions';
import { Vibration, AppState, DeviceEventEmitter } from 'react-native';

// No dummy emitter needed, using DeviceEventEmitter directly for proximity

let faceDownStartTime = 0;
let isTimerStarted = 0;
let lastProximityStatus = false;
let appStateVisible = AppState.currentState;

const options = {
  taskTitle: 'The Flip-Escape Running',
  taskDesc: 'Monitoring sensors...',
  taskIcon: {
    name: 'ic_launcher', // Menggunakan ikon bawaan aplikasi
    type: 'mipmap',      // Folder standar ikon di Android
  },
  color: '#6200EE',
  type: 'dataSync',      // Penting untuk kompatibilitas Android 14
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
    this.logger = null;
  }

  setLogger(loggerCallback) {
    this.logger = loggerCallback;
  }

  log(msg) {
    if (this.logger) {
      this.logger(msg);
    }
    console.log(`[BackgroundService] ${msg}`);
  }

  onTrigger(callback) {
    // This is a simplified listener. In a real app, use a dedicated event emitter.
    // For this demonstration, we'll use a simple static property.
    BackgroundService.triggerCallback = callback;
  }

  static triggerCallback = null;

  async start() {
    if (this.isActive) {
      this.log('Service is already active.');
      return true;
    }
    try {
      this.log('Step 1: Preparing to start BackgroundJob...');
      this.log(`Channel: ${options.channelId}, Name: ${options.channelName}`);
      this.log(`Icon: ${options.taskIcon.name}, Type: ${options.taskIcon.type}`);
      
      // Some versions of Android require explicit permission check for FOREGROUND_SERVICE_DATA_SYNC
      // although it's a normal permission.
      
      this.log('Step 2: Calling BackgroundJob.start() with 500ms safety delay...');
      
      // Delay to ensure any UI thread activities (button animations, etc) are finished
      await sleep(500);
      
      await BackgroundJob.start(this.backgroundTask, options);
      
      this.isActive = true;
      this.log('Step 3: BackgroundJob.start() completed successfully.');
      return true;
    } catch (e) {
      this.isActive = false;
      const errorMsg = `CRITICAL ERROR: ${e.message}`;
      this.log(errorMsg);
      if (e.stack) {
        this.log(`Trace: ${e.stack.split('\n')[0]}`);
      }
      
      console.error('BackgroundJob start crash:', e);
      // Re-throw to inform UI
      throw e;
    }
  }

  async stop() {
    this.log('Stopping service...');
    this.isActive = false;
    await BackgroundJob.stop();
    this.log('Service stopped.');
  }

  backgroundTask = async (taskData) => {
    try {
      this.log('Background task loop starting...');
      
      // Accelerometer config
      this.log('Subscribing to Accelerometer...');
      setUpdateIntervalForType(SensorTypes.accelerometer, 500);
      this.subscription = accelerometer.subscribe(({ z }) => {
        this.handleSensorUpdate(z);
      });

      // Proximity sensor listener (Native Module)
      this.log('Subscribing to ProximityModule...');
      this.proxySubscription = DeviceEventEmitter.addListener('proximityChanged', (data) => {
        lastProximityStatus = data.proximity;
      });

      // Update AppState listener for unlock detection
      const appStateListener = AppState.addEventListener('change', nextAppState => {
        if (appStateVisible.match(/inactive|background/) && nextAppState === 'active') {
          if (this.timerCountdown > 0) {
            this.log('Unlock detected! Cancelling countdown.');
            this.timerCountdown = 0;
            this.fakeCallTriggered = false;
          }
        }
        appStateVisible = nextAppState;
      });

      this.log('Entering main loop...');
      while (BackgroundJob.isRunning()) {
        if (this.timerCountdown > 0) {
          this.timerCountdown--;
          if (this.timerCountdown === 0) {
            this.executeFakeCall();
          }
        }
        await sleep(1000);
      }
      
      this.log('Background task loop exiting cleanup...');
      this.subscription?.unsubscribe();
      this.proxySubscription?.remove();
      appStateListener.remove();
    } catch (err) {
      this.log(`LOOP ERROR: ${err.message}`);
      console.error('Background task crash:', err);
    }
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
    
    this.log('Trigger success! 2x vibration sent. Delay 45s starts.');
  }

  executeFakeCall() {
    this.fakeCallTriggered = false;
    if (BackgroundService.triggerCallback) {
      BackgroundService.triggerCallback();
    }
  }
}

export default new BackgroundService();
