import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Alert,
  PermissionsAndroid,
  AppState,
  Platform,
} from 'react-native';
import BackgroundService from './src/services/BackgroundService';
import FakeCallScreen from './src/screens/FakeCallScreen';

const App = () => {
  const [isActive, setIsActive] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (!hasPermission) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
          }
        } catch (err) {
          console.warn('Error checking/requesting notification permission:', err);
        }
      }
    };

    checkPermissions();

    // Listen for custom trigger from BackgroundService
    const subscription = BackgroundService.onTrigger(() => {
      setShowFakeCall(true);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      // Permission for Draw Over Other Apps is handled via Android Intent manually,
      // but standard permissions can be requested here.
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, // Just in case, though not specifically requested
      ]);
      console.log('Permissions:', granted);
    } catch (err) {
      console.warn(err);
    }
  };

  const toggleService = async () => {
    if (!isActive) {
      const success = await BackgroundService.start();
      if (success) {
        setIsActive(true);
      } else {
        Alert.alert('Error', 'Failed to start Background Service.');
      }
    } else {
      await BackgroundService.stop();
      setIsActive(false);
    }
  };

  if (showFakeCall) {
    return (
      <FakeCallScreen 
        onClose={() => setShowFakeCall(false)} 
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.header}>
        <Text style={styles.title}>The Flip-Escape</Text>
        <Text style={styles.subtitle}>Personal Alibi Trigger</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Service Status</Text>
          <View style={[styles.statusDot, {backgroundColor: isActive ? '#4CAF50' : '#F44336'}]} />
          <Text style={styles.statusText}>{isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isActive ? styles.buttonStop : styles.buttonStart]}
          onPress={toggleService}>
          <Text style={styles.buttonText}>
            {isActive ? 'Stop Service' : 'Start Service'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Instructions:</Text>
          <Text style={styles.infoText}>1. Press 'Start Service'</Text>
          <Text style={styles.infoText}>2. Place phone face-down for 5s (Cover proximity sensor)</Text>
          <Text style={styles.infoText}>3. Wait for 2 haptic vibrations</Text>
          <Text style={styles.infoText}>4. Fake call will appear after 45s delay</Text>
          <Text style={styles.infoText}>* Unlocking phone cancels the call.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Stay Secret. Stay Safe.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333333',
  },
  statusLabel: {
    color: '#AAAAAA',
    fontSize: 16,
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonStart: {
    backgroundColor: '#6200EE',
  },
  buttonStop: {
    backgroundColor: '#B00020',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginTop: 40,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  infoTitle: {
    color: '#BBBBBB',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: '#888888',
    fontSize: 13,
    marginBottom: 5,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#444444',
    fontSize: 12,
  },
});

export default App;
