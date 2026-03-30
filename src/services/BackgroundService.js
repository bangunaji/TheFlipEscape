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
  taskDesc: 'Monitoring sensors for discrete exit trigger...',
  taskIcon: {
    name: 'ic_notification',
    type: 'drawable',
  },
  color: '#6200EE',
  type: 'dataSync',
  channelId: 'the_flip_escape_channel',
  channelName: 'The Flip-Escape Service',
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
      this.log('Initializing BackgroundJob...');
      this.log(`Options: ${JSON.stringify(options, null, 2)}`);
      
      await BackgroundJob.start(this.backgroundTask, options);
      
      this.isActive = true;
      this.log('BackgroundJob started successfully.');
      return true;
    } catch (e) {
      this.log(`ERROR: ${e.message}`);
      if (e.stack) {
        this.log(`Stack: ${e.stack.split('\n')[0]}...`);
      }
      
      console.error('Failed to start BackgroundJob:', e);
      return false;
    }
  }

  async stop() {
    this.log('Stopping service...');
    this.isActive = false;
    await BackgroundJob.stop();
    this.log('Service stopped.');
  }

  backgroundTask = async (taskData) => {
    // Accelerometer config
    setUpdateIntervalForType(SensorTypes.accelerometer, 500);
    this.subscription = accelerometer.subscribe(({ z }) => {
      this.handleSensorUpdate(z);
    });

    // Proximity sensor listener (Native Module)
    this.proxySubscription = DeviceEventEmitter.addListener('proximityChanged', (data) => {
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
