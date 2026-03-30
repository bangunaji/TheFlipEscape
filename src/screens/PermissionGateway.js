import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';

const PermissionGateway = ({ onPermissionsGranted }) => {
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async () => {
    setIsChecking(true);
    if (Platform.OS === 'android') {
      let isNotifGranted = true;
      if (Platform.Version >= 33) {
        isNotifGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }
      
      setNotificationGranted(isNotifGranted);
      
      if (isNotifGranted) {
        onPermissionsGranted();
      }
    } else {
      // iOS or older Android where POST_NOTIFICATIONS isn't a runtime request
      onPermissionsGranted();
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Izin Notifikasi Dibutuhkan',
            message: 'Aplikasi membutuhkan izin ini agar layanan berjalan tersembunyi tanpa dihentikan sistem Android.',
            buttonNeutral: 'Nanti',
            buttonNegative: 'Batal',
            buttonPositive: 'Izinkan',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setNotificationGranted(true);
          onPermissionsGranted();
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          // If user checked "Never ask again", direct them to settings
          Linking.openSettings();
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      onPermissionsGranted();
    }
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Memeriksa Sistem...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.header}>
        <Text style={styles.title}>ACCESS DENIED</Text>
        <Text style={styles.subtitle}>Sistem Mendeteksi Izin Kurang</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Untuk mencegah sistem operasi mematikan layanan secara paksa (Force Close), Anda WAJIB memberikan izin Notifikasi secara penuh.
          </Text>
        </View>

        <View style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionName}>Izin Notifikasi</Text>
            <Text style={styles.permissionDesc}>Agar ikon penyamaran tetap aktif</Text>
          </View>
          <View style={[styles.statusBadge, notificationGranted ? styles.bgSuccess : styles.bgError]}>
            <Text style={styles.statusText}>{notificationGranted ? 'OK' : 'DENIED'}</Text>
          </View>
        </View>

        {!notificationGranted && (
          <TouchableOpacity style={styles.button} onPress={requestNotificationPermission}>
            <Text style={styles.buttonText}>Verifikasi Izin Notifikasi</Text>
          </TouchableOpacity>
        )}

      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          TIPS: Pastikan juga Anda menghapus batas hemat baterai (Battery Restriction) untuk aplikasi ini.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
  },
  header: {
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F44336', // Red for emphasis
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
  warningBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    padding: 15,
    marginBottom: 30,
    borderRadius: 5,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionDesc: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bgSuccess: {
    backgroundColor: '#4CAF50',
  },
  bgError: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#6200EE',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#666666',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PermissionGateway;
