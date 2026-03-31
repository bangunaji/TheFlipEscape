import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Vibration, AppState, DeviceEventEmitter } from 'react-native';

// No dummy emitter needed, using DeviceEventEmitter directly for proximity

let faceDownStartTime = 0;
let lastProximityStatus = false;
let appStateVisible = AppState.currentState;

const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

class BackgroundService {
  constructor() {
    this.subscription = null;
    this.proxySubscription = null;
    this.fakeCallTriggered = false;
    this.timerCountdown = 0;
    this.isActive = false;
    this.logger = null;
    this.foregroundResolver = null;
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
    BackgroundService.triggerCallback = callback;
  }

  static triggerCallback = null;

  async start() {
    if (this.isActive) {
      this.log('Service is already active.');
      return true;
    }
    try {
      this.log('Step 1: Preparing Notifee Foreground Service...');
      
      // Create a channel
      const channelId = await notifee.createChannel({
        id: 'the_flip_escape',
        name: 'The Flip-Escape Service',
        vibration: false,
        importance: AndroidImportance.LOW,
      });

      this.log('Step 2: Requesting Notifee start...');
      
      this.isActive = true;
      this.fakeCallTriggered = false;
      this.timerCountdown = 0;
      
      // Delay to ensure any UI thread activities are finished
      await sleep(500);

      await notifee.displayNotification({
        title: 'The Flip-Escape Running',
        body: 'Monitoring sensors for discrete exit trigger...',
        android: {
          channelId,
          asForegroundService: true,
          color: '#6200EE',
          smallIcon: 'ic_notification', 
          ongoing: true,
          foregroundServiceTypes: ['dataSync'] // Wajib untuk Android 14
        },
      });
      
      this.log('Step 3: Notifee Foreground started successfully.');
      return true;
    } catch (e) {
      this.isActive = false;
      const errorMsg = `CRITICAL ERROR: ${e.message}`;
      this.log(errorMsg);
      if (e.stack) {
        this.log(`Trace: ${e.stack.split('\n')[0]}`);
      }
      
      console.error('Notifee start crash:', e);
      throw e;
    }
  }

  async stop() {
    this.log('Stopping service...');
    this.isActive = false;
    if (this.foregroundResolver) {
      this.foregroundResolver();
      this.foregroundResolver = null;
    }
    await notifee.stopForegroundService();
    this.log('Service stopped.');
  }

  backgroundTask = async () => {
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
      while (this.isActive) {
        if (this.timerCountdown > 0) {
          this.timerCountdown--;
          if (this.timerCountdown === 0) {
            this.executeFakeCall();
          }
        }
        await sleep(1000);
      }
      
      this.log('Background task loop exiting cleanup...');
      if (this.subscription) this.subscription.unsubscribe();
      if (this.proxySubscription) this.proxySubscription.remove();
      appStateListener.remove();
    } catch (err) {
      this.log(`LOOP ERROR: ${err.message}`);
      console.error('Background task crash:', err);
    }
  };

  handleSensorUpdate(z) {
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

const backgroundServiceInstance = new BackgroundService();

// Register the Notifee Foreground Service globally
notifee.registerForegroundService((notification) => {
  return new Promise((resolve) => {
    backgroundServiceInstance.foregroundResolver = resolve;
    backgroundServiceInstance.backgroundTask();
  });
});

export default backgroundServiceInstance;
