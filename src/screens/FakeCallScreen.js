import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import Sound from 'react-native-sound';

const {width, height} = Dimensions.get('window');

const FakeCallScreen = ({onClose}) => {
  const [isAnswered, setIsAnswered] = useState(false);
  const [ringtone, setRingtone] = useState(null);
  const [alibiSound, setAlibiSound] = useState(null);

  useEffect(() => {
    // Enable playback in silence mode
    Sound.setCategory('Playback');

    // Load Generic System Ringtone (Placeholder URI for Android)
    const ringtoneUri = 'content://settings/system/ringtone'; // Standard Android ringtone content provider
    const ring = new Sound(ringtoneUri, '', (error) => {
      if (error) {
        console.log('Failed to load ringtone', error);
        // Fallback or generic sound if needed
      } else {
        ring.setNumberOfLoops(-1); // Infinite loop
        ring.play();
      }
    });
    setRingtone(ring);

    // Load Alibi Audio (mp3 should be in android/app/src/main/res/raw/alibi.mp3 or assets folder)
    const alibi = new Sound('alibi.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load alibi.mp3', error);
      }
    });
    setAlibiSound(alibi);

    // Vibration pattern for incoming call
    Vibration.vibrate([1000, 1000, 1000, 1000], true);

    return () => {
      ring?.stop();
      ring?.release();
      alibi?.stop();
      alibi?.release();
      Vibration.cancel();
    };
  }, []);

  const handleAnswer = () => {
    setIsAnswered(true);
    ringtone?.stop();
    Vibration.cancel();

    // Route audio to Earpiece (Speaker Off)
    if (alibiSound) {
      alibiSound.setSpeakerphoneOn(false);
      alibiSound.play(() => {
        // When alibi ends, close call
        onClose();
      });
    }
  };

  const handleDecline = () => {
    ringtone?.stop();
    Vibration.cancel();
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topInfo}>
        <Text style={styles.incomingText}>Incoming Call</Text>
        <Text style={styles.callerName}>Kurir Paket</Text>
        <Text style={styles.callerLocation}>Mobile</Text>
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>K</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        {!isAnswered ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.declineBtn]} onPress={handleDecline}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>✖</Text>
              </View>
              <Text style={styles.btnLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.answerBtn]} onPress={handleAnswer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>📞</Text>
              </View>
              <Text style={styles.btnLabel}>Answer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.answeredInfo}>
            <Text style={styles.onCallText}>On Call...</Text>
            <TouchableOpacity style={styles.hangupBtn} onPress={handleDecline}>
               <Text style={styles.hangupText}>End Call</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 100,
  },
  topInfo: {
    alignItems: 'center',
  },
  incomingText: {
    color: '#BBBBBB',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '300',
  },
  callerLocation: {
    color: '#888888',
    fontSize: 16,
    marginTop: 5,
  },
  avatarContainer: {
    marginVertical: 50,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 60,
    fontWeight: 'bold',
  },
  actionContainer: {
    width: '100%',
    paddingHorizontal: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    alignItems: 'center',
  },
  iconCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
  },
  declineBtn: {
      // styles for decline icon circle
  },
  answerBtn: {
      // styles for answer icon circle
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#444444'
  },
  answerBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 35,
  },
  declineBtn: {
    backgroundColor: '#F44336',
    borderRadius: 35,
  },
  iconText: {
    fontSize: 30,
    color: '#FFFFFF',
  },
  btnLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  answeredInfo: {
    alignItems: 'center',
  },
  onCallText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  hangupBtn: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    backgroundColor: '#F44336',
    borderRadius: 25,
  },
  hangupText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default FakeCallScreen;
